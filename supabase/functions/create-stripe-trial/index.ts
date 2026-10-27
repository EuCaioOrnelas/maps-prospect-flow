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
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Preços mensais do trial. Prioriza os secrets (STRIPE_PRICE_*) para permitir
// trocar o preço sem alterar código; os IDs abaixo são apenas o fallback legado.
const PLAN_TO_MONTHLY_PRICE: Record<string, string> = {
  start: Deno.env.get("STRIPE_PRICE_START_MONTHLY") || "price_1UNCkyK8CM0R6xMM8QSYPOT8",
  growth: Deno.env.get("STRIPE_PRICE_GROWTH_MONTHLY") || "price_1UNCieK8CM0R6xMMjgjVONVA",
  scale: Deno.env.get("STRIPE_PRICE_SCALE_MONTHLY") || "price_1SlylcK8CM0R6xMMyHRWAd8G",
};

// Limite de oportunidades durante o teste (mesma tabela dos planos atuais).
const TRIAL_PLAN_LIMITS: Record<string, number> = { start: 1000, growth: 1000, scale: 10000 };

const PLAN_NAMES: Record<string, string> = {
  start: "Wiize Atendimento",
  growth: "Wiize Growth IA",
  scale: "Wiize Enterprise",
};

// Confere se o preço existe e está ativo no Stripe antes de criar a assinatura.
// Sem isso, um preço arquivado/excluído derruba o cadastro com erro genérico.
async function assertPriceUsable(stripe: Stripe, priceId: string, planKey: string) {
  try {
    const price = await stripe.prices.retrieve(priceId);
    if (!price.active) throw new Error("inactive");
  } catch (e) {
    log("Price not usable", { planKey, priceId, error: String(e) });
    throw new Error(
      "PRICE_PENDING: O preço deste plano ainda não está disponível no cartão. Avise o suporte.",
    );
  }
}

