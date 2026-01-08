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

// Map price IDs to plan names
const PRICE_TO_PLAN: Record<string, string> = {
  "price_1SlykAK8CM0R6xMMOCM684rz": "start",
  "price_1SlykkK8CM0R6xMMZu7WJesV": "growth",
  "price_1SlylcK8CM0R6xMMyHRWAd8G": "scale",
};

// Map plan names to search limits
const PLAN_LIMITS: Record<string, number> = {
  "free": 10,
  "start": 100,
  "growth": 500,
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
      limit: 1,
    });
    
    const hasActiveSub = subscriptions.data.length > 0;
    let plan = "free";
    let subscriptionEnd = null;
    let searchesLimit = PLAN_LIMITS["free"];

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      
      // Safely handle subscription end date
      try {
        if (subscription.current_period_end && typeof subscription.current_period_end === 'number') {
          subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
        }
      } catch (dateError) {
        logStep("Warning: Could not parse subscription end date", { 
          current_period_end: subscription.current_period_end 
        });
      }
      
      logStep("Active subscription found", { subscriptionId: subscription.id, endDate: subscriptionEnd });
      
      // Get the price ID from the subscription
      const priceId = subscription.items.data[0].price.id;
      plan = PRICE_TO_PLAN[priceId] || "free";
      const basePlanLimit = PLAN_LIMITS[plan] || PLAN_LIMITS["free"];
      logStep("Determined plan from price", { priceId, plan });

      // Calculate new limit with carry-over if upgrading
      if (currentProfile) {
        // Only calculate carry-over if this is a new subscription or upgrade
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
            newLimit: searchesLimit
          });
        } else {
          // Keep existing limit if already on this plan
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
          searches_limit: searchesLimit
        })
        .eq('id', user.id);

      if (updateError) {
        logStep("Error updating profile", { error: updateError.message });
      } else {
        logStep("Profile updated", { plan, searchesLimit });
      }
    } else {
      logStep("No active subscription found");
      
      // Reset to free plan if no active subscription
      const { error: updateError } = await supabaseClient
        .from('profiles')
        .update({ 
          plan: "free",
          searches_limit: PLAN_LIMITS["free"]
        })
        .eq('id', user.id);

      if (updateError) {
        logStep("Error resetting profile to free", { error: updateError.message });
      }
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
