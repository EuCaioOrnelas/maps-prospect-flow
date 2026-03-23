import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SUBSCRIPTION-EXPIRY-CHECK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Find paid users whose subscription expired more than 1 day ago
    // Grace period: 1 day after expiry before downgrade
    const gracePeriodDate = new Date();
    gracePeriodDate.setDate(gracePeriodDate.getDate() - 1);

    const { data: expiredUsers, error } = await supabaseClient
      .from("profiles")
      .select("id, email, plan, subscription_current_period_end")
      .neq("plan", "free")
      .not("subscription_current_period_end", "is", null)
      .lt("subscription_current_period_end", gracePeriodDate.toISOString())
      .eq("admin_assigned_plan", false);

    if (error) {
      logStep("Error querying expired users", { error: error.message });
      throw error;
    }

    logStep("Found expired subscriptions", { count: expiredUsers?.length || 0 });

    let downgraded = 0;
    for (const user of expiredUsers || []) {
      const { error: updateError } = await supabaseClient
        .from("profiles")
        .update({
          plan: "free",
          searches_limit: 10,
          searches_used: 0,
          // Keep the expired date so the popup can detect recent expiration
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (updateError) {
        logStep("Failed to downgrade user", { userId: user.id, error: updateError.message });
      } else {
        downgraded++;
        logStep("User downgraded to free", { userId: user.id, email: user.email, previousPlan: user.plan });

        // Log subscription event for churn tracking
        try {
          await supabaseClient.from("subscription_events").insert({
            user_id: user.id,
            email: user.email,
            event_type: "pix_not_renewed",
            event_source: "asaas",
            previous_plan: user.plan,
            new_plan: "free",
          });
        } catch (e) {
          logStep("Failed to log subscription event", { error: String(e) });
        }
      }
    }

    return new Response(
      JSON.stringify({ checked: expiredUsers?.length || 0, downgraded }),
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
