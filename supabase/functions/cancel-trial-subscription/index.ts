// Cancela a(s) assinatura(s) agendada(s) do trial no Stripe.
//
// IMPORTANTE: por causa de tentativas duplicadas de cadastro, um mesmo
// usuário (mesmo email) pode ter MAIS DE UMA subscription em trial no
// Stripe — só uma fica gravada em profiles.trial_asaas_subscription_id.
// Esta função:
//   1. Cancela a subscription gravada no profile (caminho feliz)
//   2. Adicionalmente, busca TODOS os customers no Stripe pelo email do
//      usuário e cancela qualquer subscription em trialing/active/past_due
//      restante (limpa órfãs que cobrariam o cartão indevidamente).
// Marca trial_auto_charge_cancelled=true. Mantém acesso até trial_end_at.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: unknown) => {
  console.log(`[CANCEL-TRIAL] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

async function cancelAllTrialsForEmail(stripe: Stripe, email: string): Promise<string[]> {
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
            log("Cancelled sub", { customer: c.id, sub: s.id, status: s.status });
          } catch (e) {
            log("Failed to cancel sub", { sub: s.id, error: String(e) });
          }
        }
      }
    }
  } catch (e) {
    log("Failed to list customers", { email, error: String(e) });
  }
  return cancelled;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Auth required");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !userData.user) throw new Error("Invalid auth");

    const userId = userData.user.id;
    const userEmail = userData.user.email || null;
    log("Cancel request", { userId, email: userEmail });

    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("email, trial_asaas_subscription_id, trial_auto_charge_cancelled, trial_will_charge_at, plan")
      .eq("id", userId)
      .maybeSingle();

    if (pErr || !profile) throw new Error("Profile not found");

    const subId = profile.trial_asaas_subscription_id;
    const willCharge = profile.trial_will_charge_at ? new Date(profile.trial_will_charge_at) : null;
    const isStillInTrial = willCharge && willCharge.getTime() > Date.now();

    if (!subId || !isStillInTrial) {
      throw new Error("Esta conta não está em trial. Use a opção de gerenciar assinatura.");
    }

    if (profile.trial_auto_charge_cancelled) {
      // Mesmo já marcado como cancelado, vamos varrer órfãs no Stripe — barato
      // e protege contra os casos antigos que já existem hoje.
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-11-20.acacia" });

    // 1) Cancela a subscription gravada no profile (caminho feliz)
    try {
      const cancelled = await stripe.subscriptions.cancel(subId);
      log("Stripe cancel ok (profile sub)", { id: cancelled.id, status: cancelled.status });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      log("Stripe cancel failed (continuing to sweep by email)", { error: msg });
    }

    // 2) Varre TODOS os customers no Stripe com o mesmo email e cancela
    //    qualquer subscription em trialing/active/past_due restante.
    //    Isto resolve o caso de tentativas duplicadas de signup, em que
    //    múltiplos customers/subscriptions foram criados mas só um ID
    //    ficou gravado no profile.
    const sweepEmail = profile.email || userEmail;
    let sweptIds: string[] = [];
    if (sweepEmail) {
      sweptIds = await cancelAllTrialsForEmail(stripe, sweepEmail);
      log("Sweep by email finished", { email: sweepEmail, count: sweptIds.length, ids: sweptIds });
    }

    await supabase
      .from("profiles")
      .update({
        trial_auto_charge_cancelled: true,
        trial_auto_charge_cancelled_at: new Date().toISOString(),
      })
      .eq("id", userId);

    log("Trial subscription cancelled");

    return new Response(
      JSON.stringify({
        success: true,
        primarySubId: subId,
        additionalCancelled: sweptIds.filter((id) => id !== subId),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
