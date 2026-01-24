/**
 * =============================================================================
 * sync-stripe-subscriptions - Sincroniza assinaturas do Stripe com profiles
 * =============================================================================
 * 
 * Esta função permite sincronizar manualmente usuários criados após migração
 * de banco de dados com suas assinaturas existentes no Stripe.
 * 
 * USO:
 * - POST /sync-stripe-subscriptions (admin only)
 * - Body: { emails?: string[] } - opcional, sincroniza todos se vazio
 * 
 * FLUXO:
 * 1. Busca todos os profiles (ou filtrados por email)
 * 2. Para cada profile, verifica se existe assinatura ativa no Stripe
 * 3. Atualiza o profile com o plano correto
 * 4. Retorna relatório de sincronização
 * 
 * =============================================================================
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SYNC-STRIPE] ${step}${detailsStr}`);
};

// Map price IDs to plan names
const PRICE_TO_PLAN: Record<string, string> = {
  // Current prices
  "price_1SlykAK8CM0R6xMMOCM684rz": "start",
  "price_1SlykkK8CM0R6xMMZu7WJesV": "growth",
  "price_1SlylcK8CM0R6xMMyHRWAd8G": "scale",
  // Legacy prices
  "price_1SXrv7K8CM0R6xMMo4FlSVIk": "start",
  "price_1SXruNK8CM0R6xMMVD8Gksi4": "start",
  "price_1SZj5bK8CM0R6xMMFocrHWkj": "start",
  "price_1Sc1ehK8CM0R6xMMg1Z0kqCk": "start",
  "price_1SZj4hK8CM0R6xMMSZjjoEkN": "growth",
  "price_1SkEsEK8CM0R6xMM9Y1ip21w": "start",
  "price_1SkEsoK8CM0R6xMMF72J3hAi": "growth",
};

const PLAN_LIMITS: Record<string, number> = {
  "free": 10,
  "start": 200,
  "growth": 600,
  "scale": 1200,
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
    logStep("Sync started");

    // Verify admin access
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization required");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      throw new Error("Authentication failed");
    }

    // Check if user is admin
    const { data: roleData } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      throw new Error("Admin access required");
    }

    logStep("Admin verified", { userId: userData.user.id });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get request body (optional email filter)
    let emailFilter: string[] | null = null;
    try {
      const body = await req.json();
      if (body.emails && Array.isArray(body.emails)) {
        emailFilter = body.emails;
      }
    } catch {
      // No body or invalid JSON - sync all
    }

    // Fetch profiles to sync
    let query = supabaseClient
      .from('profiles')
      .select('id, email, plan, searches_limit, searches_used');

    if (emailFilter && emailFilter.length > 0) {
      query = query.in('email', emailFilter);
    }

    const { data: profiles, error: profilesError } = await query;

    if (profilesError) {
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
    }

    logStep("Fetched profiles", { count: profiles?.length });

    const results: Array<{
      email: string;
      status: 'synced' | 'no_subscription' | 'already_correct' | 'error';
      previousPlan?: string;
      newPlan?: string;
      message?: string;
    }> = [];

    for (const profile of profiles || []) {
      try {
        // Search for Stripe customer by email
        const customers = await stripe.customers.list({
          email: profile.email,
          limit: 1,
        });

        if (customers.data.length === 0) {
          results.push({
            email: profile.email,
            status: 'no_subscription',
            message: 'No Stripe customer found',
          });
          continue;
        }

        const customerId = customers.data[0].id;

        // Get active subscriptions
        const subscriptions = await stripe.subscriptions.list({
          customer: customerId,
          status: 'active',
          limit: 10,
        });

        if (subscriptions.data.length === 0) {
          // Check for canceled/past_due subscriptions
          const allSubs = await stripe.subscriptions.list({
            customer: customerId,
            limit: 10,
          });

          if (allSubs.data.length > 0 && profile.plan !== 'free') {
            // Has subscription history but no active - should be free
            await supabaseClient
              .from('profiles')
              .update({
                plan: 'free',
                searches_limit: PLAN_LIMITS.free,
              })
              .eq('id', profile.id);

            results.push({
              email: profile.email,
              status: 'synced',
              previousPlan: profile.plan,
              newPlan: 'free',
              message: 'Subscription expired/canceled - reset to free',
            });
          } else {
            results.push({
              email: profile.email,
              status: 'no_subscription',
              message: 'No active subscription',
            });
          }
          continue;
        }

        // Find best subscription (highest tier)
        let bestPlan = 'free';
        let bestPriceId = '';
        let subscriptionEnd: string | null = null;

        for (const sub of subscriptions.data) {
          const priceId = sub.items.data[0]?.price?.id;
          const mappedPlan = priceId ? PRICE_TO_PLAN[priceId] : undefined;

          if (mappedPlan) {
            const planOrder: Record<string, number> = {
              free: 0, start: 1, growth: 2, scale: 3
            };

            if (planOrder[mappedPlan] > planOrder[bestPlan]) {
              bestPlan = mappedPlan;
              bestPriceId = priceId;
              if (sub.current_period_end) {
                subscriptionEnd = new Date(sub.current_period_end * 1000).toISOString();
              }
            }
          }
        }

        if (bestPlan === 'free') {
          results.push({
            email: profile.email,
            status: 'no_subscription',
            message: 'No recognized subscription price found',
          });
          continue;
        }

        // Check if profile already matches
        const expectedLimit = PLAN_LIMITS[bestPlan] || PLAN_LIMITS.free;
        
        if (profile.plan === bestPlan && profile.searches_limit >= expectedLimit) {
          results.push({
            email: profile.email,
            status: 'already_correct',
            previousPlan: profile.plan,
            newPlan: bestPlan,
          });
          continue;
        }

        // Update profile
        const newLimit = Math.max(expectedLimit, profile.searches_limit);

        await supabaseClient
          .from('profiles')
          .update({
            plan: bestPlan,
            searches_limit: newLimit,
            subscription_current_period_end: subscriptionEnd,
          })
          .eq('id', profile.id);

        results.push({
          email: profile.email,
          status: 'synced',
          previousPlan: profile.plan,
          newPlan: bestPlan,
          message: `Updated to ${bestPlan} with ${newLimit} searches`,
        });

        logStep("Profile synced", {
          email: profile.email,
          previousPlan: profile.plan,
          newPlan: bestPlan,
        });

      } catch (error) {
        results.push({
          email: profile.email,
          status: 'error',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const summary = {
      total: results.length,
      synced: results.filter(r => r.status === 'synced').length,
      alreadyCorrect: results.filter(r => r.status === 'already_correct').length,
      noSubscription: results.filter(r => r.status === 'no_subscription').length,
      errors: results.filter(r => r.status === 'error').length,
    };

    logStep("Sync completed", summary);

    return new Response(JSON.stringify({
      success: true,
      summary,
      results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
