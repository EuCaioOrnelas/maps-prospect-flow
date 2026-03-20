import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ABACATE_API_URL = "https://api.abacatepay.com/v1";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ABACATE-CHECKOUT] ${step}${detailsStr}`);
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

    logStep("Request received", { planKey, email: customerData.email });

    // Plan config (prices in cents)
    const planConfig: Record<string, { name: string; priceInCents: number }> = {
      start: { name: "Wiize Start", priceInCents: 19700 },
      growth: { name: "Wiize Growth", priceInCents: 49700 },
      scale: { name: "Wiize Scale", priceInCents: 89700 },
    };

    const plan = planConfig[planKey];
    if (!plan) throw new Error(`Invalid plan: ${planKey}`);

    // Authenticate user if possible
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

    // 2. Determine price (apply coupon if applicable)
    let finalPrice = plan.priceInCents;
    if (couponCode) {
      logStep("Coupon provided, will be handled by AbacatePay billing", { couponCode });
    }

    // Check if user is on free trial and has first campaign promo
    if (userId) {
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("plan, trial_start_at")
        .eq("id", userId)
        .maybeSingle();

      if (profile?.plan === "free" && profile?.trial_start_at) {
        // 50% off first month for trial users
        finalPrice = Math.round(finalPrice / 2);
        logStep("Trial user discount applied", { originalPrice: plan.priceInCents, finalPrice });
      }
    }

    const origin = req.headers.get("origin") || "https://leadspro.lovable.app";

    // 3. Create billing on AbacatePay
    const billingRes = await fetch(`${ABACATE_API_URL}/billing/create`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        frequency: "MULTIPLE_PAYMENTS",
        methods: ["PIX"],
        products: [
          {
            externalId: `wiize-${planKey}`,
            name: plan.name,
            description: `Assinatura mensal do plano ${plan.name}`,
            quantity: 1,
            price: finalPrice,
          },
        ],
        returnUrl: `${origin}/upgrade?checkout=canceled`,
        completionUrl: `${origin}/checkout-success?provider=abacate`,
        customerId: customerId,
      }),
    });

    const billingJson = await billingRes.json();
    if (billingJson.error) {
      logStep("Billing creation failed", billingJson.error);
      throw new Error(`AbacatePay billing error: ${JSON.stringify(billingJson.error)}`);
    }

    const billingData = billingJson.data;
    logStep("Billing created", { billingId: billingData.id, url: billingData.url });

    // 4. Track checkout lead
    if (userId) {
      try {
        await supabaseClient.from("checkout_leads").insert({
          user_id: userId,
          email: customerData.email,
          name: customerData.name,
          plan_attempted: plan.name,
          stripe_session_id: `abacate_${billingData.id}`,
          checkout_started_at: new Date().toISOString(),
          checkout_completed: false,
        });
        logStep("Checkout lead tracked");
      } catch (e) {
        logStep("Failed to track checkout lead", { error: String(e) });
      }
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
