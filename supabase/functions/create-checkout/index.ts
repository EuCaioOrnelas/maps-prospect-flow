import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

function getClientIP(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
         req.headers.get('x-real-ip') || 
         'unknown';
}

async function checkRateLimit(
  supabase: any, 
  identifier: string, 
  endpoint: string,
  maxRequests: number = 10,
  windowSeconds: number = 60
): Promise<{ allowed: boolean; retryAfter?: number }> {
  try {
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_identifier: identifier,
      p_endpoint: endpoint,
      p_max_requests: maxRequests,
      p_window_seconds: windowSeconds
    });
    
    if (error) {
      console.error('Rate limit check error:', error);
      return { allowed: true };
    }
    
    return { 
      allowed: data?.allowed !== false,
      retryAfter: data?.retry_after
    };
  } catch (e) {
    console.error('Rate limit exception:', e);
    return { allowed: true };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const clientIP = getClientIP(req);
  const rateLimitResult = await checkRateLimit(supabaseClient, clientIP, 'create-checkout', 10, 60);
  
  if (!rateLimitResult.allowed) {
    logStep("Rate limit exceeded", { ip: clientIP });
    return new Response(
      JSON.stringify({ 
        error: "Muitas requisições. Tente novamente em alguns segundos.",
        retryAfter: rateLimitResult.retryAfter
      }),
      { 
        status: 429, 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json",
          "Retry-After": String(rateLimitResult.retryAfter || 60)
        } 
      }
    );
  }

  try {
    logStep("Function started");

    const { priceId, couponCode, guestEmail } = await req.json();
    if (!priceId) throw new Error("Price ID is required");
    logStep("Request data received", { priceId, hasCoupon: !!couponCode, guestEmail });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
      apiVersion: "2023-10-16" 
    });

    const origin = req.headers.get("origin") || "https://leadspro.lovable.app";
    
    const authHeader = req.headers.get("Authorization");
    let userEmail: string | null = null;
    let userId: string | null = null;
    let customerId: string | undefined;
    let userName: string | null = null;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabaseClient.auth.getUser(token);
      const user = data.user;
      
      if (user?.email) {
        userEmail = user.email;
        userId = user.id;
        logStep("User authenticated", { userId: user.id, email: userEmail });

        // Get user name from profile
        const { data: profile } = await supabaseClient
          .from('profiles')
          .select('name')
          .eq('id', user.id)
          .maybeSingle();
        userName = profile?.name || null;

        const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
        if (customers.data.length > 0) {
          customerId = customers.data[0].id;
          logStep("Found existing customer", { customerId });
        }
      }
    }

    if (!userEmail && guestEmail) {
      userEmail = guestEmail;
      logStep("Using guest email", { email: guestEmail });
      
      const customers = await stripe.customers.list({ email: guestEmail, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        logStep("Found existing customer for guest", { customerId });
      }
    }

    // Determine plan from priceId
    let planAttempted = 'unknown';
    try {
      const price = await stripe.prices.retrieve(priceId);
      const product = await stripe.products.retrieve(price.product as string);
      planAttempted = product.name || 'unknown';
    } catch (e) {
      logStep("Could not determine plan from price", { priceId });
    }

    const sessionOptions: Stripe.Checkout.SessionCreateParams = {
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/checkout-success`,
      cancel_url: `${origin}/checkout-failed`,
      allow_promotion_codes: true,
    };

    if (customerId) {
      sessionOptions.customer = customerId;
    } else if (userEmail) {
      sessionOptions.customer_email = userEmail;
    }

    if (couponCode) {
      try {
        const coupon = await stripe.coupons.retrieve(couponCode);
        if (coupon && coupon.valid) {
          sessionOptions.discounts = [{ coupon: couponCode }];
          delete sessionOptions.allow_promotion_codes;
          logStep("Coupon applied", { couponId: coupon.id, percentOff: coupon.percent_off });
        }
      } catch (_couponError) {
        try {
          const promoCodes = await stripe.promotionCodes.list({ code: couponCode, active: true, limit: 1 });
          if (promoCodes.data.length > 0) {
            const promoCode = promoCodes.data[0];
            sessionOptions.discounts = [{ promotion_code: promoCode.id }];
            delete sessionOptions.allow_promotion_codes;
            logStep("Promotion code applied", { promoCodeId: promoCode.id, code: couponCode });
          } else {
            logStep("No valid promotion code found", { couponCode });
          }
        } catch (promoError) {
          logStep("Failed to lookup promotion code", { couponCode, error: String(promoError) });
        }
      }
    }

    const session = await stripe.checkout.sessions.create(sessionOptions);
    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    // Track checkout lead in database
    if (userId && userEmail) {
      try {
        await supabaseClient
          .from('checkout_leads')
          .insert({
            user_id: userId,
            email: userEmail,
            name: userName,
            plan_attempted: planAttempted,
            stripe_session_id: session.id,
            checkout_started_at: new Date().toISOString(),
            checkout_completed: false,
          });
        logStep("Checkout lead tracked", { userId, planAttempted });
      } catch (e) {
        logStep("Failed to track checkout lead", { error: String(e) });
      }
    }

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
