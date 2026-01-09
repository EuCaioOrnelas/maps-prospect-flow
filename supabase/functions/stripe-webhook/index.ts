import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
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
  "start": 100,
  "growth": 500,
  "scale": 1200,
};

// Map plan names to prices (for tracking revenue)
const PLAN_PRICES: Record<string, number> = {
  "free": 0,
  "start": 97,
  "growth": 247,
  "scale": 497,
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

// Track purchase for landing page analytics
const trackPurchase = async (
  supabaseClient: any,
  userId: string,
  plan: string,
  amount: number
) => {
  try {
    // Get user's landing source
    const { data: source } = await supabaseClient
      .from('user_landing_source')
      .select('landing_page_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (source?.landing_page_id) {
      await supabaseClient.from('landing_page_events').insert({
        landing_page_id: source.landing_page_id,
        event_type: 'purchase',
        user_id: userId,
        metadata: { plan, amount },
      });
      logStep("Purchase tracked for landing page analytics", { userId, plan, amount });
    }
  } catch (error) {
    logStep("Error tracking purchase", { error: String(error) });
  }
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
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    let event: Stripe.Event;

    // Verify webhook signature if secret is configured
    if (webhookSecret && signature) {
      try {
        event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
        logStep("Webhook signature verified");
      } catch (err: any) {
        logStep("Webhook signature verification failed", { error: err.message });
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
    } else {
      // Parse event without verification (for testing)
      event = JSON.parse(body);
      logStep("Webhook parsed without signature verification (testing mode)");
    }

    logStep("Event received", { type: event.type, id: event.id });

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Checkout session completed", { 
          sessionId: session.id, 
          customerEmail: session.customer_email,
          customerId: session.customer 
        });

        // Get customer email
        let customerEmail = session.customer_email;
        if (!customerEmail && session.customer) {
          const customer = await stripe.customers.retrieve(session.customer as string);
          if (customer && !customer.deleted) {
            customerEmail = customer.email;
          }
        }

        if (customerEmail) {
          // Find user by email and update their subscription
          const { data: profile, error: profileError } = await supabaseClient
            .from("profiles")
            .select("id, searches_used, searches_limit, plan")
            .eq("email", customerEmail)
            .maybeSingle();

          if (profile) {
            logStep("Found user profile", { 
              userId: profile.id, 
              email: customerEmail,
              currentSearchesUsed: profile.searches_used,
              currentSearchesLimit: profile.searches_limit,
              currentPlan: profile.plan
            });
            
            // Get subscription details from the session
            if (session.subscription) {
              const newSubscription = await stripe.subscriptions.retrieve(session.subscription as string);
              const priceId = newSubscription.items.data[0]?.price.id;
              const plan = PRICE_TO_PLAN[priceId] || "free";
              const basePlanLimit = PLAN_LIMITS[plan] || PLAN_LIMITS["free"];

              // Calculate new limit with carry-over from previous plan
              const { newLimit, carryOver } = calculateNewSearchesLimit(
                profile.searches_used,
                profile.searches_limit,
                basePlanLimit
              );

              logStep("Calculating new searches limit", {
                basePlanLimit,
                carryOver,
                newLimit,
                plan
              });

              const { error: updateError } = await supabaseClient
                .from("profiles")
                .update({ 
                  plan: plan,
                  searches_limit: newLimit,
                  // Reset searches_used only if user had no remaining searches
                  // Otherwise keep current usage to properly calculate remaining
                  searches_used: carryOver > 0 ? profile.searches_used : 0
                })
                .eq("id", profile.id);

              if (updateError) {
                logStep("Error updating profile", { error: updateError.message });
              } else {
                logStep("Profile updated successfully", { 
                  plan, 
                  searchesLimit: newLimit,
                  carryOver,
                  searchesUsed: carryOver > 0 ? profile.searches_used : 0
                });

                // Track purchase for landing page analytics
                const amount = PLAN_PRICES[plan] || 0;
                await trackPurchase(supabaseClient, profile.id, plan, amount);
              }

              // Cancel any OTHER active subscriptions for this customer (upgrade scenario)
              // This ensures user only has one active subscription at a time
              if (session.customer) {
                const allSubs = await stripe.subscriptions.list({
                  customer: session.customer as string,
                  status: "active",
                  limit: 10,
                });

                for (const sub of allSubs.data) {
                  // Skip the subscription we just created
                  if (sub.id === session.subscription) continue;

                  logStep("Canceling old subscription after upgrade", {
                    oldSubscriptionId: sub.id,
                    newSubscriptionId: session.subscription,
                  });

                  await stripe.subscriptions.cancel(sub.id, {
                    prorate: true,
                  });
                }
              }
            }
          } else {
            logStep("No user found for email - subscription will be linked when user creates account", { email: customerEmail });
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription updated", { 
          subscriptionId: subscription.id, 
          status: subscription.status,
          customerId: subscription.customer 
        });

        // Get customer email
        const customer = await stripe.customers.retrieve(subscription.customer as string);
        if (customer && !customer.deleted && customer.email) {
          const { data: profile } = await supabaseClient
            .from("profiles")
            .select("id, searches_used, searches_limit, plan")
            .eq("email", customer.email)
            .maybeSingle();

          if (profile) {
            if (subscription.status === "active") {
              const priceId = subscription.items.data[0]?.price.id;
              const plan = PRICE_TO_PLAN[priceId] || "free";
              const basePlanLimit = PLAN_LIMITS[plan] || PLAN_LIMITS["free"];

              // Calculate new limit with carry-over
              const { newLimit, carryOver } = calculateNewSearchesLimit(
                profile.searches_used,
                profile.searches_limit,
                basePlanLimit
              );

              await supabaseClient
                .from("profiles")
                .update({ 
                  plan: plan,
                  searches_limit: newLimit,
                  searches_used: carryOver > 0 ? profile.searches_used : 0
                })
                .eq("id", profile.id);

              logStep("Profile updated for active subscription", { 
                plan, 
                searchesLimit: newLimit,
                carryOver
              });
            } else if (["canceled", "unpaid", "past_due"].includes(subscription.status)) {
              await supabaseClient
                .from("profiles")
                .update({ 
                  plan: "free",
                  searches_limit: PLAN_LIMITS["free"]
                })
                .eq("id", profile.id);

              logStep("Profile downgraded due to subscription status", { status: subscription.status });
            }
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription deleted", { 
          subscriptionId: subscription.id, 
          customerId: subscription.customer 
        });

        // Get customer email
        const customer = await stripe.customers.retrieve(subscription.customer as string);
        if (customer && !customer.deleted && customer.email) {
          const { data: profile } = await supabaseClient
            .from("profiles")
            .select("id")
            .eq("email", customer.email)
            .maybeSingle();

          if (profile) {
            await supabaseClient
              .from("profiles")
              .update({ 
                plan: "free",
                searches_limit: PLAN_LIMITS["free"]
              })
              .eq("id", profile.id);

            logStep("Profile downgraded to free after subscription deletion");
          }
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Invoice payment succeeded", { 
          invoiceId: invoice.id,
          subscriptionId: invoice.subscription,
          customerEmail: invoice.customer_email
        });
        // Subscription renewal handled by subscription.updated event
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Invoice payment failed", { 
          invoiceId: invoice.id,
          customerEmail: invoice.customer_email
        });
        // Handle failed payment - subscription.updated will handle status change
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in stripe-webhook", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
