import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ABACATE_API_URL = "https://api.abacatepay.com/v1";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ABACATE-SUBSCRIPTION] ${step}${detailsStr}`);
};

// AbacatePay v2 product IDs
const PRODUCT_IDS: Record<string, string> = {
  start: "prod_YuGfZ0UukSSPPjbjn3DZJkMK",
  growth: "prod_fNftUU0Pd5bEgdpnKTADKUgT",
  scale: "prod_2KNLMQM5QHe0bb1TZxWenx2N",
};

const PLAN_NAMES: Record<string, string> = {
  start: "Wiize Start",
  growth: "Wiize Growth",
  scale: "Wiize Scale",
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

    const productId = PRODUCT_IDS[planKey];
    if (!productId) throw new Error(`Invalid plan: ${planKey}`);

    logStep("Request received", { planKey, email: customerData.email, productId });

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

    // 1. Create customer on AbacatePay
    const customerRes = await fetch(`${ABACATE_API_URL}/customer/create`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        name: customerData.name,
        cellphone: customerData.phone,
        email: customerData.email,
        taxId: customerData.taxId,
      }),
    });

    const customerJson = await customerRes.json();
    if (customerJson.error) {
      logStep("Customer creation failed", customerJson.error);
      throw new Error(`AbacatePay customer error: ${JSON.stringify(customerJson.error)}`);
    }

    const customerId = customerJson.data?.id;
    logStep("Customer created", { customerId });

    const origin = req.headers.get("origin") || "https://maps-prospect-flow.lovable.app";

    // 2. Create subscription billing with the product
    const billingBody: Record<string, any> = {
      frequency: "MULTIPLE_PAYMENTS",
      methods: ["PIX"],
      products: [productId],
      returnUrl: `${origin}/upgrade?checkout=canceled`,
      completionUrl: `${origin}/checkout-success?provider=abacate`,
      customerId: customerId,
    };

    // Add coupon if provided
    if (couponCode) {
      billingBody.couponCode = couponCode;
      logStep("Coupon attached to billing", { couponCode });
    }

    // Add metadata for user tracking
    billingBody.metadata = {
      userId: userId || "anonymous",
      planKey,
      email: customerData.email,
    };

    logStep("Creating billing", billingBody);

    const billingRes = await fetch(`${ABACATE_API_URL}/billing/create`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(billingBody),
    });

    const billingJson = await billingRes.json();
    if (billingJson.error) {
      logStep("Billing creation failed", billingJson.error);
      throw new Error(`AbacatePay billing error: ${JSON.stringify(billingJson.error)}`);
    }

    const billingData = billingJson.data;
    logStep("Subscription billing created", { billingId: billingData.id, url: billingData.url });

    // 3. Track checkout lead
    try {
      await supabaseClient.from("checkout_leads").insert({
        user_id: userId || null,
        email: customerData.email,
        name: customerData.name,
        plan_attempted: PLAN_NAMES[planKey] || planKey,
        stripe_session_id: `abacate_sub_${billingData.id}`,
        checkout_started_at: new Date().toISOString(),
        checkout_completed: false,
      });
      logStep("Checkout lead tracked");
    } catch (e) {
      logStep("Failed to track checkout lead", { error: String(e) });
    }

    return new Response(
      JSON.stringify({ url: billingData.url, billingId: billingData.id }),
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
