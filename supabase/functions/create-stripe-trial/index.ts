// Trial de 7 dias no Stripe com suporte completo a 3D Secure (3DS).
//
// FLUXO EM 2 ETAPAS (necessário porque a cobrança só acontece no 8º dia):
//   action = "setup"    -> cria/reaproveita o customer, anexa o cartão e cria um
//                          SetupIntent (usage: off_session, request_three_d_secure:
//                          "any") já confirmado. Se o banco pedir o desafio 3DS, o
//                          SetupIntent volta com status "requires_action" e o
//                          front-end roda o challenge com stripe.handleNextAction().
//   action = "finalize" -> valida no servidor que o SetupIntent está "succeeded"
//                          (ou seja, o cartão foi autenticado pelo banco) e só então
//                          cria a subscription com trial de 7 dias usando o cartão
//                          autenticado como default_payment_method.
//
// Por que isso resolve a fraude/chargeback: a autenticação 3DS feita no SetupIntent
// com usage=off_session gera um mandato autenticado. A cobrança automática do 8º dia
// herda essa autenticação (liability shift), sem precisar do usuário na tela.
//
// RETOMADA: o front-end guarda { customerId, setupIntentId } no localStorage. Se o
// usuário sair para o app do banco e voltar, ele chama action="status" para saber se
// o SetupIntent foi autenticado e continua exatamente de onde parou. Tudo é idempotente.
//
// IDEMPOTÊNCIA: antes de criar a subscription, cancela qualquer subscription órfã
// (trialing/active/past_due) do mesmo email, evitando cobranças duplicadas.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLAN_TO_MONTHLY_PRICE: Record<string, string> = {
  start: "price_1TYl5KK8CM0R6xMMeHUhKt7s", // R$196 (novo)
  growth: "price_1TYl6iK8CM0R6xMMd23UBpIz", // R$696 (novo)
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

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });

