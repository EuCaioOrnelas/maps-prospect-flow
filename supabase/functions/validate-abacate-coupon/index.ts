import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ABACATE_API_URL = "https://api.abacatepay.com/v2";

const logStep = (step: string, details?: any) => {
  console.log(`[ABACATE-COUPON] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("ABACATE_PAY_API_KEY");
    if (!apiKey) throw new Error("ABACATE_PAY_API_KEY not configured");

    const { couponCode } = await req.json();
    if (!couponCode) throw new Error("couponCode is required");

    logStep("Validating coupon", { couponCode });

    // Fetch all coupons from AbacatePay
    const res = await fetch(`${ABACATE_API_URL}/coupon/list`, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Accept": "application/json",
      },
    });

    const json = await res.json();
    if (json.error) {
      throw new Error(`AbacatePay error: ${JSON.stringify(json.error)}`);
    }

    const coupons = json.data || [];
    
    // Find coupon by code (case-insensitive), must be ACTIVE
    const coupon = coupons.find(
      (c: any) => c.id?.toUpperCase() === couponCode.toUpperCase() && c.status === "ACTIVE"
    );

    if (!coupon) {
      logStep("Coupon not found or inactive", { couponCode });
      return new Response(
        JSON.stringify({ valid: false, error: "Cupom inválido ou expirado" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check max redeems (-1 = unlimited)
    if (coupon.maxRedeems !== -1 && coupon.redeemsCount >= coupon.maxRedeems) {
      logStep("Coupon max redeems reached", { couponCode, redeems: coupon.redeemsCount, max: coupon.maxRedeems });
      return new Response(
        JSON.stringify({ valid: false, error: "Cupom esgotado" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Coupon valid", { 
      couponCode, 
      discountKind: coupon.discountKind, 
      discount: coupon.discount 
    });

    return new Response(
      JSON.stringify({
        valid: true,
        discountKind: coupon.discountKind, // "PERCENTAGE" or "FIXED"
        discount: coupon.discount,
        code: coupon.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ valid: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
