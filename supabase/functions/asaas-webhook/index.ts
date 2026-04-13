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
  const limits: Record<string, number> = { start: 1000, growth: 3000, scale: 10000 };
  return limits[planKey] || 1000;
}

function extractPlanFromDescription(description: string): string | null {
  const lower = description?.toLowerCase() || "";
  if (lower.includes("start")) return "start";
  if (lower.includes("growth")) return "growth";
  if (lower.includes("scale")) return "scale";
  return null;
}

function extractPlanFromValue(value: number): string | null {
  // Support both old and new prices
  if (value === 197 || value === 296) return "start";
  if (value === 497 || value === 696) return "growth";
  if (value === 897) return "scale";
  return null;
}

function planNameToKey(planName: string): string | null {
  const lower = planName?.toLowerCase() || "";
  if (lower.includes("start")) return "start";
  if (lower.includes("growth")) return "growth";
  if (lower.includes("scale")) return "scale";
  return null;
}

async function getPlanFromCheckoutLead(supabaseClient: any, checkoutIdPrefix: string): Promise<string | null> {
  const { data } = await supabaseClient
    .from("checkout_leads")
    .select("plan_attempted")
    .eq("stripe_session_id", checkoutIdPrefix)
    .limit(1);
  
  if (data && data.length > 0) {
    const key = planNameToKey(data[0].plan_attempted);
    logStep("Plan found via checkout_leads", { plan_attempted: data[0].plan_attempted, planKey: key });
    return key;
  }
  return null;
}

async function findProfile(supabaseClient: any, externalReference: string | null, checkoutIdPrefix: string | null) {
  let profile: any = null;

  // Try as UUID
  if (externalReference && externalReference.match(/^[0-9a-f-]{36}$/i)) {
    const { data } = await supabaseClient
      .from("profiles")
      .select("id, plan, email, subscription_current_period_end")
      .eq("id", externalReference)
      .maybeSingle();
    if (data) return data;
  }

  // Try as email
  if (externalReference) {
    const { data } = await supabaseClient
      .from("profiles")
      .select("id, plan, email, subscription_current_period_end")
      .eq("email", externalReference)
      .maybeSingle();
    if (data) return data;
  }

  // Try via checkout_leads
  if (checkoutIdPrefix) {
    const { data: leads } = await supabaseClient
      .from("checkout_leads")
      .select("user_id, email")
      .eq("stripe_session_id", checkoutIdPrefix)
      .limit(1);

    if (leads && leads.length > 0) {
      const lead = leads[0];
      if (lead.user_id) {
        const { data } = await supabaseClient
          .from("profiles")
          .select("id, plan, email, subscription_current_period_end")
          .eq("id", lead.user_id)
          .maybeSingle();
        if (data) return data;
      }
      if (lead.email) {
        const { data } = await supabaseClient
          .from("profiles")
          .select("id, plan, email, subscription_current_period_end")
          .eq("email", lead.email)
          .maybeSingle();
        if (data) return data;
      }
    }
  }

  return null;
}

