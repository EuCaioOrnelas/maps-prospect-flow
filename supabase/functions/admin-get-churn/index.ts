import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Cutoff: ignorar churns anteriores a 15/04/2026 (legado pré-relançamento)
const CHURN_CUTOFF_MS = new Date("2026-04-15T00:00:00-03:00").getTime();
const CHURN_CUTOFF_UNIX = Math.floor(CHURN_CUTOFF_MS / 1000);

const logStep = (step: string, details?: unknown) => {
  const suffix = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[ADMIN-GET-CHURN] ${step}${suffix}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const publishableKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "";
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const authClient = createClient(supabaseUrl, publishableKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const { data: isAdmin, error: adminError } = await authClient.rpc("is_current_user_admin");
    if (adminError || !isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    const now = Date.now();

    const [cancellationsRes, feedbacksRes, eventsRes, profilesRes] = await Promise.all([
      adminClient.from("subscription_cancellations").select("*").order("cancelled_at", { ascending: false }),
      adminClient.from("cancellation_feedback").select("*").order("created_at", { ascending: false }),
      adminClient
        .from("subscription_events")
        .select("*")
        .in("event_type", ["subscription_canceled", "subscription_deleted", "charge_refunded", "pix_not_renewed"])
        .order("created_at", { ascending: false }),
      adminClient
        .from("profiles")
        .select("id, email, name, plan, payment_provider, subscription_current_period_end, admin_assigned_plan")
        .order("created_at", { ascending: false }),
    ]);

    if (cancellationsRes.error) throw cancellationsRes.error;
    if (feedbacksRes.error) throw feedbacksRes.error;
    if (eventsRes.error) throw eventsRes.error;
    if (profilesRes.error) throw profilesRes.error;

    const profiles = profilesRes.data || [];
    const expiredProfiles = profiles.filter((profile) => {
      if (profile.admin_assigned_plan) return false;
      if (!profile.subscription_current_period_end) return false;
      if (!["abacate_pay", "asaas"].includes(profile.payment_provider || "")) return false;
      // Only include profiles that had a paid plan (not free) — real churn
      if (!profile.plan || profile.plan === "free") return false;

      const periodEnd = new Date(profile.subscription_current_period_end).getTime();
      return Number.isFinite(periodEnd) && periodEnd < now;
    });

    logStep("Churn payload ready", {
      cancellations: cancellationsRes.data?.length || 0,
      feedbacks: feedbacksRes.data?.length || 0,
      events: eventsRes.data?.length || 0,
      profiles: profiles.length,
      expiredProfiles: expiredProfiles.length,
    });

    return new Response(
      JSON.stringify({
        cancellations: cancellationsRes.data || [],
        feedbacks: feedbacksRes.data || [],
        subEvents: eventsRes.data || [],
        profiles,
        expiredProfiles,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message });
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
