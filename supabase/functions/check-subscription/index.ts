import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Map price IDs to plan names - includes all historical price IDs
const PRICE_TO_PLAN: Record<string, string> = {
  // New prices (2026)
  "price_1TLZi1K8CM0R6xMMDOg3MSTp": "start",   // R$296/month
  "price_1TLZkSK8CM0R6xMMwr1Ke1IX": "start",   // R$246/month (annual)
  "price_1TLZlSK8CM0R6xMMFtvROCby": "growth",  // R$696/month
  "price_1TLZn8K8CM0R6xMMaEz5JuVW": "growth",  // R$596/month (annual)
  "price_1SlylcK8CM0R6xMMyHRWAd8G": "scale",   // R$897/month
  // Legacy prices - must be mapped for existing subscriptions
  "price_1SlykAK8CM0R6xMMOCM684rz": "start",   // R$197/month (legacy)
  "price_1SlykkK8CM0R6xMMZu7WJesV": "growth",  // R$497/month (legacy)
  "price_1SXrv7K8CM0R6xMMo4FlSVIk": "start",   // R$67/year (legacy)
  "price_1SXruNK8CM0R6xMMVD8Gksi4": "start",   // R$9.90/month (legacy)
  "price_1SZj5bK8CM0R6xMMFocrHWkj": "start",   // R$29.90/month (legacy)
  "price_1Sc1ehK8CM0R6xMMg1Z0kqCk": "start",   // R$39.90/month (legacy)
  "price_1SZj4hK8CM0R6xMMSZjjoEkN": "growth",  // R$249.90/year (legacy)
  "price_1SkEsEK8CM0R6xMM9Y1ip21w": "start",   // R$97/month (legacy)
  "price_1SkEsoK8CM0R6xMMF72J3hAi": "growth",  // R$497/month (legacy)
};

// Map plan names to opportunity limits (each lead = 1 opportunity)
const PLAN_LIMITS: Record<string, number> = {
  "free": 10,
  "start": 1000,
  "growth": 3000,
  "scale": 10000,
};

const PLAN_NAME_TO_KEY: Record<string, string> = {
  "Wiize Start": "start",
  "Wiize Growth": "growth",
  "Wiize Scale": "scale",
};

interface BillingProfileState {
  plan?: string;
  searches_limit?: number;
  searches_used?: number;
  admin_assigned_plan?: boolean;
  subscription_current_period_end?: string | null;
  trial_will_charge_at?: string | null;
  trial_auto_charge_cancelled?: boolean | null;
  trial_plan_chosen?: string | null;
}

const getActiveTrialAccess = (profile?: BillingProfileState | null) => {
  if (!profile?.trial_will_charge_at) return null;

  const trialPlan = profile.trial_plan_chosen;
  if (!trialPlan || !(trialPlan in PLAN_LIMITS) || trialPlan === "free") return null;

  const endsAt = new Date(profile.trial_will_charge_at);
  if (Number.isNaN(endsAt.getTime()) || endsAt.getTime() <= Date.now()) return null;

  return {
    plan: trialPlan,
    searchesLimit: PLAN_LIMITS[trialPlan],
    subscriptionEnd: endsAt.toISOString(),
  };
};

