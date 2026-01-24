import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-STRIPE-WHITELIST] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      logStep("STRIPE_SECRET_KEY not set, returning not whitelisted");
      return new Response(
        JSON.stringify({ whitelisted: false, reason: "stripe_not_configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const { email } = await req.json();
    if (!email) {
      return new Response(
        JSON.stringify({ whitelisted: false, reason: "no_email_provided" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    logStep("Checking email", { email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check if customer exists in Stripe
    const customers = await stripe.customers.list({ email: email.toLowerCase(), limit: 1 });

    if (customers.data.length === 0) {
      logStep("No Stripe customer found for email");
      return new Response(
        JSON.stringify({ whitelisted: false, reason: "not_stripe_customer" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Check for any subscription (active, past_due, or even canceled - they paid at some point)
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 10,
    });

    // Check if they have any subscription (even canceled means they were a paying customer)
    const hasAnySubscription = subscriptions.data.length > 0;
    
    // Also check for successful payments (one-time or subscription)
    const payments = await stripe.paymentIntents.list({
      customer: customerId,
      limit: 5,
    });
    
    const hasSuccessfulPayment = payments.data.some((p: { status: string }) => p.status === "succeeded");

    const isWhitelisted = hasAnySubscription || hasSuccessfulPayment;

    logStep("Whitelist check result", { 
      customerId, 
      hasAnySubscription, 
      hasSuccessfulPayment, 
      isWhitelisted 
    });

    return new Response(
      JSON.stringify({ 
        whitelisted: isWhitelisted,
        reason: isWhitelisted ? "stripe_paying_customer" : "no_payment_history",
        customer_id: customerId
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    // On error, don't block - return not whitelisted but allow signup to continue
    return new Response(
      JSON.stringify({ whitelisted: false, reason: "check_error", error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }
});
