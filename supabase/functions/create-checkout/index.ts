import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const { priceId, couponCode, guestEmail } = await req.json();
    if (!priceId) throw new Error("Price ID is required");
    logStep("Request data received", { priceId, hasCoupon: !!couponCode, guestEmail });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
      apiVersion: "2025-08-27.basil" 
    });

    const origin = req.headers.get("origin") || "https://leadspro.lovable.app";
    
    // Check if user is authenticated
    const authHeader = req.headers.get("Authorization");
    let userEmail: string | null = null;
    let customerId: string | undefined;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabaseClient.auth.getUser(token);
      const user = data.user;
      
      if (user?.email) {
        userEmail = user.email;
        logStep("User authenticated", { userId: user.id, email: userEmail });

        // Check if customer already exists in Stripe
        const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
        if (customers.data.length > 0) {
          customerId = customers.data[0].id;
          logStep("Found existing customer", { customerId });
        }
      }
    }

    // Use guest email if no authenticated user
    if (!userEmail && guestEmail) {
      userEmail = guestEmail;
      logStep("Using guest email", { email: guestEmail });
      
      // Check if customer already exists in Stripe for guest
      const customers = await stripe.customers.list({ email: guestEmail, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        logStep("Found existing customer for guest", { customerId });
      }
    }

    // Build checkout session options
    const sessionOptions: Stripe.Checkout.SessionCreateParams = {
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${origin}/checkout-success`,
      cancel_url: `${origin}/#pricing`,
      allow_promotion_codes: true,
    };

    // If user is logged in or guest email provided, use their email
    if (customerId) {
      sessionOptions.customer = customerId;
    } else if (userEmail) {
      sessionOptions.customer_email = userEmail;
    }
    // If no email provided, Stripe Checkout will collect it

    // Apply coupon code if provided
    if (couponCode) {
      try {
        // Verify the coupon exists
        const coupon = await stripe.coupons.retrieve(couponCode);
        if (coupon && coupon.valid) {
          sessionOptions.discounts = [{ coupon: couponCode }];
          // Remove allow_promotion_codes when using discounts
          delete sessionOptions.allow_promotion_codes;
          logStep("Coupon applied", { couponId: coupon.id, percentOff: coupon.percent_off });
        }
      } catch (couponError) {
        logStep("Invalid coupon code", { couponCode });
        // Continue without the coupon
      }
    }

    const session = await stripe.checkout.sessions.create(sessionOptions);
    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
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
