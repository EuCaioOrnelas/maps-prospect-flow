import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { couponCode, email, fingerprint } = await req.json();
    if (!couponCode) throw new Error("couponCode is required");

    // Get client IP for fraud prevention
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() 
      || req.headers.get("x-real-ip") 
      || "unknown";

    logStep("Validating coupon", { couponCode, email });

    // Check if user already redeemed this coupon
    if (email) {
      const { data: existingByEmail } = await supabaseClient
        .from("coupon_redemptions")
        .select("id")
        .eq("email", email.toLowerCase())
        .eq("coupon_code", couponCode.toUpperCase())
        .maybeSingle();

      if (existingByEmail) {
        logStep("Coupon already used by this email", { couponCode, email });
        return new Response(
          JSON.stringify({ valid: false, error: "Você já utilizou este cupom. Ele é válido apenas para a primeira assinatura." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Check if this IP already redeemed any coupon (fraud prevention)
    if (clientIp && clientIp !== "unknown") {
      const { data: existingByIp } = await supabaseClient
        .from("coupon_redemptions")
        .select("id")
        .eq("ip_address", clientIp)
        .eq("coupon_code", couponCode.toUpperCase())
        .maybeSingle();

      if (existingByIp) {
        logStep("Coupon already used from this IP", { couponCode, ip: clientIp });
        return new Response(
          JSON.stringify({ valid: false, error: "Este cupom já foi utilizado. Cupons são válidos apenas para a primeira assinatura." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Fetch all coupons from AbacatePay
    const res = await fetch(`${ABACATE_API_URL}/coupons/list`, {
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
        discountKind: coupon.discountKind,
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
