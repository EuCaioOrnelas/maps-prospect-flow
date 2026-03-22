import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ABACATE_API = "https://api.abacatepay.com/v2";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ABACATE-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Plan config (prices in cents)
const PLAN_CONFIG: Record<string, { name: string; priceInCents: number }> = {
  start: { name: "Wiize Start", priceInCents: 19700 },
  growth: { name: "Wiize Growth", priceInCents: 49700 },
  scale: { name: "Wiize Scale", priceInCents: 89700 },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("ABACATE_PAY_API_KEY");
    if (!apiKey) throw new Error("ABACATE_PAY_API_KEY not configured");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { planKey, customerData, couponCode } = await req.json();
    if (!planKey || !customerData) throw new Error("planKey and customerData are required");

    const plan = PLAN_CONFIG[planKey];
    if (!plan) throw new Error(`Invalid plan: ${planKey}`);

    logStep("Request received", { planKey, email: customerData.email });

    // Authenticate user
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabaseClient.auth.getUser(token);
      if (data.user) {
        userId = data.user.id;
        logStep("User authenticated", { userId });
      }
    }

    if (!userId && customerData.email) {
      const { data: profileByEmail } = await supabaseClient
        .from("profiles")
        .select("id")
        .eq("email", customerData.email)
        .maybeSingle();
      if (profileByEmail) {
        userId = profileByEmail.id;
        logStep("User found by email", { userId });
      }
    }

    // Determine final price
    let finalPrice = plan.priceInCents;
    let discountApplied = false;

    // Apply coupon discount via AbacatePay v2 API
    if (couponCode) {
      try {
        // Check if user already redeemed this coupon
        const userEmail = customerData.email?.toLowerCase();
        if (userEmail) {
          const { data: existingRedemption } = await supabaseClient
            .from("coupon_redemptions")
            .select("id")
            .eq("email", userEmail)
            .eq("coupon_code", couponCode.toUpperCase())
            .maybeSingle();

          if (existingRedemption) {
            logStep("Coupon already redeemed by user", { couponCode, email: userEmail });
            // Skip coupon - proceed with full price
          } else {
            const couponRes = await fetch(`${ABACATE_API}/coupons/list`, {
              headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Accept": "application/json",
              },
            });
            const couponJson = await couponRes.json();
            const coupons = couponJson.data || [];
            const coupon = coupons.find(
              (c: any) => c.id?.toUpperCase() === couponCode.toUpperCase() && c.status === "ACTIVE"
            );

            if (coupon) {
              const isUnlimited = coupon.maxRedeems === -1;
              const hasRedeems = isUnlimited || coupon.redeemsCount < coupon.maxRedeems;

              if (hasRedeems) {
                if (coupon.discountKind === "PERCENTAGE") {
                  const pct = coupon.discount / 100;
                  finalPrice = Math.round(finalPrice * (1 - pct / 100));
                } else if (coupon.discountKind === "FIXED") {
                  finalPrice = Math.max(100, finalPrice - coupon.discount);
                }
                discountApplied = true;
                logStep("Coupon applied", { couponCode, finalPrice });

                // Record coupon redemption
                try {
                  await supabaseClient.from("coupon_redemptions").insert({
                    user_id: userId || "00000000-0000-0000-0000-000000000000",
                    email: userEmail,
                    coupon_code: couponCode.toUpperCase(),
                    plan_key: planKey,
                    discount_amount_cents: plan.priceInCents - finalPrice,
                  });
                  logStep("Coupon redemption recorded");
                } catch (e) {
                  logStep("Failed to record coupon redemption", { error: String(e) });
                }
              }
            }
          }
        }
      } catch (e) {
        logStep("Failed to validate coupon", { error: String(e) });
      }
    }

    // Create one-time PIX checkout via transparents/create
    // (AbacatePay v2 subscriptions only support CARD, so PIX uses one-time + cron renewal)
    const pixRes = await fetch(`${ABACATE_API}/transparents/create`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        method: "PIX",
        data: {
          amount: finalPrice,
          description: `${plan.name} - Assinatura mensal via PIX`,
          expiresIn: 1800,
          customer: {
            name: customerData.name,
            cellphone: customerData.phone,
            email: customerData.email,
            taxId: customerData.taxId,
          },
          metadata: {
            planKey,
            planName: plan.name,
            userId: userId || "anonymous",
            email: customerData.email,
            type: "subscription_pix",
          },
        },
      }),
    });

    const pixJson = await pixRes.json();
    if (pixJson.error || !pixRes.ok) {
      logStep("PIX creation failed", { status: pixRes.status, body: pixJson });
      throw new Error(`AbacatePay PIX error: ${JSON.stringify(pixJson.error || pixJson)}`);
    }

    const pixData = pixJson.data;
    logStep("PIX checkout created", { pixId: pixData.id, amount: finalPrice });

    // Build the hosted checkout URL for redirect
    const origin = req.headers.get("origin") || "https://wiize.com.br";
    const checkoutUrl = pixData.url || `${origin}/checkout-pix?pixId=${pixData.id}`;

    // Track checkout lead
    try {
      await supabaseClient.from("checkout_leads").insert({
        user_id: userId || null,
        email: customerData.email,
        name: customerData.name,
        phone: customerData.phone || null,
        tax_id: customerData.taxId || null,
        plan_attempted: plan.name,
        stripe_session_id: `abacate_sub_${pixData.id}`,
        checkout_started_at: new Date().toISOString(),
        checkout_completed: false,
      });
      logStep("Checkout lead tracked");
    } catch (e) {
      logStep("Failed to track checkout lead", { error: String(e) });
    }

    return new Response(
      JSON.stringify({
        url: checkoutUrl,
        pixId: pixData.id,
        brCode: pixData.brCode,
        brCodeBase64: pixData.brCodeBase64,
        amount: pixData.amount,
        expiresAt: pixData.expiresAt,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});