async function activatePlan(supabaseClient: any, profile: any, planKey: string, checkoutIdPrefix: string | null, paymentValue?: number) {
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

  // Calculate price in cents from payment value (grandfathering support)
  const defaultPrices: Record<string, number> = { start: 29600, growth: 69600, scale: 89700 };
  const priceCents = paymentValue ? Math.round(paymentValue * 100) : (defaultPrices[planKey] || 0);

  const { error: updateError } = await supabaseClient
    .from("profiles")
    .update({
      plan: planKey,
      searches_limit: searchesLimit,
      searches_used: 0,
      subscription_current_period_end: periodEnd.toISOString(),
      last_searches_reset: new Date().toISOString(),
      payment_provider: "asaas",
      subscription_price_cents: priceCents,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profile.id);

  if (updateError) {
    throw new Error(`Profile update failed: ${updateError.message}`);
  }

  logStep("Profile updated", { userId: profile.id, plan: planKey });

  // Mark checkout lead as completed and copy phone/cpf
  if (checkoutIdPrefix) {
    await supabaseClient
      .from("checkout_leads")
      .update({
        checkout_completed: true,
        checkout_completed_at: new Date().toISOString(),
      })
      .eq("stripe_session_id", checkoutIdPrefix)
      .eq("checkout_completed", false);

    const { data: checkoutLeads } = await supabaseClient
      .from("checkout_leads")
      .select("phone, tax_id")
      .eq("stripe_session_id", checkoutIdPrefix)
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
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookToken = Deno.env.get("ASAAS_WEBHOOK_TOKEN");
    const receivedToken = req.headers.get("asaas-access-token");

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

    logStep("Webhook received", { event });

    // ============ PIX AUTOMÁTICO: AUTHORIZATION ACTIVATED ============
    if (event === "PIX_AUTOMATIC_RECURRING_AUTHORIZATION_ACTIVATED") {
      const authorization = body.authorization;
      if (!authorization) {
        logStep("No authorization data");
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const authorizationId = authorization.id;
      logStep("PIX Automático authorization activated", { authorizationId, value: authorization.value });

      const checkoutIdPrefix = `asaas_pixauto_${authorizationId}`;
      let planKey = extractPlanFromValue(authorization.value);

      // Fallback: buscar plano via checkout_leads se valor não bater (ex: teste com R$5)
      if (!planKey) {
        logStep("Value doesn't match standard prices, checking checkout_leads", { value: authorization.value });
        planKey = await getPlanFromCheckoutLead(supabaseClient, checkoutIdPrefix);
      }

      if (!planKey) {
        logStep("Could not determine plan from any source", { value: authorization.value });
      }

      // Find profile via checkout_leads
      const profile = await findProfile(supabaseClient, null, checkoutIdPrefix);

      if (profile && planKey) {
        await activatePlan(supabaseClient, profile, planKey, checkoutIdPrefix, authorization.value);
        return new Response(
          JSON.stringify({ received: true, action: "pix_auto_activated", plan: planKey }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      logStep("No profile found for PIX Automático authorization", { authorizationId });
      return new Response(
        JSON.stringify({ received: true, warning: "no_profile_for_pix_auto" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============ PIX AUTOMÁTICO: AUTHORIZATION CANCELLED ============
    if (event === "PIX_AUTOMATIC_RECURRING_AUTHORIZATION_CANCELLED") {
      const authorization = body.authorization;
      logStep("PIX Automático authorization cancelled", { authorizationId: authorization?.id });
      // Grace period — the subscription expiry cron handles cancellation
      return new Response(
        JSON.stringify({ received: true, action: "pix_auto_cancelled_noted" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============ PAYMENT CONFIRMED (recurring charges) ============
    const payment = body.payment;
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
      const pixAutoAuthId = payment.pixAutomaticAuthorizationId;

      logStep("Processing payment", { externalReference, description, value, subscriptionId, pixAutoAuthId });

      let planKey = extractPlanFromDescription(description) || extractPlanFromValue(value);

      // Fallback: buscar plano via checkout_leads
      const checkoutPrefix = pixAutoAuthId
        ? `asaas_pixauto_${pixAutoAuthId}`
        : subscriptionId
          ? `asaas_sub_${subscriptionId}`
          : null;

      if (!planKey && checkoutPrefix) {
        logStep("Value/description doesn't match, checking checkout_leads", { description, value });
        planKey = await getPlanFromCheckoutLead(supabaseClient, checkoutPrefix);
      }

      if (!planKey) {
        logStep("Could not determine plan from any source", { description, value });
        return new Response(JSON.stringify({ received: true, warning: "unknown_plan" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Find profile via multiple methods
      const profile = await findProfile(supabaseClient, externalReference, checkoutPrefix);

      if (!profile) {
        logStep("No profile found for payment", { externalReference, subscriptionId, pixAutoAuthId });
        return new Response(JSON.stringify({ received: true, warning: "no_profile" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await activatePlan(supabaseClient, profile, planKey, checkoutPrefix);

      return new Response(
        JSON.stringify({ received: true, plan: planKey, userId: profile.id, action: "activated" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============ PAYMENT OVERDUE ============
    if (event === "PAYMENT_OVERDUE") {
      logStep("Payment overdue", { paymentId: payment?.id });
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
        const profile = await findProfile(supabaseClient, externalReference, null);

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

    // ============ PIX AUTOMÁTICO PAYMENT INSTRUCTION EVENTS ============
    if (event?.startsWith("PIX_AUTOMATIC_RECURRING_PAYMENT_INSTRUCTION_")) {
      logStep("PIX Automático payment instruction event", { event, data: body.paymentInstruction });
      return new Response(
        JSON.stringify({ received: true, action: "pix_instruction_logged" }),
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