const log = (step: string, details?: unknown) => {
  console.log(`[CREATE-STRIPE-TRIAL] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

// Sempre responde 200: quando há falha, o motivo vai no campo "error"/"message".
// Com status de erro HTTP a tela só recebe "Edge Function returned a non-2xx".
const json = (body: unknown, _status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });

const normEmail = (v: unknown) => String(v || "").trim().toLowerCase();

// Traduz os erros mais comuns do cartão para mensagens claras ao cliente.
function friendlyStripeError(error: unknown): string {
  const e = error as { type?: string; code?: string; decline_code?: string; message?: string };
  const code = e?.decline_code || e?.code || "";
  const map: Record<string, string> = {
    insufficient_funds: "Cartão sem limite disponível. Tente outro cartão.",
    card_declined: "O banco recusou o cartão. Tente outro cartão ou fale com seu banco.",
    generic_decline: "O banco recusou o cartão. Tente outro cartão ou fale com seu banco.",
    do_not_honor: "O banco recusou o cartão. Tente outro cartão ou fale com seu banco.",
    expired_card: "Cartão vencido. Confira a validade ou use outro cartão.",
    incorrect_cvc: "Código de segurança (CVV) incorreto.",
    invalid_cvc: "Código de segurança (CVV) inválido.",
    incorrect_number: "Número do cartão incorreto.",
    invalid_number: "Número do cartão inválido.",
    invalid_expiry_month: "Mês de validade inválido.",
    invalid_expiry_year: "Ano de validade inválido.",
    processing_error: "O banco não conseguiu processar o cartão agora. Tente novamente em instantes.",
    lost_card: "O banco recusou o cartão. Use outro cartão.",
    stolen_card: "O banco recusou o cartão. Use outro cartão.",
    fraudulent: "O banco recusou o cartão. Use outro cartão.",
    card_not_supported: "Este cartão não aceita este tipo de cobrança. Use outro cartão.",
    setup_intent_authentication_failure: "A autenticação do cartão no banco não foi concluída. Tente novamente.",
    authentication_required: "O banco pediu autenticação do cartão. Tente novamente e aprove no app do banco.",
  };
  if (map[code]) return map[code];
  if (e?.type === "StripeCardError") return "O banco recusou o cartão. Tente outro cartão.";
  return e?.message || String(error);
}

const adminClient = () =>
  createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

// Confere que a assinatura foi criada por este cadastro (mesmo SetupIntent).
async function loadOwnedSubscription(stripe: Stripe, subscriptionId: string, setupIntentId: string) {
  if (!subscriptionId || !setupIntentId) throw new Error("subscriptionId and setupIntentId are required");
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  if (sub.metadata?.setup_intent_id !== setupIntentId) throw new Error("Assinatura não pertence a este cadastro");
  return sub;
}

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
    // CANCEL — desfaz a assinatura quando a conta não pôde ser criada no app,
    // para o cliente nunca ser cobrado sem ter acesso.
    // ------------------------------------------------------------------
    if (action === "cancel") {
      const sub = await loadOwnedSubscription(stripe, body.subscriptionId, body.setupIntentId);
      if (["trialing", "active", "past_due", "incomplete"].includes(sub.status)) {
        await stripe.subscriptions.cancel(sub.id);
      }
      log("Subscription cancelled after signup failure", { id: sub.id, reason: body.reason || null });
      return json({ success: true });
    }

    // ------------------------------------------------------------------
    // COMPLETE_PROFILE — grava CPF, telefone, endereço e dados do teste na
    // ficha do cliente. Roda no servidor porque, logo após o cadastro, o
    // cliente ainda não confirmou o e-mail e não tem sessão para salvar.
    // ------------------------------------------------------------------
    if (action === "complete_profile") {
      const { userId, profile: p } = body;
      if (!userId) throw new Error("userId is required");
      const sub = await loadOwnedSubscription(stripe, body.subscriptionId, body.setupIntentId);
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      const customer = (await stripe.customers.retrieve(customerId)) as Stripe.Customer;

      const db = adminClient();
      // A ficha é criada pelo banco no cadastro; espera um instante se ainda não apareceu.
      let prof: { id: string; email: string | null; trial_start_at: string | null; terms_accepted_at: string | null } | null = null;
      for (let attempt = 0; attempt < 4 && !prof; attempt++) {
        const { data, error: profErr } = await db
          .from("profiles")
          .select("id, email, trial_start_at, terms_accepted_at")
          .eq("id", userId)
          .maybeSingle();
        if (profErr) throw new Error(profErr.message);
        prof = data as typeof prof;
        if (!prof) await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
      }
      if (!prof) throw new Error("Ficha do cliente não encontrada");
      if (normEmail(prof.email) !== normEmail(customer.email)) {
        throw new Error("E-mail da conta não confere com o do cartão");
      }

      const pmId = typeof sub.default_payment_method === "string"
        ? sub.default_payment_method
        : sub.default_payment_method?.id;
      const card = pmId ? await cardDetails(stripe, pmId) : { cardLast4: "", cardBrand: "" };
      // O fim do teste vem sempre do Stripe; sem ele, 7 dias a partir de agora.
      const trialEnd = sub.trial_end
        ? new Date(sub.trial_end * 1000).toISOString()
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const rawPlan = String(sub.metadata?.plan_key || p?.planKey || "growth");
      const planKey = rawPlan in TRIAL_PLAN_LIMITS ? rawPlan : "growth";
      const nowIso = new Date().toISOString();
      const clean = (v: unknown) => {
        const t = String(v ?? "").trim();
        return t ? t.slice(0, 200) : null;
      };

      // Grava o teste completo pelo servidor. Não depende da versão da regra de
      // cadastro do banco: plano, aceite dos termos e datas ficam sempre certos.
      const update: Record<string, unknown> = {
        plan: planKey,
        searches_limit: TRIAL_PLAN_LIMITS[planKey],
        payment_provider: "stripe",
        requires_payment_setup: false,
        trial_plan_chosen: planKey,
        trial_billing_period: "monthly",
        trial_auto_charge_cancelled: false,
        trial_asaas_subscription_id: sub.id,
        trial_asaas_customer_id: customerId,
        trial_card_last4: card.cardLast4 || null,
        trial_card_brand: card.cardBrand || null,
        trial_will_charge_at: trialEnd,
        trial_end_at: trialEnd,
        subscription_current_period_end: trialEnd,
        cpf: clean(p?.cpf)?.replace(/\D/g, "") || null,
        phone: clean(p?.phone),
        postal_code: clean(p?.postalCode),
        address: clean(p?.address),
        address_number: clean(p?.addressNumber),
        address_complement: clean(p?.addressComplement),
        neighborhood: clean(p?.neighborhood),
        city: clean(p?.city),
        state: clean(p?.state),
      };
      if (!prof.trial_start_at) update.trial_start_at = nowIso;
      // O cadastro só chega aqui com a caixa de termos marcada.
      if (!prof.terms_accepted_at) update.terms_accepted_at = nowIso;

      const { error: upErr } = await db.from("profiles").update(update).eq("id", userId);
      if (upErr) throw new Error(upErr.message);
      log("Profile completed", { userId, subscriptionId: sub.id, planKey, trialEnd });
      return json({ success: true, trialEnd });
    }

    // ------------------------------------------------------------------
    // FINALIZE — cria a subscription só depois do 3DS autenticado.
    // ------------------------------------------------------------------
    if (action === "finalize") {
      const { setupIntentId, planKey } = body;
      const email = normEmail(body.email);
      if (!setupIntentId || !planKey) throw new Error("setupIntentId and planKey are required");

      const priceId = PLAN_TO_MONTHLY_PRICE[planKey];
      if (!priceId) {
        return json(
          { error: "PRICE_PENDING", message: "O novo preço deste plano ainda não está disponível no cartão." },
          503,
        );
      }
      await assertPriceUsable(stripe, priceId, planKey);

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
        const customerEmail = email || normEmail((await stripe.customers.retrieve(customerId) as Stripe.Customer).email);
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

    customerData.email = normEmail(customerData.email);
    if (!customerData.email) throw new Error("Informe um e-mail válido.");
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
    const raw = error instanceof Error ? error.message : String(error);
    const msg = friendlyStripeError(error);
    log("ERROR", { message: raw });
    return json({ error: msg, detail: raw });
  }
});
