import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[ASAAS-WEBHOOK] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

function getPlanSearchesLimit(planKey: string): number {
  const limits: Record<string, number> = { start: 200, growth: 600, scale: 1200 };
  return limits[planKey] || 200;
}

function extractPlanFromDescription(description: string): string | null {
  const lower = description?.toLowerCase() || "";
  if (lower.includes("start")) return "start";
  if (lower.includes("growth")) return "growth";
  if (lower.includes("scale")) return "scale";
  return null;
}

function extractPlanFromValue(value: number): string | null {
  if (value === 197) return "start";
  if (value === 497) return "growth";
  if (value === 897) return "scale";
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate webhook token
    const webhookToken = Deno.env.get("ASAAS_WEBHOOK_TOKEN");
    const receivedToken = req.headers.get("asaas-access-token");

    logStep("Webhook auth check", {
      hasConfiguredToken: !!webhookToken,
      hasReceivedToken: !!receivedToken,
    });

    if (webhookToken && webhookToken !== "" && receivedToken !== webhookToken) {
      logStep("Invalid webhook token");
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
    const event = body.event;
    const payment = body.payment;

    logStep("Webhook received", { event, paymentId: payment?.id, value: payment?.value });

    // ============ PAYMENT CONFIRMED ============
    if (event === "PAYMENT_CONFIRMED" || event === "PAYMENT_RECEIVED") {
      if (!payment) {
        logStep("No payment data");
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const externalReference = payment.externalReference;
      const description = payment.description || "";
      const value = payment.value;
      const subscriptionId = payment.subscription;

      logStep("Processing payment", { externalReference, description, value, subscriptionId });

      // Determine plan from description or value
      let planKey = extractPlanFromDescription(description) || extractPlanFromValue(value);

      if (!planKey) {
        logStep("Could not determine plan", { description, value });
        return new Response(JSON.stringify({ received: true, warning: "unknown_plan" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Find user by externalReference (could be user_id or email)
      let profile: any = null;

      // Try as UUID first
      if (externalReference && externalReference.match(/^[0-9a-f-]{36}$/i)) {
        const { data } = await supabaseClient
          .from("profiles")
          .select("id, plan, email, subscription_current_period_end")
          .eq("id", externalReference)
          .maybeSingle();
        if (data) profile = data;
      }

      // Try as email
      if (!profile && externalReference) {
        const { data } = await supabaseClient
          .from("profiles")
          .select("id, plan, email, subscription_current_period_end")
          .eq("email", externalReference)
          .maybeSingle();
        if (data) profile = data;
      }

      // Try via checkout_leads
      if (!profile && subscriptionId) {
        const { data: leads } = await supabaseClient
          .from("checkout_leads")
          .select("user_id, email")
          .eq("stripe_session_id", `asaas_sub_${subscriptionId}`)
          .limit(1);

        if (leads && leads.length > 0) {
          const lead = leads[0];
          if (lead.user_id) {
            const { data } = await supabaseClient
              .from("profiles")
              .select("id, plan, email, subscription_current_period_end")
              .eq("id", lead.user_id)
              .maybeSingle();
            if (data) profile = data;
          } else if (lead.email) {
            const { data } = await supabaseClient
              .from("profiles")
              .select("id, plan, email, subscription_current_period_end")
              .eq("email", lead.email)
              .maybeSingle();
            if (data) profile = data;
          }
        }
      }

      if (!profile) {
        logStep("No profile found for payment", { externalReference, subscriptionId });
        return new Response(JSON.stringify({ received: true, warning: "no_profile" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      logStep("Found profile", { userId: profile.id, currentPlan: profile.plan });

      // Calculate period end - extend from current if early renewal
      const searchesLimit = getPlanSearchesLimit(planKey);
      const currentPeriodEnd = profile.subscription_current_period_end
        ? new Date(profile.subscription_current_period_end)
        : new Date();

      let periodEnd: Date;
      if (profile.plan !== "free" && currentPeriodEnd > new Date()) {
        periodEnd = new Date(currentPeriodEnd);
        periodEnd.setDate(periodEnd.getDate() + 30);
        logStep("Early renewal, extending", { currentEnd: currentPeriodEnd.toISOString(), newEnd: periodEnd.toISOString() });
      } else {
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
          payment_provider: "asaas",
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);

      if (updateError) {
        logStep("Failed to update profile", { error: updateError.message });
        throw new Error(`Profile update failed: ${updateError.message}`);
      }

      logStep("Profile updated", { userId: profile.id, plan: planKey });

      // Mark checkout lead as completed
      if (subscriptionId) {
        await supabaseClient
          .from("checkout_leads")
          .update({
            checkout_completed: true,
            checkout_completed_at: new Date().toISOString(),
          })
          .eq("stripe_session_id", `asaas_sub_${subscriptionId}`)
          .eq("checkout_completed", false);

        // Copy phone/cpf from lead to profile
        const { data: checkoutLeads } = await supabaseClient
          .from("checkout_leads")
          .select("phone, tax_id")
          .eq("stripe_session_id", `asaas_sub_${subscriptionId}`)
          .limit(1);

        if (checkoutLeads && checkoutLeads.length > 0) {
          const lead = checkoutLeads[0];
          const profileUpdate: Record<string, string> = {};
          if (lead.phone) profileUpdate.phone = lead.phone;
          if (lead.tax_id) profileUpdate.cpf = lead.tax_id;
          if (Object.keys(profileUpdate).length > 0) {
            await supabaseClient.from("profiles").update(profileUpdate).eq("id", profile.id);
          }
        }
      }

      return new Response(
        JSON.stringify({ received: true, plan: planKey, userId: profile.id, action: "activated" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============ PAYMENT OVERDUE ============
    if (event === "PAYMENT_OVERDUE") {
      logStep("Payment overdue", { paymentId: payment?.id });
      // Grace period — the subscription expiry cron handles cancellation
      return new Response(
        JSON.stringify({ received: true, action: "overdue_noted" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============ PAYMENT REFUNDED / DELETED ============
    if (event === "PAYMENT_REFUNDED" || event === "PAYMENT_DELETED") {
      const externalReference = payment?.externalReference;
      logStep("Payment refunded/deleted", { event, externalReference });

      if (externalReference) {
        let profile: any = null;

        if (externalReference.match(/^[0-9a-f-]{36}$/i)) {
          const { data } = await supabaseClient
            .from("profiles").select("id, plan").eq("id", externalReference).maybeSingle();
          if (data) profile = data;
        }
        if (!profile) {
          const { data } = await supabaseClient
            .from("profiles").select("id, plan").eq("email", externalReference).maybeSingle();
          if (data) profile = data;
        }

        if (profile) {
          await supabaseClient.from("profiles").update({
            plan: "free",
            searches_limit: 10,
            searches_used: 0,
            subscription_current_period_end: null,
            updated_at: new Date().toISOString(),
          }).eq("id", profile.id);
          logStep("User downgraded to free", { userId: profile.id });
        }
      }

      return new Response(
        JSON.stringify({ received: true, action: "refunded_downgraded" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Other events
    logStep("Unhandled event", { event });
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
