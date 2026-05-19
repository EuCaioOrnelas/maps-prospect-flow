import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-ai-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_PLANS = ["growth", "scale"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  try {
    const requiredSecret = Deno.env.get("WIIZE_AI_SHARED_SECRET");
    if (requiredSecret) {
      const providedSecret = req.headers.get("x-ai-secret");
      if (providedSecret !== requiredSecret) {
        return json({ error: "forbidden" }, 403);
      }
    }

    const { email, password } = await req.json().catch(() => ({}));
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!normalizedEmail || typeof password !== "string" || !password) {
      return json({ error: "missing_credentials" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({ error: "server_not_configured" }, 500);
    }

    const authClient = createClient(supabaseUrl, anonKey);
    const { data: signIn, error: signInError } = await authClient.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (signInError || !signIn.user || !signIn.session) {
      return json({ error: "invalid_credentials", reason: "invalid_credentials" }, 401);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select(
        "id, email, name, plan, is_blocked, admin_assigned_plan, is_custom_subscription, subscription_current_period_end, trial_will_charge_at, trial_plan_chosen"
      )
      .eq("id", signIn.user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return json({ error: "profile_not_found" }, 404);
    }

    if (profile.is_blocked === true) {
      return json({ authorized: false, reason: "blocked" }, 403);
    }

    const accessPlan = getAccessPlan(profile);
    if (!ALLOWED_PLANS.includes(accessPlan)) {
      return json(
        {
          authorized: false,
          reason: "no_access",
          current_plan: accessPlan || profile.plan || "free",
          required_plans: ALLOWED_PLANS,
        },
        403
      );
    }

    if (!hasActiveAccess(profile)) {
      return json(
        {
          authorized: false,
          reason: "expired",
          expires_at: profile.subscription_current_period_end || profile.trial_will_charge_at || null,
        },
        403
      );
    }

    return json({
      authorized: true,
      user: {
        id: profile.id,
        email: profile.email || signIn.user.email,
        name: profile.name,
        plan: accessPlan,
        expires_at: profile.subscription_current_period_end || profile.trial_will_charge_at || null,
      },
      access_token: signIn.session.access_token,
      refresh_token: signIn.session.refresh_token,
    });
  } catch (error) {
    console.error("verify-ai-access error:", error);
    return json(
      { error: "internal_error", message: error instanceof Error ? error.message : String(error) },
      500
    );
  }
});

function getAccessPlan(profile: Record<string, any>) {
  const trialPlan = typeof profile.trial_plan_chosen === "string" ? profile.trial_plan_chosen : "";
  if (trialPlan && profile.trial_will_charge_at) {
    const trialEndsAt = new Date(profile.trial_will_charge_at);
    if (!Number.isNaN(trialEndsAt.getTime()) && trialEndsAt.getTime() > Date.now()) {
      return trialPlan.toLowerCase();
    }
  }

  return typeof profile.plan === "string" ? profile.plan.toLowerCase() : "free";
}

function hasActiveAccess(profile: Record<string, any>) {
  if (profile.admin_assigned_plan === true || profile.is_custom_subscription === true) {
    return true;
  }

  if (profile.trial_will_charge_at && profile.trial_plan_chosen) {
    const trialEndsAt = new Date(profile.trial_will_charge_at);
    if (!Number.isNaN(trialEndsAt.getTime()) && trialEndsAt.getTime() > Date.now()) {
      return true;
    }
  }

  if (!profile.subscription_current_period_end) {
    return false;
  }

  const subscriptionEndsAt = new Date(profile.subscription_current_period_end);
  return !Number.isNaN(subscriptionEndsAt.getTime()) && subscriptionEndsAt.getTime() > Date.now();
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}