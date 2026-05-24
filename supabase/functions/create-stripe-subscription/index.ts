// Cria Subscription no Stripe (mensal ou anual) com cartão direto.
// Suporta order bumps (apenas no mensal — Stripe não permite misturar intervalos
// month + year na mesma subscription). Persiste extra_* em profiles após sucesso
// e grava em order_bump_events.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLAN_PRICES: Record<string, { monthly: string; annual: string; name: string }> = {
  start: {
    monthly: "price_1TYl5KK8CM0R6xMMeHUhKt7s", // R$196 (novo)
    annual: "price_1TLZkSK8CM0R6xMMwr1Ke1IX",
    name: "Wiize Atendimento",
  },
  growth: {
    monthly: "price_1TYl6iK8CM0R6xMMd23UBpIz", // R$696 (novo)
    annual: "price_1TLZn8K8CM0R6xMMaEz5JuVW",
    name: "Wiize Growth IA",
  },
};

// Catálogo dos bumps (espelho do src/config/orderBumps.ts).
const BUMP_CATALOG: Record<string, {
  priceId: string;
  column: "extra_numbers" | "extra_contacts_packs" | "extra_opportunities_packs";
  allowedPlans: string[];
}> = {
  numbers: {
    priceId: "price_1TYdiXK8CM0R6xMMqnhxGM1V",
    column: "extra_numbers",
    allowedPlans: ["start", "growth"],
  },
  contacts: {
    priceId: "price_1TYdkPK8CM0R6xMMXHTfihdw",
    column: "extra_contacts_packs",
    allowedPlans: ["start", "growth"],
  },
  opportunities: {
    priceId: "price_1TYdknK8CM0R6xMM9TXjGFf5",
    column: "extra_opportunities_packs",
    allowedPlans: ["growth"],
  },
};

interface BumpsInput {
  numbers?: number;
  contacts?: number;
  opportunities?: number;
}

type StripeDiscount = NonNullable<Stripe.SubscriptionCreateParams["discounts"]>[number];

const log = (step: string, details?: unknown) => {
  console.log(`[CREATE-STRIPE-SUB] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

function sanitizeBumps(bumps: BumpsInput | undefined, planKey: string, isAnnual: boolean): Record<string, number> {
  const out: Record<string, number> = { numbers: 0, contacts: 0, opportunities: 0 };
  if (!bumps || isAnnual) return out; // anual bloqueia bumps
  for (const id of Object.keys(out)) {
    const qty = Math.max(0, Math.min(99, Math.floor(Number((bumps as any)[id]) || 0)));
    const def = BUMP_CATALOG[id];
    if (def && def.allowedPlans.includes(planKey)) {
      out[id] = qty;
    }
  }
  return out;
}

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

    const { planKey, paymentMethodId, customerData, billingPeriod, promotionCodeId, couponId, bumps } = await req.json();
    if (!planKey || !paymentMethodId || !customerData) {
      throw new Error("planKey, paymentMethodId and customerData are required");
    }

    const isAnnual = billingPeriod === "annual";
    const planConfig = PLAN_PRICES[planKey];
    if (!planConfig) throw new Error(`Invalid plan: ${planKey}`);

    const priceId = isAnnual ? planConfig.annual : planConfig.monthly;
    const cleanBumps = sanitizeBumps(bumps, planKey, isAnnual);
    log("Request", { planKey, email: customerData.email, billingPeriod, priceId, bumps: cleanBumps });

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

    const subscriptionDiscounts: StripeDiscount[] | undefined = promotionCodeId
      ? [{ promotion_code: String(promotionCodeId) }]
      : couponId
        ? [{ coupon: String(couponId) }]
        : undefined;

    // 3. Monta items (plano + bumps). O desconto também é anexado item a item
    // para evitar que cupons restritos ao produto do plano ignorem os order bumps.
    const items: Stripe.SubscriptionCreateParams.Item[] = [
      { price: priceId, ...(subscriptionDiscounts ? { discounts: subscriptionDiscounts } : {}) },
    ];
    for (const [id, qty] of Object.entries(cleanBumps)) {
      if (qty > 0) {
        items.push({
          price: BUMP_CATALOG[id].priceId,
          quantity: qty,
          ...(subscriptionDiscounts ? { discounts: subscriptionDiscounts } : {}),
        });
      }
    }

    const subscriptionParams: Stripe.SubscriptionCreateParams = {
      customer: customerId,
      items,
      payment_behavior: "default_incomplete",
      payment_settings: {
        payment_method_types: ["card"],
        save_default_payment_method: "on_subscription",
      },
      metadata: {
        plan_key: planKey,
        billing_period: isAnnual ? "annual" : "monthly",
        user_id: userId || "",
        bumps_numbers: String(cleanBumps.numbers),
        bumps_contacts: String(cleanBumps.contacts),
        bumps_opportunities: String(cleanBumps.opportunities),
        ...(promotionCodeId ? { promotion_code_id: String(promotionCodeId) } : {}),
        ...(couponId ? { coupon_id: String(couponId) } : {}),
      },
      expand: ["latest_invoice.payment_intent"],
    };

    const subscription = await stripe.subscriptions.create(subscriptionParams);
    log("Subscription created", { id: subscription.id, status: subscription.status });

    const invoice = subscription.latest_invoice as Stripe.Invoice;
    const paymentIntent = invoice?.payment_intent as Stripe.PaymentIntent | null;

    // 4. Persiste bumps em profiles (somente se tiver userId; se não, webhook
    // de invoice.payment_succeeded vai reconciliar depois).
    if (userId) {
      const updates: Record<string, number> = {};
      for (const [id, qty] of Object.entries(cleanBumps)) {
        updates[BUMP_CATALOG[id].column] = qty;
      }
      const { error: upErr } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", userId);
      if (upErr) log("Failed to persist extra_* in profile", { error: upErr.message });

      // Auditoria
      for (const [id, qty] of Object.entries(cleanBumps)) {
        if (qty > 0) {
          await supabase.from("order_bump_events").insert({
            user_id: userId,
            bump_id: id,
            delta: qty,
            new_quantity: qty,
            source: "checkout",
            stripe_subscription_id: subscription.id,
            metadata: { plan_key: planKey, billing: "monthly" },
          });
        }
      }
    }

    // 5. Track checkout lead
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