async function ensureProfileAndApplyPendingCheckout(
  supabaseClient: ReturnType<typeof createClient>,
  userId: string,
  userEmail: string,
) {
  const { data: existingProfile } = await supabaseClient
    .from("profiles")
    .select("id, email, searches_used, searches_limit, plan, admin_assigned_plan, subscription_current_period_end, trial_will_charge_at, trial_auto_charge_cancelled, trial_plan_chosen")
    .eq("id", userId)
    .maybeSingle();

  if (existingProfile) {
    return existingProfile as BillingProfileState;
  }

  logStep("Profile missing, recreating from auth user", { userId, email: userEmail });

  const { data: authUserData, error: authUserError } = await supabaseClient.auth.admin.getUserById(userId);
  if (authUserError) {
    throw new Error(`Failed to load auth user: ${authUserError.message}`);
  }

  const metadata = authUserData.user?.user_metadata ?? {};
  const nowIso = new Date().toISOString();

  const { error: insertError } = await supabaseClient.from("profiles").insert({
    id: userId,
    email: userEmail,
    name: typeof metadata.name === "string" && metadata.name.trim() ? metadata.name.trim() : userEmail,
    signup_ip: typeof metadata.signup_ip === "string" ? metadata.signup_ip : null,
    device_fingerprint: typeof metadata.device_fingerprint === "string" ? metadata.device_fingerprint : null,
    terms_accepted_at: metadata.terms_accepted === "true" ? nowIso : null,
  });

  if (insertError && !insertError.message.toLowerCase().includes("duplicate")) {
    throw new Error(`Failed to recreate profile: ${insertError.message}`);
  }

  const { data: checkoutLeads } = await supabaseClient
    .from("checkout_leads")
    .select("id, user_id, plan_attempted, checkout_completed, checkout_completed_at")
    .eq("email", userEmail)
    .order("checkout_completed_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  const completedLead = (checkoutLeads || []).find(
    (lead) => lead.checkout_completed && (!lead.user_id || lead.user_id === userId),
  );

  if (completedLead) {
    const planKey = PLAN_NAME_TO_KEY[completedLead.plan_attempted] || "start";
    const subscriptionEnd = new Date();
    subscriptionEnd.setDate(subscriptionEnd.getDate() + 30);

    logStep("Applying pending completed checkout to recreated profile", {
      userId,
      planKey,
      checkoutLeadId: completedLead.id,
    });

    const { error: profileUpdateError } = await supabaseClient
      .from("profiles")
      .update({
        plan: planKey,
        searches_limit: PLAN_LIMITS[planKey] || PLAN_LIMITS.free,
        searches_used: 0,
        subscription_current_period_end: subscriptionEnd.toISOString(),
        updated_at: nowIso,
      })
      .eq("id", userId);

    if (profileUpdateError) {
      throw new Error(`Failed to apply pending checkout: ${profileUpdateError.message}`);
    }

    await supabaseClient
      .from("checkout_leads")
      .update({ user_id: userId, updated_at: nowIso })
      .eq("id", completedLead.id);
  }

  const { data: profileAfterRecovery } = await supabaseClient
    .from("profiles")
    .select("id, email, searches_used, searches_limit, plan, admin_assigned_plan, subscription_current_period_end, trial_will_charge_at, trial_auto_charge_cancelled, trial_plan_chosen")
    .eq("id", userId)
    .maybeSingle();

  return (profileAfterRecovery as BillingProfileState | null) ?? null;
}

