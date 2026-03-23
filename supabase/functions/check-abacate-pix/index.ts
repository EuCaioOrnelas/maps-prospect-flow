import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ABACATE_API = "https://api.abacatepay.com/v2";

const logStep = (step: string, details?: any) => {
  console.log(`[ABACATE-PIX-CHECK] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

function getPlanSearchesLimit(planKey: string): number {
  const limits: Record<string, number> = { start: 200, growth: 600, scale: 1200 };
  return limits[planKey] || 200;
}

function getCheckoutIdentifiers(pixId: string): string[] {
  return [`abacate_pix_${pixId}`, `abacate_sub_${pixId}`];
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

    logStep("Checking PIX status", { pixId });

    // v2: /transparents/check?id=
    const checkRes = await fetch(`${ABACATE_API}/transparents/check?id=${pixId}`, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Accept": "application/json",
      },
    });

    const checkJson = await checkRes.json();
    if (checkJson.error) {
      throw new Error(`Check failed: ${JSON.stringify(checkJson.error)}`);
    }

    const status = checkJson.data?.status;
    logStep("PIX status", { pixId, status });

    // If paid, activate the plan
    if (status === "PAID") {
      const checkoutIdentifiers = getCheckoutIdentifiers(pixId);

      const { data: leads } = await supabaseClient
        .from("checkout_leads")
        .select("user_id, email, plan_attempted")
        .in("stripe_session_id", checkoutIdentifiers)
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
          const { error: updateError } = await supabaseClient
            .from("profiles")
            .update({
              plan: planKey,
              searches_limit: searchesLimit,
              searches_used: 0,
              subscription_current_period_end: periodEnd.toISOString(),
              payment_provider: "abacate_pay",
              updated_at: new Date().toISOString(),
            })
            .eq("id", lead.user_id);

          if (updateError) {
            logStep("Failed to update profile", { error: updateError.message });
          } else {
            logStep("Profile updated to plan", { userId: lead.user_id, planKey });
          }
        } else {
          const { data: profileByEmail } = await supabaseClient
            .from("profiles")
            .select("id")
            .eq("email", lead.email)
            .maybeSingle();

          if (profileByEmail) {
            await supabaseClient
              .from("profiles")
              .update({
                plan: planKey,
                searches_limit: searchesLimit,
                searches_used: 0,
                subscription_current_period_end: periodEnd.toISOString(),
                payment_provider: "abacate_pay",
                updated_at: new Date().toISOString(),
              })
              .eq("id", profileByEmail.id);

            await supabaseClient
              .from("checkout_leads")
              .update({ user_id: profileByEmail.id })
              .in("stripe_session_id", checkoutIdentifiers);

            logStep("Profile found by email and updated", { userId: profileByEmail.id, planKey });
          } else {
            logStep("No profile found - plan will be activated on account creation", { email: lead.email });
          }
        }

        await supabaseClient
          .from("checkout_leads")
          .update({
            checkout_completed: true,
            checkout_completed_at: new Date().toISOString(),
          })
          .in("stripe_session_id", checkoutIdentifiers);

        logStep("Checkout completed", { pixId });
      } else {
        logStep("No pending checkout lead found for paid PIX", { pixId, checkoutIdentifiers });
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
