// Cria Subscription no Stripe com 7 dias de trial.
// Recebe payment_method_id (do Stripe Elements) + dados do cliente.
// Retorna subscriptionId. Cobrança automática mensal após 7 dias.
//
// IDEMPOTÊNCIA: antes de criar, busca todos os customers no Stripe pelo
// email e cancela qualquer subscription em trial/ativa órfã (de tentativas
// anteriores que falharam ou foram repetidas). Isso evita cobrança duplicada
// quando o usuário tenta o cadastro mais de uma vez.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

// Cancela QUALQUER subscription em trialing/active de qualquer customer com
// este email no Stripe. Usado tanto no create (para limpar órfãs antes de
// criar a nova) quanto no cancel-trial-subscription.
async function cancelAllOrphanTrialsForEmail(stripe: Stripe, email: string): Promise<string[]> {
  const cancelled: string[] = [];
  try {
    const customers = await stripe.customers.list({ email, limit: 100 });
    for (const c of customers.data) {
      const subs = await stripe.subscriptions.list({ customer: c.id, status: "all", limit: 100 });
      for (const s of subs.data) {
        if (s.status === "trialing" || s.status === "active" || s.status === "past_due") {
          try {
            await stripe.subscriptions.cancel(s.id);
            cancelled.push(s.id);
            log("Cancelled orphan sub", { customer: c.id, sub: s.id, status: s.status });
          } catch (e) {
            log("Failed to cancel orphan sub", { sub: s.id, error: String(e) });
          }
        }
      }
    }
  } catch (e) {
    log("Failed to sweep customers by email", { email, error: String(e) });
  }
  return cancelled;
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

    const { planKey, paymentMethodId, customerData } = await req.json();
    if (!planKey || !paymentMethodId || !customerData) {
      throw new Error("planKey, paymentMethodId and customerData are required");
    }

    const priceId = PLAN_TO_MONTHLY_PRICE[planKey];
    const planName = PLAN_NAMES[planKey];
    if (!priceId || !planName) throw new Error(`Invalid plan: ${planKey}`);

    log("Request", { planKey, email: customerData.email });

    // 0. IDEMPOTÊNCIA — limpa qualquer subscription órfã do mesmo email
    // antes de criar a nova (evita 2-3 trials simultâneas se o usuário
    // refizer o cadastro).
    if (customerData.email) {
      const cleaned = await cancelAllOrphanTrialsForEmail(stripe, customerData.email);
      if (cleaned.length > 0) {
        log("Cleaned orphan trials before creating new one", { count: cleaned.length, ids: cleaned });
      }
    }

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

    // 3. PÓS-CRIAÇÃO SWEEP — cobre race condition (2 abas paralelas):
    // se entre o sweep inicial e este momento alguma OUTRA subscription
    // foi criada para este email (em outro customer), cancela todas
    // exceto a que acabamos de criar.
    if (customerData.email) {
      try {
        const customers = await stripe.customers.list({ email: customerData.email, limit: 100 });
        for (const c of customers.data) {
          const subs = await stripe.subscriptions.list({ customer: c.id, status: "all", limit: 100 });
          for (const s of subs.data) {
            if (s.id === subscription.id) continue;
            if (s.status === "trialing" || s.status === "active" || s.status === "past_due") {
              try {
                await stripe.subscriptions.cancel(s.id);
                log("Post-create sweep cancelled racing sub", { sub: s.id, customer: c.id });
              } catch (e) {
                log("Post-create sweep failed", { sub: s.id, error: String(e) });
              }
            }
          }
        }
      } catch (e) {
        log("Post-create sweep error (non-fatal)", { error: String(e) });
      }
    }

    const setupIntent = subscription.pending_setup_intent as Stripe.SetupIntent | null;

    const trialEnd = subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

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
