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

    // Find paid users whose subscription expired more than 7 days ago.
    // During the grace period access remains available, but no credits are renewed.
    const gracePeriodDate = new Date();
    gracePeriodDate.setDate(gracePeriodDate.getDate() - 7);

    const { data: expiredUsers, error } = await supabaseClient
      .from("profiles")
      .select("id, email, plan, payment_provider, subscription_current_period_end, is_custom_subscription")
      .neq("plan", "free")
      .not("subscription_current_period_end", "is", null)
      .lt("subscription_current_period_end", gracePeriodDate.toISOString())
      .eq("admin_assigned_plan", false)
      .eq("is_custom_subscription", false);

    if (error) {
      logStep("Error querying expired users", { error: error.message });
      throw error;
    }

    logStep("Found expired subscriptions", { count: expiredUsers?.length || 0 });

    const [{ data: paidPix }, { data: paidCustom }, { data: paidSales }] = await Promise.all([
      supabaseClient.from("pix_invoices").select("user_id").eq("status", "paid"),
      supabaseClient.from("custom_subscription_payments").select("user_id").not("paid_at", "is", null),
      supabaseClient.from("partner_sales").select("customer_user_id").not("customer_user_id", "is", null),
    ]);
    const realPayers = new Set<string>();
    for (const row of paidPix || []) if (row.user_id) realPayers.add(row.user_id);
    for (const row of paidCustom || []) if (row.user_id) realPayers.add(row.user_id);
    for (const row of paidSales || []) if (row.customer_user_id) realPayers.add(row.customer_user_id);

    let downgraded = 0;
    for (const user of expiredUsers || []) {
      const { error: updateError } = await supabaseClient
        .from("profiles")
        .update({
          plan: "free",
          searches_limit: 10,
          searches_used: 0,
          bonus_searches: 0,
          subscription_price_cents: 0,
          // Keep the expired date so the access guard detects the former subscription.
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (updateError) {
        logStep("Failed to downgrade user", { userId: user.id, error: updateError.message });
      } else {
        downgraded++;
        logStep("User downgraded to free", { userId: user.id, email: user.email, previousPlan: user.plan });

        // Só registra churn quando existe prova de pagamento anterior. Trial
        // vencido/não cobrado perde acesso, mas nunca entra nas métricas de churn.
        try {
          if (!realPayers.has(user.id)) continue;
          await supabaseClient.from("subscription_events").insert({
            user_id: user.id,
            email: user.email,
            event_type: user.payment_provider === "asaas" ? "pix_not_renewed" : "subscription_expired",
            event_source: user.payment_provider || "system",
            previous_plan: user.plan,
            new_plan: "free",
          });
        } catch (e) {
          logStep("Failed to log subscription event", { error: String(e) });
        }
      }
    }

    return new Response(
      JSON.stringify({ checked: expiredUsers?.length || 0, downgraded, real_payers_checked: realPayers.size }),
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
