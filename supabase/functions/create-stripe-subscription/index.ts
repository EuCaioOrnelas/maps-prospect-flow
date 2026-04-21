// Cria Subscription no Stripe (mensal ou anual) com cartão direto.
// Recebe payment_method_id (do Stripe Elements) + dados do cliente + billingPeriod.
// Cobra IMEDIATAMENTE e ativa renovação automática.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Plan → price IDs (monthly + annual)
const PLAN_PRICES: Record<string, { monthly: string; annual: string; name: string }> = {
  start: {
    monthly: "price_1TLZi1K8CM0R6xMMDOg3MSTp",
    annual: "price_1TLZkSK8CM0R6xMMwr1Ke1IX",
    name: "Wiize Start",
  },
  growth: {
    monthly: "price_1TLZlSK8CM0R6xMMFtvROCby",
    annual: "price_1TLZn8K8CM0R6xMMaEz5JuVW",
    name: "Wiize Growth",
  },
};

const log = (step: string, details?: unknown) => {
  console.log(`[CREATE-STRIPE-SUB] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-11-20.acacia" });
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { planKey, paymentMethodId, customerData, billingPeriod } = await req.json();
    if (!planKey || !paymentMethodId || !customerData) {
      throw new Error("planKey, paymentMethodId and customerData are required");
    }

    const isAnnual = billingPeriod === "annual";
    const planConfig = PLAN_PRICES[planKey];
    if (!planConfig) throw new Error(`Invalid plan: ${planKey}`);

    const priceId = isAnnual ? planConfig.annual : planConfig.monthly;
    log("Request", { planKey, email: customerData.email, billingPeriod, priceId });

    // 1. Resolve user_id
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabase.auth.getUser(token);
      if (data.user) userId = data.user.id;
    }
    if (!userId && customerData.email) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", customerData.email)
        .maybeSingle();
      if (prof) userId = prof.id;
    }

    // 2. Create or find Stripe customer
    let customerId: string;
    const existing = await stripe.customers.list({ email: customerData.email, limit: 1 });

    if (existing.data.length > 0) {
      customerId = existing.data[0].id;
      // Attach the new payment method
      await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
      await stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: paymentMethodId },
        name: customerData.name,
        phone: customerData.phone,
        address: {
          postal_code: customerData.postalCode,
          line1: `${customerData.address || ""}, ${customerData.addressNumber || "S/N"}`,
          city: customerData.city || "",
          state: customerData.state || "",
          country: "BR",
        },
      });
      log("Existing customer", { customerId });
    } else {
      const c = await stripe.customers.create({
        email: customerData.email,
        name: customerData.name,
        phone: customerData.phone,
        address: {
          postal_code: customerData.postalCode,
          line1: `${customerData.address || ""}, ${customerData.addressNumber || "S/N"}`,
          city: customerData.city || "",
          state: customerData.state || "",
          country: "BR",
        },
        metadata: {
          tax_id: customerData.taxId || "",
          user_id: userId || "",
        },
        payment_method: paymentMethodId,
        invoice_settings: { default_payment_method: paymentMethodId },
      });
      customerId = c.id;
      log("Customer created", { customerId });
    }

    // 3. Create Subscription that charges immediately
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: "default_incomplete",
      payment_settings: {
        payment_method_types: ["card"],
        save_default_payment_method: "on_subscription",
      },
      metadata: {
        plan_key: planKey,
        billing_period: isAnnual ? "annual" : "monthly",
        user_id: userId || "",
      },
      expand: ["latest_invoice.payment_intent"],
    });

    log("Subscription created", { id: subscription.id, status: subscription.status });

    const invoice = subscription.latest_invoice as Stripe.Invoice;
    const paymentIntent = invoice?.payment_intent as Stripe.PaymentIntent | null;

    // 4. Track checkout lead
    try {
      await supabase.from("checkout_leads").insert({
        user_id: userId || null,
        email: customerData.email,
        name: customerData.name,
        phone: customerData.phone || null,
        tax_id: customerData.taxId || null,
        postal_code: customerData.postalCode || null,
        address: customerData.address || null,
        address_number: customerData.addressNumber || null,
        neighborhood: customerData.neighborhood || null,
        plan_attempted: planConfig.name,
        stripe_session_id: `stripe_sub_${subscription.id}`,
        checkout_started_at: new Date().toISOString(),
        checkout_completed: false,
      });
    } catch (e) {
      log("Failed to track lead", { error: String(e) });
    }

    return new Response(
      JSON.stringify({
        success: true,
        subscriptionId: subscription.id,
        customerId,
        clientSecret: paymentIntent?.client_secret || null,
        status: subscription.status,
        requiresAction: paymentIntent?.status === "requires_action",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
