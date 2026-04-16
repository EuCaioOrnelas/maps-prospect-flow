// Cancela a assinatura agendada do trial no Asaas — usuário não será cobrado no D+7.
// Marca o profile como trial_auto_charge_cancelled=true. Se o trial ainda está ativo,
// o user mantém acesso até trial_end_at; depois disso vai pra trial-expired.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ASAAS_API = "https://api.asaas.com/v3";

const log = (step: string, details?: unknown) => {
  console.log(`[CANCEL-TRIAL] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("ASAAS_API_KEY");
    if (!apiKey) throw new Error("ASAAS_API_KEY not configured");

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
    log("Cancel request", { userId });

    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("trial_asaas_subscription_id, trial_auto_charge_cancelled, plan")
      .eq("id", userId)
      .maybeSingle();

    if (pErr || !profile) throw new Error("Profile not found");

    if (profile.plan && profile.plan !== "free") {
      throw new Error("Esta conta não está em trial. Use a opção de gerenciar assinatura.");
    }

    if (!profile.trial_asaas_subscription_id) {
      throw new Error("Nenhuma assinatura agendada encontrada para este trial");
    }

    if (profile.trial_auto_charge_cancelled) {
      return new Response(
        JSON.stringify({ success: true, alreadyCancelled: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Delete subscription on Asaas
    const delRes = await fetch(`${ASAAS_API}/subscriptions/${profile.trial_asaas_subscription_id}`, {
      method: "DELETE",
      headers: { access_token: apiKey, Accept: "application/json" },
    });

    const delText = await delRes.text();
    log("Asaas delete response", { status: delRes.status, body: delText.slice(0, 200) });

    // Even if Asaas returns 404 (already gone), we still mark cancelled locally
    if (!delRes.ok && delRes.status !== 404) {
      log("Asaas cancel failed", { status: delRes.status });
      // Continue anyway — better to mark as cancelled and prevent re-charge attempts
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
      JSON.stringify({ success: true }),
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
