import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ABACATE-WEBHOOK] ${step}${detailsStr}`);
};

// Map AbacatePay product externalId or product ID to plan name
function extractPlanFromProducts(products: any[]): string | null {
  const productToPlan: Record<string, string> = {
    "prod_YuGfZ0UukSSPPjbjn3DZJkMK": "start",
    "prod_fNftUU0Pd5bEgdpnKTADKUgT": "growth",
    "prod_2KNLMQM5QHe0bb1TZxWenx2N": "scale",
  };

  for (const product of products) {
    // Check by product ID
    if (product.id && productToPlan[product.id]) {
      return productToPlan[product.id];
    }
    if (product.productId && productToPlan[product.productId]) {
      return productToPlan[product.productId];
    }
    // Check by externalId (legacy v1 format)
    const match = product.externalId?.match(/^wiize-(\w+)$/);
    if (match) return match[1];
  }
  return null;
}

// Map plan key to searches_limit
function getPlanSearchesLimit(planKey: string): number {
  const limits: Record<string, number> = {
    start: 200,
    growth: 600,
    scale: 1200,
  };
  return limits[planKey] || 200;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate webhook secret
    const webhookSecret = Deno.env.get("ABACATE_WEBHOOK_SECRET");
    const receivedSecret = req.headers.get("x-webhook-secret") || req.headers.get("authorization")?.replace("Bearer ", "");
    
    logStep("Webhook auth check", { 
      hasConfiguredSecret: !!webhookSecret,
      hasReceivedSecret: !!receivedSecret,
    });

    if (webhookSecret && webhookSecret !== "" && receivedSecret !== webhookSecret) {
      logStep("Invalid webhook secret");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json();
    logStep("Webhook received", { event: body.event, fullBody: JSON.stringify(body).substring(0, 500) });

    const event = body.event;

    // ============ PAYMENT SUCCESS (initial + renewal) ============
    if (event === "billing.paid" || event === "BILLING_PAID" || event === "subscription.paid" || event === "SUBSCRIPTION_PAID") {
      const billing = body.data?.billing || body.data?.subscription || body.data;
      if (!billing) {
        logStep("No billing data in webhook");
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const billingId = billing.id;
      const customerEmail = billing.customer?.metadata?.email || billing.customer?.email || billing.metadata?.email;
      const products = billing.products || [];

      logStep("Processing payment success", { billingId, customerEmail, products });

      if (!customerEmail) {
        logStep("No customer email found, cannot update profile");
        return new Response(JSON.stringify({ received: true, warning: "no_email" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Find user by email
      const { data: profiles } = await supabaseClient
        .from("profiles")
        .select("id, plan, email, searches_used, subscription_current_period_end")
        .eq("email", customerEmail)
        .limit(1);

      if (!profiles || profiles.length === 0) {
        logStep("No profile found for email", { email: customerEmail });
        return new Response(JSON.stringify({ received: true, warning: "no_profile" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const profile = profiles[0];
      logStep("Found profile", { userId: profile.id, currentPlan: profile.plan });

      // Determine plan
      let planKey = extractPlanFromProducts(products);

      // Fallback: try metadata
      if (!planKey && billing.metadata?.planKey) {
        planKey = billing.metadata.planKey;
      }

      if (!planKey) {
        logStep("Could not determine plan from products", { products });
        return new Response(JSON.stringify({ received: true, warning: "unknown_plan" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update profile: activate/renew plan + reset searches
      // IMPORTANT: For renewals, extend from current period end (not from today)
      // This ensures early payments don't shorten the subscription cycle
      const searchesLimit = getPlanSearchesLimit(planKey);
      const isRenewal = billing.metadata?.type === "renewal" || billing.metadata?.type === "subscription_pix";
      const currentPeriodEnd = profile.plan !== "free" 
        ? new Date(billing.metadata?.currentPeriodEnd || profile.subscription_current_period_end || new Date())
        : new Date();
      
      let periodEnd: Date;
      if (isRenewal && currentPeriodEnd > new Date()) {
        // Early payment: extend from current expiry date
        periodEnd = new Date(currentPeriodEnd);
        periodEnd.setDate(periodEnd.getDate() + 30);
        logStep("Early renewal detected, extending from current period end", { 
          currentEnd: currentPeriodEnd.toISOString(), 
          newEnd: periodEnd.toISOString() 
        });
      } else {
        // First payment or expired: start from today
        periodEnd = new Date();
        periodEnd.setDate(periodEnd.getDate() + 30);
      }

      const { error: updateError } = await supabaseClient
        .from("profiles")
        .update({
          plan: planKey,
          searches_limit: searchesLimit,
          searches_used: 0,
          subscription_current_period_end: periodEnd.toISOString(),
          last_searches_reset: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);

      if (updateError) {
        logStep("Failed to update profile", { error: updateError.message });
        throw new Error(`Profile update failed: ${updateError.message}`);
      }

      logStep("Profile updated (plan activated/renewed)", { userId: profile.id, newPlan: planKey, searchesReset: true });

      // Mark checkout lead as completed
      await supabaseClient
        .from("checkout_leads")
        .update({
          checkout_completed: true,
          checkout_completed_at: new Date().toISOString(),
        })
        .eq("email", customerEmail)
        .eq("checkout_completed", false)
        .order("created_at", { ascending: false })
        .limit(1);

      logStep("Checkout lead marked as completed");

      return new Response(
        JSON.stringify({ received: true, plan: planKey, userId: profile.id, action: "activated_or_renewed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============ SUBSCRIPTION OVERDUE / PAYMENT FAILED ============
    if (event === "billing.overdue" || event === "BILLING_OVERDUE" || 
        event === "subscription.overdue" || event === "SUBSCRIPTION_OVERDUE" ||
        event === "billing.payment_failed" || event === "BILLING_PAYMENT_FAILED") {
      const billing = body.data?.billing || body.data?.subscription || body.data;
      const customerEmail = billing?.customer?.metadata?.email || billing?.customer?.email || billing?.metadata?.email;

      logStep("Payment overdue/failed", { event, customerEmail });

      if (customerEmail) {
        // Don't immediately cancel — mark as overdue; give grace period
        // The subscription expiration cron will handle actual cancellation
        logStep("User notified of overdue payment, grace period active", { email: customerEmail });
      }

      return new Response(
        JSON.stringify({ received: true, action: "overdue_noted" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============ SUBSCRIPTION CANCELED ============
    if (event === "billing.canceled" || event === "BILLING_CANCELED" ||
        event === "subscription.canceled" || event === "SUBSCRIPTION_CANCELED") {
      const billing = body.data?.billing || body.data?.subscription || body.data;
      const customerEmail = billing?.customer?.metadata?.email || billing?.customer?.email || billing?.metadata?.email;

      logStep("Subscription canceled", { event, customerEmail });

      if (customerEmail) {
        const { data: profiles } = await supabaseClient
          .from("profiles")
          .select("id, plan")
          .eq("email", customerEmail)
          .limit(1);

        if (profiles && profiles.length > 0) {
          const profile = profiles[0];
          // Downgrade to free
          await supabaseClient
            .from("profiles")
            .update({
              plan: "free",
              searches_limit: 5,
              searches_used: 0,
              subscription_current_period_end: null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", profile.id);

          logStep("User downgraded to free", { userId: profile.id, previousPlan: profile.plan });
        }
      }

      return new Response(
        JSON.stringify({ received: true, action: "canceled_downgraded" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Other events we just acknowledge
    logStep("Unhandled event type", { event });
    return new Response(
      JSON.stringify({ received: true }),
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