// Cancela QUALQUER subscription em trialing/active/past_due de qualquer customer
// com este email no Stripe (exceto a informada em keepId).
async function cancelOrphanTrialsForEmail(
  stripe: Stripe,
  email: string,
  keepId?: string,
): Promise<string[]> {
  const cancelled: string[] = [];
  try {
    const customers = await stripe.customers.list({ email, limit: 100 });
    for (const c of customers.data) {
      const subs = await stripe.subscriptions.list({ customer: c.id, status: "all", limit: 100 });
      for (const s of subs.data) {
        if (keepId && s.id === keepId) continue;
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

async function cardDetails(stripe: Stripe, paymentMethodId: string) {
  try {
    const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
    return {
      cardLast4: pm.card?.last4 || "",
      cardBrand: (pm.card?.brand || "card").toUpperCase(),
    };
  } catch (e) {
    log("Failed to retrieve PM details", { error: String(e) });
    return { cardLast4: "", cardBrand: "CARD" };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-11-20.acacia" });

    const body = await req.json();
    const action: string = body.action || "setup";

    // ------------------------------------------------------------------
    // STATUS — usado quando o usuário volta do app do banco / recarrega a
    // página. Diz se o cartão já está autenticado e pode seguir.
    // ------------------------------------------------------------------
    if (action === "status") {
      const { setupIntentId } = body;
      if (!setupIntentId) throw new Error("setupIntentId is required");
      const si = await stripe.setupIntents.retrieve(setupIntentId);
      log("Status check", { id: si.id, status: si.status });
      return json({
        success: true,
        setupIntentId: si.id,
        status: si.status,
        requiresAction: si.status === "requires_action" || si.status === "requires_confirmation",
        authenticated: si.status === "succeeded",
        clientSecret: si.client_secret,
        customerId: typeof si.customer === "string" ? si.customer : si.customer?.id || null,
      });
    }

    // ------------------------------------------------------------------
    // FINALIZE — cria a subscription só depois do 3DS autenticado.
    // ------------------------------------------------------------------
    if (action === "finalize") {
      const { setupIntentId, planKey, email } = body;
      if (!setupIntentId || !planKey) throw new Error("setupIntentId and planKey are required");

      const priceId = PLAN_TO_MONTHLY_PRICE[planKey];
      if (!priceId) throw new Error(`Invalid plan: ${planKey}`);

      const si = await stripe.setupIntents.retrieve(setupIntentId);
      if (si.status !== "succeeded") {
        log("Finalize blocked — setup intent not authenticated", { id: si.id, status: si.status });
        return json(
          {
            error: "AUTHENTICATION_REQUIRED",
            message: "A autenticação do cartão (3D Secure) ainda não foi concluída pelo banco.",
            status: si.status,
            clientSecret: si.client_secret,
            requiresAction: si.status === "requires_action",
          },
          409,
        );
      }

      const customerId = typeof si.customer === "string" ? si.customer : si.customer?.id;
      const paymentMethodId =
        typeof si.payment_method === "string" ? si.payment_method : si.payment_method?.id;
      if (!customerId || !paymentMethodId) throw new Error("SetupIntent sem customer/payment method");

      // Reaproveita subscription já criada para este SetupIntent (retomada / clique duplo).
      const existing = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 20 });
      const already = existing.data.find(
        (s) =>
          s.metadata?.setup_intent_id === setupIntentId &&
          (s.status === "trialing" || s.status === "active"),
      );

      let subscription = already;
      if (!subscription) {
        const customerEmail = email || (await stripe.customers.retrieve(customerId) as Stripe.Customer).email;
        if (customerEmail) await cancelOrphanTrialsForEmail(stripe, customerEmail);

        await stripe.customers.update(customerId, {
          invoice_settings: { default_payment_method: paymentMethodId },
        });

        subscription = await stripe.subscriptions.create({
          customer: customerId,
          items: [{ price: priceId }],
          trial_period_days: 7,
          default_payment_method: paymentMethodId,
          // Cartão já autenticado com 3DS: a cobrança do 8º dia roda off-session
          // aproveitando o mandato. Se o banco ainda assim pedir desafio, a fatura
          // fica em "requires_action" e o Stripe notifica o cliente.
          off_session: true,
          payment_behavior: "allow_incomplete",
          payment_settings: {
            payment_method_types: ["card"],
            save_default_payment_method: "on_subscription",
          },
          trial_settings: {
            end_behavior: { missing_payment_method: "cancel" },
          },
          metadata: {
            plan_key: planKey,
            trial: "true",
            billing_period: "monthly",
            setup_intent_id: setupIntentId,
            three_ds_authenticated: "true",
          },
        });
        log("Subscription created after 3DS", { id: subscription.id, status: subscription.status });

        // Sweep pós-criação (race condition de 2 abas).
        if (customerEmail) await cancelOrphanTrialsForEmail(stripe, customerEmail, subscription.id);
      } else {
        log("Reusing existing subscription for setup intent", { id: subscription.id });
      }

      const trialEnd = subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const { cardLast4, cardBrand } = await cardDetails(stripe, paymentMethodId);

      return json({
        success: true,
        subscriptionId: subscription.id,
        customerId,
        status: subscription.status,
        nextDueDate: trialEnd,
        cardLast4,
        cardBrand,
        threeDSecure: true,
      });
    }

    // ------------------------------------------------------------------
    // SETUP (default) — customer + cartão + SetupIntent com 3DS.
    // ------------------------------------------------------------------
    const { planKey, paymentMethodId, customerData } = body;
    if (!planKey || !paymentMethodId || !customerData) {
      throw new Error("planKey, paymentMethodId and customerData are required");
    }
    if (!PLAN_TO_MONTHLY_PRICE[planKey]) throw new Error(`Invalid plan: ${planKey}`);

    log("Setup request", { planKey, email: customerData.email });

    // Reaproveita o customer do mesmo email (evita duplicar no Stripe em retomadas).
    let customer: Stripe.Customer | null = null;
    if (customerData.email) {
      const found = await stripe.customers.list({ email: customerData.email, limit: 1 });
      customer = found.data[0] || null;
    }

    const customerPayload = {
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
    };

    customer = customer
      ? await stripe.customers.update(customer.id, customerPayload)
      : await stripe.customers.create(customerPayload);
    log("Customer ready", { customerId: customer.id });

    // Anexa o cartão ao customer (ignora se já estiver anexado).
    try {
      await stripe.paymentMethods.attach(paymentMethodId, { customer: customer.id });
    } catch (e) {
      const msg = String(e);
      if (!msg.includes("already been attached")) throw e;
    }

    // SetupIntent confirmado na hora, pedindo 3DS ao banco.
    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      payment_method: paymentMethodId,
      payment_method_types: ["card"],
      usage: "off_session", // mandato para a cobrança automática do 8º dia
      confirm: true,
      // Força o desafio sempre que o emissor suportar — é isso que dá o
      // liability shift e derruba as contestações de fraude.
      payment_method_options: {
        card: { request_three_d_secure: "any" },
      },
      metadata: {
        plan_key: planKey,
        trial: "true",
        email: customerData.email || "",
      },
    });

    log("SetupIntent created", { id: setupIntent.id, status: setupIntent.status });

    return json({
      success: true,
      customerId: customer.id,
      setupIntentId: setupIntent.id,
      clientSecret: setupIntent.client_secret,
      status: setupIntent.status,
      requiresAction: setupIntent.status === "requires_action",
      authenticated: setupIntent.status === "succeeded",
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("ERROR", { message: msg });
    return json({ error: msg }, 400);
  }
});
