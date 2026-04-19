// FERRAMENTA DE TESTE: simula o webhook PAYMENT_CONFIRMED que a Asaas envia em D+7
// quando cobra automaticamente a subscription criada por create-trial-with-card.
//
// Como usar:
// POST /functions/v1/simulate-trial-charge
// body: { "userId": "<uuid do usuário>" }
//
// O que faz:
// 1. Lê trial_asaas_subscription_id, trial_plan_chosen, etc. do profile
// 2. Monta payload idêntico ao webhook real PAYMENT_CONFIRMED da Asaas
// 3. Invoca a edge function asaas-webhook
// 4. Retorna o resultado e o estado novo do profile (plan, period_end, etc.)
//
// Isso valida 100% que o fluxo D+7 vai funcionar com cartão real.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLAN_VALUES: Record<string, number> = {
  start: 296.0,
  growth: 696.0,
  scale: 1496.0,
};
const PLAN_NAMES: Record<string, string> = {
  start: "Wiize Start",
  growth: "Wiize Growth",
  scale: "Wiize Scale",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { userId, email } = await req.json();
    if (!userId && !email) throw new Error("userId or email is required");

    // 1) Carregar profile
    const query = supabase
      .from("profiles")
      .select(
        "id, email, plan, searches_limit, searches_used, subscription_current_period_end, trial_asaas_subscription_id, trial_asaas_customer_id, trial_plan_chosen, trial_billing_period",
      );
    const { data: profile, error: pErr } = userId
      ? await query.eq("id", userId).maybeSingle()
      : await query.eq("email", email).maybeSingle();

    if (pErr || !profile) throw new Error(`Profile não encontrado: ${pErr?.message || "no row"}`);
    if (!profile.trial_asaas_subscription_id) {
      throw new Error("Este profile não tem trial_asaas_subscription_id (não foi criado via /signup-with-card)");
    }

    const planKey = profile.trial_plan_chosen || "start";
    const value = PLAN_VALUES[planKey] || 296;
    const planName = PLAN_NAMES[planKey] || "Wiize Start";

    // 2) Estado ANTES
    const before = {
      plan: profile.plan,
      searches_limit: profile.searches_limit,
      searches_used: profile.searches_used,
      subscription_current_period_end: profile.subscription_current_period_end,
    };

    // 3) Montar payload IDÊNTICO ao webhook real PAYMENT_CONFIRMED
    const fakePaymentId = `pay_simulated_${Date.now()}`;
    const webhookPayload = {
      event: "PAYMENT_CONFIRMED",
      payment: {
        id: fakePaymentId,
        customer: profile.trial_asaas_customer_id,
        subscription: profile.trial_asaas_subscription_id,
        externalReference: profile.id, // chave para o webhook achar o profile
        value,
        netValue: value,
        billingType: "CREDIT_CARD",
        status: "CONFIRMED",
        description: `${planName} Mensal (após trial 7 dias)`,
        confirmedDate: new Date().toISOString().split("T")[0],
        paymentDate: new Date().toISOString().split("T")[0],
      },
    };

    // 4) Invocar webhook (via fetch direto, com token válido)
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const webhookToken = Deno.env.get("ASAAS_WEBHOOK_TOKEN");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (webhookToken) headers["asaas-access-token"] = webhookToken;

    const webhookRes = await fetch(`${supabaseUrl}/functions/v1/asaas-webhook`, {
      method: "POST",
      headers,
      body: JSON.stringify(webhookPayload),
    });
    const webhookResult = await webhookRes.json();

    // 5) Estado DEPOIS
    const { data: profileAfter } = await supabase
      .from("profiles")
      .select("plan, searches_limit, searches_used, subscription_current_period_end, payment_provider, billing_period, asaas_subscription_id")
      .eq("id", profile.id)
      .maybeSingle();

    const success =
      profileAfter?.plan === planKey &&
      profileAfter?.subscription_current_period_end !== before.subscription_current_period_end;

    return new Response(
      JSON.stringify(
        {
          simulated: true,
          userId: profile.id,
          email: profile.email,
          planKey,
          value,
          webhook_payload_sent: webhookPayload,
          webhook_response: { status: webhookRes.status, body: webhookResult },
          profile_before: before,
          profile_after: profileAfter,
          test_passed: success,
          verdict: success
            ? "✅ SUCESSO — em D+7 a cobrança real vai ativar o plano corretamente."
            : "❌ FALHA — webhook não ativou o plano. Veja webhook_response e profile_after.",
        },
        null,
        2,
      ),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
