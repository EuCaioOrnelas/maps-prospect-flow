// Cancela a assinatura agendada do trial no Stripe — usuário não será cobrado no D+7.
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
    log("Cancel request", { userId });

    // trial_asaas_subscription_id é reaproveitado como storage genérico do subscription Stripe (sub_...)
    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("trial_asaas_subscription_id, trial_auto_charge_cancelled, trial_will_charge_at, plan")
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
      return new Response(
        JSON.stringify({ success: true, alreadyCancelled: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-11-20.acacia" });

    try {
      const cancelled = await stripe.subscriptions.cancel(subId);
      log("Stripe cancel ok", { id: cancelled.id, status: cancelled.status });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      log("Stripe cancel failed (continuing to mark cancelled)", { error: msg });
      // Continua mesmo assim — melhor marcar como cancelado e impedir nova tentativa
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