async function reconcileCompletedPixCheckout(
  supabaseClient: ReturnType<typeof createClient>,
  userId: string,
  userEmail: string,
  currentProfile: BillingProfileState,
) {
  const { data: checkoutLeads } = await supabaseClient
    .from("checkout_leads")
    .select("id, user_id, plan_attempted, checkout_completed_at, stripe_session_id")
    .eq("email", userEmail)
    .eq("checkout_completed", true)
    .order("checkout_completed_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  const completedPixLead = (checkoutLeads || []).find((lead) => {
    const checkoutId = lead.stripe_session_id || "";
    const isPixCheckout = checkoutId.startsWith("abacate_sub_") || checkoutId.startsWith("abacate_pix_") || checkoutId.startsWith("abacate_renewal_") || checkoutId.startsWith("asaas_sub_");
    return isPixCheckout && !lead.user_id;
  });

  if (!completedPixLead) {
    return currentProfile;
  }

  const trialAccess = getActiveTrialAccess(currentProfile);
  if (trialAccess) {
    return {
      ...currentProfile,
      plan: trialAccess.plan,
      searches_limit: trialAccess.searchesLimit,
      subscription_current_period_end: trialAccess.subscriptionEnd,
    };
  }

  const currentPeriodEnd = currentProfile.subscription_current_period_end
    ? new Date(currentProfile.subscription_current_period_end)
    : null;

  if (currentProfile.plan && currentProfile.plan !== "free" && currentPeriodEnd && currentPeriodEnd > new Date()) {
    return currentProfile;
  }

  const planKey = PLAN_NAME_TO_KEY[completedPixLead.plan_attempted] || "start";
  const subscriptionEnd = new Date();
  subscriptionEnd.setDate(subscriptionEnd.getDate() + 30);

  logStep("Reconciling completed PIX checkout with profile", {
    userId,
    email: userEmail,
    checkoutLeadId: completedPixLead.id,
    planKey,
  });

  const { error: updateError } = await supabaseClient
    .from("profiles")
    .update({
      plan: planKey,
      searches_limit: PLAN_LIMITS[planKey] || PLAN_LIMITS.free,
      searches_used: 0,
      subscription_current_period_end: subscriptionEnd.toISOString(),
      payment_provider: "asaas",
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (updateError) {
    throw new Error(`Failed to reconcile PIX checkout: ${updateError.message}`);
  }

  await supabaseClient
    .from("checkout_leads")
    .update({ user_id: userId, updated_at: new Date().toISOString() })
    .eq("id", completedPixLead.id);

  const { data: updatedProfile } = await supabaseClient
    .from("profiles")
    .select("searches_used, searches_limit, plan, admin_assigned_plan, subscription_current_period_end, trial_will_charge_at, trial_auto_charge_cancelled, trial_plan_chosen")
    .eq("id", userId)
    .maybeSingle();

  return (updatedProfile as BillingProfileState | null) || currentProfile;
}

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
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new Error("No authorization header provided");
    }
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    
    // Try getClaims first (faster, doesn't require network call)
    let userId: string;
    let userEmail: string;
    
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims?.sub || !claimsData?.claims?.email) {
      // Fallback to getUser if getClaims fails
      logStep("getClaims failed, falling back to getUser", { error: claimsError?.message });
      const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
      if (userError) throw new Error(`Authentication error: ${userError.message}`);
      if (!userData.user?.email) throw new Error("User not authenticated or email not available");
      
      userId = userData.user.id;
      userEmail = userData.user.email;
      logStep("User authenticated via getUser", { userId, email: userEmail });
    } else {
      userId = claimsData.claims.sub as string;
      userEmail = claimsData.claims.email as string;
      logStep("User authenticated via getClaims", { userId, email: userEmail });
    }

    const { data: existingProfile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('searches_used, searches_limit, plan, admin_assigned_plan, subscription_current_period_end, trial_will_charge_at, trial_auto_charge_cancelled, trial_plan_chosen')
      .eq('id', userId)
      .maybeSingle();

    let currentProfile = (existingProfile as BillingProfileState | null) ?? null;

    if (profileError) {
      logStep("Error loading profile, attempting recovery", { error: profileError.message });
    }

    if (!currentProfile) {
      currentProfile = await ensureProfileAndApplyPendingCheckout(supabaseClient, userId, userEmail);
    }

    if (currentProfile) {
      currentProfile = await reconcileCompletedPixCheckout(supabaseClient, userId, userEmail, currentProfile);
    }

    if (!currentProfile) {
      logStep("Profile recovery failed, creating minimal response");
      return new Response(JSON.stringify({ 
        subscribed: false, 
        plan: "free",
        searches_limit: PLAN_LIMITS["free"]
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const activeTrialAccess = getActiveTrialAccess(currentProfile);

    if (activeTrialAccess) {
      const needsTrialRestore =
        currentProfile.plan !== activeTrialAccess.plan ||
        currentProfile.searches_limit !== activeTrialAccess.searchesLimit ||
        currentProfile.subscription_current_period_end !== activeTrialAccess.subscriptionEnd;

      if (needsTrialRestore) {
        const { error: trialRestoreError } = await supabaseClient
          .from('profiles')
          .update({
            plan: activeTrialAccess.plan,
            searches_limit: activeTrialAccess.searchesLimit,
            subscription_current_period_end: activeTrialAccess.subscriptionEnd,
          })
          .eq('id', userId);

        if (trialRestoreError) {
          logStep("Error restoring active trial access", { error: trialRestoreError.message });
        } else {
          logStep("Restored active trial access", activeTrialAccess);
          currentProfile = {
            ...currentProfile,
            plan: activeTrialAccess.plan,
            searches_limit: activeTrialAccess.searchesLimit,
            subscription_current_period_end: activeTrialAccess.subscriptionEnd,
          };
        }
      }
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found in Stripe");

      if (activeTrialAccess) {
        logStep("Keeping active trial without Stripe customer", activeTrialAccess);
        return new Response(JSON.stringify({ 
          subscribed: false,
          plan: activeTrialAccess.plan,
          searches_limit: activeTrialAccess.searchesLimit,
          subscription_end: activeTrialAccess.subscriptionEnd,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      
      // If user has a paid plan but no Stripe customer, check if they're on Asaas/PIX
      if (currentProfile.plan && currentProfile.plan !== "free") {
        if (currentProfile.admin_assigned_plan) {
          logStep("Skipping downgrade - admin assigned plan", { 
            plan: currentProfile.plan 
          });
          
          return new Response(JSON.stringify({ 
            subscribed: true, 
            plan: currentProfile.plan,
            searches_limit: currentProfile.searches_limit
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }
        
        const subEnd = currentProfile.subscription_current_period_end 
          ? new Date(currentProfile.subscription_current_period_end) 
          : null;
        
        if (subEnd && subEnd > new Date()) {
          logStep("Subscription still valid (non-Stripe provider, likely Asaas)", { 
            plan: currentProfile.plan,
            expiresAt: subEnd.toISOString()
          });
          
          return new Response(JSON.stringify({ 
            subscribed: true, 
            plan: currentProfile.plan,
            searches_limit: currentProfile.searches_limit,
            subscription_end: subEnd.toISOString()
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }
        
        logStep("Downgrading user with no Stripe customer and expired subscription", { 
          previousPlan: currentProfile.plan 
        });
        
        await supabaseClient
          .from('profiles')
          .update({
            plan: "free",
            searches_limit: PLAN_LIMITS["free"],
            searches_used: 0,
            subscription_current_period_end: null,
          })
          .eq('id', userId);
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

    const candidateSubs = subscriptions.data
      .map((sub: Stripe.Subscription) => {
        const priceId = sub.items.data[0]?.price?.id;
        const mappedPlan = priceId ? PRICE_TO_PLAN[priceId] : undefined;
        return { sub, priceId, mappedPlan };
      })
      .filter((x: { sub: Stripe.Subscription; priceId: string | undefined; mappedPlan: string | undefined }) => !!x.mappedPlan);

    const hasActiveSub = candidateSubs.length > 0;
    let plan = activeTrialAccess?.plan ?? "free";
    let subscriptionEnd: string | null = activeTrialAccess?.subscriptionEnd ?? null;
    let searchesLimit = activeTrialAccess?.searchesLimit ?? PLAN_LIMITS["free"];

    if (hasActiveSub) {
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

      if (currentProfile) {
        if (currentProfile.plan !== plan || (currentProfile.searches_limit ?? 0) < basePlanLimit) {
          const { newLimit, carryOver } = calculateNewSearchesLimit(
            currentProfile.searches_used ?? 0,
            currentProfile.searches_limit ?? PLAN_LIMITS["free"],
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
          searchesLimit = currentProfile.searches_limit ?? basePlanLimit;
        }
      } else {
        searchesLimit = basePlanLimit;
      }

      const { error: updateError } = await supabaseClient
        .from('profiles')
        .update({
          plan: plan,
          searches_limit: searchesLimit,
          subscription_current_period_end: subscriptionEnd,
        })
        .eq('id', userId);

      if (updateError) {
        logStep("Error updating profile", { error: updateError.message });
      } else {
        logStep("Profile updated", { plan, searchesLimit, subscriptionEnd });
      }
    } else {
      logStep("No active subscription found in Stripe");
      
      if (activeTrialAccess) {
        plan = activeTrialAccess.plan;
        searchesLimit = activeTrialAccess.searchesLimit;
        subscriptionEnd = activeTrialAccess.subscriptionEnd;
        logStep("Keeping plan - active trial window still valid", activeTrialAccess);
      } else if (currentProfile?.plan && currentProfile.plan !== "free") {
        if (currentProfile.admin_assigned_plan) {
          logStep("Skipping downgrade - admin assigned plan", { 
            plan: currentProfile.plan 
          });
          plan = currentProfile.plan;
          searchesLimit = currentProfile.searches_limit ?? PLAN_LIMITS[currentProfile.plan] ?? PLAN_LIMITS.free;
        } else {
          const allSubs = await stripe.subscriptions.list({
            customer: customerId,
            limit: 10,
          });
          
          const hasAnySub = allSubs.data.some((s: Stripe.Subscription) => 
            ["active", "trialing", "incomplete"].includes(s.status)
          );
          
          if (!hasAnySub) {
            plan = "free";
            searchesLimit = PLAN_LIMITS["free"];

            const { error: downgradeError } = await supabaseClient
              .from('profiles')
              .update({
                plan: "free",
                searches_limit: PLAN_LIMITS["free"],
                searches_used: 0,
                subscription_current_period_end: null,
              })
              .eq('id', userId);

            if (downgradeError) {
              logStep("Error downgrading profile", { error: downgradeError.message });
            } else {
              logStep("Profile downgraded to free - no active subscription in Stripe", {
                previousPlan: currentProfile.plan,
                previousLimit: currentProfile.searches_limit,
              });
            }
          } else {
            plan = currentProfile.plan;
            searchesLimit = currentProfile.searches_limit ?? PLAN_LIMITS[currentProfile.plan] ?? PLAN_LIMITS.free;
            subscriptionEnd = currentProfile.subscription_current_period_end ?? null;
            logStep("Keeping current plan - found non-canceled subscription", {
              plan,
              statuses: allSubs.data.map((s: Stripe.Subscription) => s.status),
            });
          }
        }
      } else {
        plan = "free";
        searchesLimit = PLAN_LIMITS["free"];
        logStep("User is already on free plan");
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
