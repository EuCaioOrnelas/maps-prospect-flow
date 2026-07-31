import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ACTIVATION_CUTOFF = new Date("2026-06-01T00:00:00Z").getTime();

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const publicKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "";
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");

    const userClient = createClient(url, publicKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: userData } = await userClient.auth.getUser();
    const { data: isAdmin } = await userClient.rpc("is_current_user_admin");
    if (!userData.user || isAdmin !== true) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const [profilesRes, onboardingRes] = await Promise.all([
      admin.from("profiles").select("id, created_at, updated_at, plan, payment_provider, searches_used, trial_messages_sent, trial_leads_used, trial_flows_used, trial_campaigns_used, trial_start_at, trial_end_at, trial_will_charge_at, trial_card_last4, trial_card_token, trial_asaas_subscription_id, trial_asaas_customer_id, trial_plan_chosen, trial_billing_period, subscription_price_cents, subscription_current_period_end"),
      admin.from("user_onboarding").select("user_id, skipped, completed_at, created_at, role"),
    ]);
    if (profilesRes.error) throw profilesRes.error;
    if (onboardingRes.error) throw onboardingRes.error;

    const eligibleIds = new Set<string>();
    for (const row of onboardingRes.data || []) {
      if (row.role === "Usuário ativo") continue;
      if (!row.completed_at && !row.skipped) continue;
      const reference = new Date(row.completed_at || row.created_at).getTime();
      if (Number.isFinite(reference) && reference >= ACTIVATION_CUTOFF) eligibleIds.add(row.user_id);
    }

    // A coorte contém somente trials reais criados desde 01/06: o usuário
    // passou pelo novo onboarding e cadastrou um meio de pagamento/agendou cobrança.
    const profiles = (profilesRes.data || []).filter((profile: any) =>
      eligibleIds.has(profile.id) &&
      new Date(profile.created_at).getTime() >= ACTIVATION_CUTOFF &&
      !!profile.trial_start_at &&
      // Mesma regra do card "Conversão de Trial": aceita qualquer marcador do
      // trial, porque a conversão limpa `trial_will_charge_at`.
      !!(profile.trial_card_last4 || profile.trial_card_token || profile.trial_asaas_subscription_id ||
         profile.trial_asaas_customer_id || profile.trial_will_charge_at || profile.trial_end_at ||
         profile.trial_plan_chosen || profile.trial_billing_period)
    );
    const cohortIds = new Set(profiles.map((profile: any) => profile.id));
    const activatedIds = new Set<string>();
    const activitySources = [
      ["leads", ["user_id", "owner_user_id", "created_by_user_id"]],
      ["lead_deals", ["user_id", "owner_user_id"]],
      ["search_history", ["user_id", "owner_user_id"]],
      ["warming_search_assignments", ["user_id", "owner_user_id"]],
      ["whatsapp_campaigns", ["user_id", "owner_user_id"]],
      ["meta_campaigns", ["user_id", "owner_user_id"]],
      ["chat_conversations", ["user_id", "owner_user_id"]],
      ["wa_automation_flows", ["user_id", "owner_user_id"]],
      ["ai_agents", ["user_id", "owner_user_id"]],
      ["user_waba_connections", ["user_id", "owner_user_id"]],
    ] as const;

    await Promise.all(activitySources.map(async ([table, columns]) => {
      const { data } = await admin.from(table).select(columns.join(","));
      for (const row of data || []) {
        for (const column of columns) {
          const value = (row as Record<string, unknown>)[column];
          if (typeof value === "string" && cohortIds.has(value)) activatedIds.add(value);
        }
      }
    }));

    const activatedProfiles = profiles.filter((profile: any) => {
      const profileUsage =
        (profile.searches_used || 0) > 0 ||
        (profile.trial_messages_sent || 0) > 0 ||
        (profile.trial_leads_used || 0) > 0 ||
        (profile.trial_flows_used || 0) > 0 ||
        (profile.trial_campaigns_used || 0) > 0;
      return profileUsage || activatedIds.has(profile.id);
    });

    // Coerência com "Conversão de Trial": aquela métrica só considera trials
    // JÁ ENCERRADOS, então expomos aqui quantos ainda estão em andamento.
    const stillInTrial = (profile: any) => {
      const now = Date.now();
      const end = profile.trial_will_charge_at ? new Date(profile.trial_will_charge_at).getTime() : null;
      return !!end && end > now;
    };
    const inTrial = profiles.filter(stillInTrial).length;

    const accessed = profiles.filter((profile: any) =>
      new Date(profile.updated_at).getTime() - new Date(profile.created_at).getTime() > 60_000
    ).length;
    const isPaid = (profile: any) => profile.plan && profile.plan !== "free";

    return new Response(JSON.stringify({
      total: profiles.length,
      inTrial,
      completedTrial: profiles.length - inTrial,
      accessed,
      activated: activatedProfiles.length,
      activatedStripe: activatedProfiles.filter((p: any) => isPaid(p) && p.payment_provider === "stripe").length,
      activatedAsaas: activatedProfiles.filter((p: any) => isPaid(p) && ["asaas", "abacate_pay"].includes(p.payment_provider)).length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      status: message === "Unauthorized" ? 401 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});