import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (msg: string, data?: any) => {
  console.log(`[RECONCILE-STRIPE] ${msg}${data ? ' - ' + JSON.stringify(data) : ''}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", { apiVersion: "2023-10-16" });

  try {
    // Find all Stripe paid users without subscription_current_period_end
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, email, plan")
      .eq("payment_provider", "stripe")
      .in("plan", ["start", "growth", "scale"])
      .is("subscription_current_period_end", null);

    if (error) throw error;
    log(`Found ${profiles?.length ?? 0} profiles to reconcile`);

    const results: any[] = [];

    for (const profile of profiles ?? []) {
      try {
        // Find the customer in Stripe by email
        const customers = await stripe.customers.list({ email: profile.email, limit: 5 });
        if (customers.data.length === 0) {
          results.push({ email: profile.email, status: "no_customer" });
          continue;
        }

        // Look for an active subscription across all customers found
        let activeSub: Stripe.Subscription | null = null;
        for (const c of customers.data) {
          const subs = await stripe.subscriptions.list({
            customer: c.id,
            status: "active",
            limit: 5,
          });
          if (subs.data.length > 0) {
            // Pick the one with the latest current_period_end
            activeSub = subs.data.reduce((latest, s) =>
              !latest || s.current_period_end > latest.current_period_end ? s : latest,
              null as Stripe.Subscription | null
            );
            break;
          }
        }

        if (!activeSub) {
          results.push({ email: profile.email, status: "no_active_subscription" });
          continue;
        }

        const periodEnd = new Date(activeSub.current_period_end * 1000).toISOString();
        const { error: updateErr } = await supabase
          .from("profiles")
          .update({ subscription_current_period_end: periodEnd })
          .eq("id", profile.id);

        if (updateErr) {
          results.push({ email: profile.email, status: "update_error", error: updateErr.message });
        } else {
          results.push({ email: profile.email, status: "ok", period_end: periodEnd });
          log("Reconciled", { email: profile.email, period_end: periodEnd });
        }
      } catch (e: any) {
        results.push({ email: profile.email, status: "error", error: e.message });
      }
    }

    const summary = {
      total: profiles?.length ?? 0,
      ok: results.filter((r) => r.status === "ok").length,
      no_customer: results.filter((r) => r.status === "no_customer").length,
      no_active_subscription: results.filter((r) => r.status === "no_active_subscription").length,
      errors: results.filter((r) => r.status === "error" || r.status === "update_error").length,
    };

    return new Response(JSON.stringify({ summary, results }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    log("Fatal error", { error: e.message });
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});