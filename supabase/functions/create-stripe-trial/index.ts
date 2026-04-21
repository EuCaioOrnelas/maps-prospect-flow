// Cria Subscription no Stripe com 7 dias de trial.
// Recebe payment_method_id (do Stripe Elements) + dados do cliente.
// Retorna subscriptionId. Cobrança automática mensal após 7 dias.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Mapping plan → monthly price ID (trial vira mensal automático)
const PLAN_TO_MONTHLY_PRICE: Record<string, string> = {
  start: "price_1TLZi1K8CM0R6xMMDOg3MSTp",
  growth: "price_1TLZlSK8CM0R6xMMFtvROCby",
  scale: "price_1SlylcK8CM0R6xMMyHRWAd8G",
};

const PLAN_NAMES: Record<string, string> = {
  start: "Wiize Start",
  growth: "Wiize Growth",
  scale: "Wiize Scale",
};

const log = (step: string, details?: unknown) => {
  console.log(`[CREATE-STRIPE-TRIAL] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
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

    const { planKey, paymentMethodId, customerData } = await req.json();
    if (!planKey || !paymentMethodId || !customerData) {
      throw new Error("planKey, paymentMethodId and customerData are required");
    }

    const priceId = PLAN_TO_MONTHLY_PRICE[planKey];
    const planName = PLAN_NAMES[planKey];
    if (!priceId || !planName) throw new Error(`Invalid plan: ${planKey}`);

    log("Request", { planKey, email: customerData.email });

    // 1. Create Stripe customer
    const customer = await stripe.customers.create({
      email: customerData.email,
      name: customerData.name,
      phone: customerData.phone,
      address: {
        postal_code: customerData.postalCode,
        line1: `${customerData.address}, ${customerData.addressNumber}`,
        line2: customerData.addressComplement || undefined,
        city: customerData.city,
        state: customerData.state,
        country: "BR",
      },
      metadata: {
        tax_id: customerData.taxId || "",
        plan_chosen: planKey,
      },
      payment_method: paymentMethodId,
      invoice_settings: { default_payment_method: paymentMethodId },
    });
    log("Customer created", { customerId: customer.id });

    // 2. Create Subscription with 7-day trial
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      trial_period_days: 7,
      payment_behavior: "default_incomplete",
      payment_settings: {
        payment_method_types: ["card"],
        save_default_payment_method: "on_subscription",
      },
      metadata: {
        plan_key: planKey,
        trial: "true",
        billing_period: "monthly",
      },
      expand: ["latest_invoice.payment_intent", "pending_setup_intent"],
    });

    log("Subscription created", { id: subscription.id, status: subscription.status });

    // Trial subscriptions usually return pending_setup_intent (no immediate charge)
    const setupIntent = subscription.pending_setup_intent as Stripe.SetupIntent | null;

    const trialEnd = subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Get card details for display
    let cardLast4 = "";
    let cardBrand = "CARD";
    try {
      const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
      cardLast4 = pm.card?.last4 || "";
      cardBrand = (pm.card?.brand || "card").toUpperCase();
    } catch (e) {
      log("Failed to retrieve PM details", { error: String(e) });
    }

    return new Response(
      JSON.stringify({
        success: true,
        subscriptionId: subscription.id,
        customerId: customer.id,
        clientSecret: setupIntent?.client_secret || null,
        status: subscription.status,
        nextDueDate: trialEnd,
        cardLast4,
        cardBrand,
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
