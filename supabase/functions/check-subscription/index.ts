import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Map price IDs to plan names - includes all historical price IDs
const PRICE_TO_PLAN: Record<string, string> = {
  // Current prices
  "price_1SlykAK8CM0R6xMMOCM684rz": "start",   // R$197/month
  "price_1SlykkK8CM0R6xMMZu7WJesV": "growth",  // R$497/month
  "price_1SlylcK8CM0R6xMMyHRWAd8G": "scale",   // R$897/month
  // Legacy prices - must be mapped for existing subscriptions
  "price_1SXrv7K8CM0R6xMMo4FlSVIk": "start",   // R$67/year (legacy)
  "price_1SXruNK8CM0R6xMMVD8Gksi4": "start",   // R$9.90/month (legacy)
  "price_1SZj5bK8CM0R6xMMFocrHWkj": "start",   // R$29.90/month (legacy)
  "price_1Sc1ehK8CM0R6xMMg1Z0kqCk": "start",   // R$39.90/month (legacy)
  "price_1SZj4hK8CM0R6xMMSZjjoEkN": "growth",  // R$249.90/year (legacy)
  "price_1SkEsEK8CM0R6xMM9Y1ip21w": "start",   // R$97/month (legacy)
  "price_1SkEsoK8CM0R6xMMF72J3hAi": "growth",  // R$497/month (legacy)
};

// Map plan names to search limits
const PLAN_LIMITS: Record<string, number> = {
  "free": 10,
  "start": 200,
  "growth": 600,
  "scale": 1200,
};

// Calculate new searches limit considering remaining searches from previous plan
const calculateNewSearchesLimit = (
  currentSearchesUsed: number,
  currentSearchesLimit: number,
  newPlanLimit: number
): { newLimit: number; carryOver: number } => {
  // Calculate remaining searches from current plan
  const remainingSearches = Math.max(0, currentSearchesLimit - currentSearchesUsed);
  
  // If upgrading and has remaining searches, add them to new plan
  if (remainingSearches > 0 && newPlanLimit > currentSearchesLimit) {
    const carryOver = remainingSearches;
    const newLimit = newPlanLimit + carryOver;
    return { newLimit, carryOver };
  }
  
  return { newLimit: newPlanLimit, carryOver: 0 };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get current profile to check existing searches
    const { data: currentProfile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('searches_used, searches_limit, plan')
      .eq('id', user.id)
      .single();

    if (profileError) {
      logStep("Profile not found, creating minimal response");
      return new Response(JSON.stringify({ 
        subscribed: false, 
        plan: "free",
        searches_limit: PLAN_LIMITS["free"]
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found, user is on free plan - keeping current profile state");
      
      // If the current profile already has a plan set by webhook, trust it
      // Only return free if profile is also on free
      if (currentProfile.plan && currentProfile.plan !== "free") {
        logStep("Profile has paid plan, returning that", { plan: currentProfile.plan });
        return new Response(JSON.stringify({ 
          subscribed: true, 
          plan: currentProfile.plan,
          searches_limit: currentProfile.searches_limit
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      
      return new Response(JSON.stringify({ 
        subscribed: false, 
        plan: "free",
        searches_limit: PLAN_LIMITS["free"]
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 10,
    });

    const getPlanOrder = (planName: string) => {
      const order: Record<string, number> = {
        free: 0,
        start: 1,
        growth: 2,
        scale: 3,
      };
      return order[planName] ?? 0;
    };

    // Consider only subscriptions that match our known plan prices
    const candidateSubs = subscriptions.data
      .map((sub: Stripe.Subscription) => {
        const priceId = sub.items.data[0]?.price?.id;
        const mappedPlan = priceId ? PRICE_TO_PLAN[priceId] : undefined;
        return { sub, priceId, mappedPlan };
      })
      .filter((x: { sub: Stripe.Subscription; priceId: string | undefined; mappedPlan: string | undefined }) => !!x.mappedPlan);

    const hasActiveSub = candidateSubs.length > 0;
    let plan = "free";
    let subscriptionEnd: string | null = null;
    let searchesLimit = PLAN_LIMITS["free"];

    if (hasActiveSub) {
      // Pick the best plan (highest tier). If tie, pick the one with latest period end.
      let best = candidateSubs[0];
      for (const c of candidateSubs) {
        const cOrder = getPlanOrder(c.mappedPlan as string);
        const bestOrder = getPlanOrder(best.mappedPlan as string);

        if (cOrder > bestOrder) {
          best = c;
          continue;
        }

        if (cOrder === bestOrder) {
          const cEnd = typeof c.sub.current_period_end === 'number' ? c.sub.current_period_end : 0;
          const bEnd = typeof best.sub.current_period_end === 'number' ? best.sub.current_period_end : 0;
          if (cEnd > bEnd) best = c;
        }
      }

      const subscription = best.sub;
      const priceId = best.priceId as string;
      plan = best.mappedPlan as string;
      const basePlanLimit = PLAN_LIMITS[plan] || PLAN_LIMITS["free"];

      // Safely handle subscription end date
      try {
        if (subscription.current_period_end && typeof subscription.current_period_end === 'number') {
          subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
        }
      } catch (dateError) {
        logStep("Warning: Could not parse subscription end date", {
          current_period_end: subscription.current_period_end,
        });
      }

      logStep("Active subscription(s) found", {
        activeCount: candidateSubs.length,
        chosenSubscriptionId: subscription.id,
        priceId,
        plan,
        endDate: subscriptionEnd,
      });

      // Calculate new limit with carry-over if upgrading
      if (currentProfile) {
        if (currentProfile.plan !== plan || currentProfile.searches_limit < basePlanLimit) {
          const { newLimit, carryOver } = calculateNewSearchesLimit(
            currentProfile.searches_used,
            currentProfile.searches_limit,
            basePlanLimit
          );
          searchesLimit = newLimit;

          logStep("Calculated new searches limit with carry-over", {
            currentSearchesUsed: currentProfile.searches_used,
            currentSearchesLimit: currentProfile.searches_limit,
            basePlanLimit,
            carryOver,
            newLimit: searchesLimit,
          });
        } else {
          searchesLimit = currentProfile.searches_limit;
        }
      } else {
        searchesLimit = basePlanLimit;
      }

      // Update user profile with new plan and limits
      const { error: updateError } = await supabaseClient
        .from('profiles')
        .update({
          plan: plan,
          searches_limit: searchesLimit,
        })
        .eq('id', user.id);

      if (updateError) {
        logStep("Error updating profile", { error: updateError.message });
      } else {
        logStep("Profile updated", { plan, searchesLimit });
      }
    } else {
      logStep("No active subscription found in Stripe");
      
      // IMPORTANT: Do NOT reset to free here!
      // The webhook is the source of truth for plan changes.
      // This function should only READ subscription status, not WRITE plan changes.
      // If we reset here, it can cause race conditions during upgrades where:
      // 1. Webhook sets the new plan
      // 2. Old subscription is canceled
      // 3. This function runs before Stripe fully propagates the new subscription
      // 4. This function would incorrectly reset to free
      
      // Instead, trust the current profile state
      plan = currentProfile?.plan || "free";
      searchesLimit = currentProfile?.searches_limit || PLAN_LIMITS["free"];
      
      logStep("Keeping current profile state (webhook is source of truth)", {
        plan,
        searchesLimit
      });
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      plan: plan,
      searches_limit: searchesLimit,
      subscription_end: subscriptionEnd
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
