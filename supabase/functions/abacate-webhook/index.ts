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

// Map AbacatePay product externalId to plan name
function extractPlanFromExternalId(externalId: string): string | null {
  const match = externalId?.match(/^wiize-(\w+)$/);
  return match ? match[1] : null;
}

// Map plan key to searches_limit
function getPlanSearchesLimit(planKey: string): number {
  const limits: Record<string, number> = {
    start: 100,
    growth: 500,
    scale: 1200,
  };
  return limits[planKey] || 100;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json();
    logStep("Webhook received", { event: body.event, billingId: body.data?.billing?.id });

    const event = body.event;

    if (event === "billing.paid" || event === "BILLING_PAID") {
      const billing = body.data?.billing || body.data;
      if (!billing) {
        logStep("No billing data in webhook");
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const billingId = billing.id;
      const customerEmail = billing.customer?.metadata?.email;
      const products = billing.products || [];

      logStep("Processing billing.paid", { billingId, customerEmail, products });

      if (!customerEmail) {
        logStep("No customer email found, cannot update profile");
        return new Response(JSON.stringify({ received: true, warning: "no_email" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Find user by email
      const { data: profiles } = await supabaseClient
        .from("profiles")
        .select("id, plan, email")
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

      // Determine which plan was purchased
      let planKey: string | null = null;
      for (const product of products) {
        const extracted = extractPlanFromExternalId(product.externalId);
        if (extracted) {
          planKey = extracted;
          break;
        }
      }

      if (!planKey) {
        logStep("Could not determine plan from products", { products });
        return new Response(JSON.stringify({ received: true, warning: "unknown_plan" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update user profile with the new plan
      const searchesLimit = getPlanSearchesLimit(planKey);
      const periodEnd = new Date();
      periodEnd.setDate(periodEnd.getDate() + 30); // 30 days period

      const { error: updateError } = await supabaseClient
        .from("profiles")
        .update({
          plan: planKey,
          searches_limit: searchesLimit,
          searches_used: 0,
          subscription_current_period_end: periodEnd.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);

      if (updateError) {
        logStep("Failed to update profile", { error: updateError.message });
        throw new Error(`Profile update failed: ${updateError.message}`);
      }

      logStep("Profile updated successfully", { userId: profile.id, newPlan: planKey });

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
        JSON.stringify({ received: true, plan: planKey, userId: profile.id }),
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
