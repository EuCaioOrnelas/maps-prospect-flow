import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ABACATE_API = "https://api.abacatepay.com/v2";

const logStep = (step: string, details?: any) => {
  console.log(`[ABACATE-PIX-SIMULATE] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

function getPlanSearchesLimit(planKey: string): number {
  const limits: Record<string, number> = { start: 200, growth: 600, scale: 1200 };
  return limits[planKey] || 200;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("ABACATE_PAY_API_KEY");
    if (!apiKey) throw new Error("ABACATE_PAY_API_KEY not configured");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { pixId } = await req.json();
    if (!pixId) throw new Error("pixId is required");

    logStep("Simulating payment", { pixId });

    // v2: /transparents/simulate-payment?id=
    const simRes = await fetch(`${ABACATE_API}/transparents/simulate-payment`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({ id: pixId }),
    });

    const simJson = await simRes.json();
    logStep("Simulate response", { status: simJson.data?.status, error: simJson.error });

    if (simJson.error) {
      if (typeof simJson.error === "string" && (simJson.error.includes("not found") || simJson.error.includes("already"))) {
        logStep("PIX already consumed or not found, checking status via check endpoint");
        return new Response(
          JSON.stringify({ status: "PAID" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`Simulate failed: ${JSON.stringify(simJson.error)}`);
    }

    const status = simJson.data?.status;

    // If paid, activate plan
    if (status === "PAID") {
      const { data: leads } = await supabaseClient
        .from("checkout_leads")
        .select("user_id, email, plan_attempted")
        .eq("stripe_session_id", `abacate_pix_${pixId}`)
        .eq("checkout_completed", false)
        .limit(1);

      if (leads && leads.length > 0) {
        const lead = leads[0];
        const planNameToKey: Record<string, string> = {
          "Wiize Start": "start",
          "Wiize Growth": "growth",
          "Wiize Scale": "scale",
        };
        const planKey = planNameToKey[lead.plan_attempted] || "start";
        const searchesLimit = getPlanSearchesLimit(planKey);
        const periodEnd = new Date();
        periodEnd.setDate(periodEnd.getDate() + 30);

        if (lead.user_id) {
          // User already exists — activate plan directly
          await supabaseClient
            .from("profiles")
            .update({
              plan: planKey,
              searches_limit: searchesLimit,
              searches_used: 0,
              subscription_current_period_end: periodEnd.toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", lead.user_id);

          // Mark checkout as completed
          await supabaseClient
            .from("checkout_leads")
            .update({
              checkout_completed: true,
              checkout_completed_at: new Date().toISOString(),
            })
            .eq("stripe_session_id", `abacate_pix_${pixId}`);

          logStep("Plan activated", { userId: lead.user_id, planKey });
        } else {
          // No user yet — mark as completed so activate_pending_checkout trigger picks it up on signup
          await supabaseClient
            .from("checkout_leads")
            .update({
              checkout_completed: true,
              checkout_completed_at: new Date().toISOString(),
            })
            .eq("stripe_session_id", `abacate_pix_${pixId}`);

          logStep("Payment confirmed, pending account creation", { email: lead.email, planKey });
        }
      }
    }

    return new Response(
      JSON.stringify({ status }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
