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

// Map price IDs to plan names
const PRICE_TO_PLAN: Record<string, string> = {
  "price_1SkEsEK8CM0R6xMM9Y1ip21w": "start",
  "price_1SkEsZK8CM0R6xMMr0B2gEP1": "growth",
  "price_1SkEsoK8CM0R6xMMF72J3hAi": "scale",
};

// Map plan names to search limits
const PLAN_LIMITS: Record<string, number> = {
  "free": 10,
  "start": 100,
  "growth": 500,
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
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
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
            .select("id")
            .eq("email", customerEmail)
            .maybeSingle();

          if (profile) {
            logStep("Found user profile", { userId: profile.id, email: customerEmail });
            
            // Get subscription details from the session
            if (session.subscription) {
              const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
              const priceId = subscription.items.data[0]?.price.id;
              const plan = PRICE_TO_PLAN[priceId] || "free";
              const searchesLimit = PLAN_LIMITS[plan] || PLAN_LIMITS["free"];

              const { error: updateError } = await supabaseClient
                .from("profiles")
                .update({ 
                  plan: plan,
                  searches_limit: searchesLimit
                })
                .eq("id", profile.id);

              if (updateError) {
                logStep("Error updating profile", { error: updateError.message });
              } else {
                logStep("Profile updated successfully", { plan, searchesLimit });
              }
            }
          } else {
            logStep("No user found for email", { email: customerEmail });
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
            .select("id")
            .eq("email", customer.email)
            .maybeSingle();

          if (profile) {
            if (subscription.status === "active") {
              const priceId = subscription.items.data[0]?.price.id;
              const plan = PRICE_TO_PLAN[priceId] || "free";
              const searchesLimit = PLAN_LIMITS[plan] || PLAN_LIMITS["free"];

              await supabaseClient
                .from("profiles")
                .update({ 
                  plan: plan,
                  searches_limit: searchesLimit
                })
                .eq("id", profile.id);

              logStep("Profile updated for active subscription", { plan, searchesLimit });
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
