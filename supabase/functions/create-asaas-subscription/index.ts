import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ASAAS_API = "https://api.asaas.com/v3";

const logStep = (step: string, details?: any) => {
  console.log(`[ASAAS-SUBSCRIPTION] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

const PLAN_CONFIG: Record<string, { name: string; priceInCents: number; priceDecimal: number }> = {
  start: { name: "Wiize Start", priceInCents: 19700, priceDecimal: 197.00 },
  growth: { name: "Wiize Growth", priceInCents: 49700, priceDecimal: 497.00 },
  scale: { name: "Wiize Scale", priceInCents: 89700, priceDecimal: 897.00 },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("ASAAS_API_KEY");
    if (!apiKey) throw new Error("ASAAS_API_KEY not configured");

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

    // Clean CPF/CNPJ - only digits
    const cpfCnpj = customerData.taxId?.replace(/\D/g, "") || "";
    if (!cpfCnpj || cpfCnpj.length < 11) {
      throw new Error("CPF/CNPJ é obrigatório");
    }

    // Clean phone - only digits
    const phone = customerData.phone?.replace(/\D/g, "") || "";

    // 1. Create or find customer on Asaas
    // First try to find existing customer by CPF/CNPJ
    const findRes = await fetch(`${ASAAS_API}/customers?cpfCnpj=${cpfCnpj}`, {
      headers: {
        "access_token": apiKey,
        "Accept": "application/json",
      },
    });
    const findJson = await findRes.json();
    
    let customerId: string;
    
    if (findJson.data && findJson.data.length > 0) {
      customerId = findJson.data[0].id;
      logStep("Existing customer found", { customerId });
    } else {
      // Create new customer
      const customerRes = await fetch(`${ASAAS_API}/customers`, {
        method: "POST",
        headers: {
          "access_token": apiKey,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          name: customerData.name,
          email: customerData.email,
          cpfCnpj: cpfCnpj,
          mobilePhone: phone,
          notificationDisabled: false,
        }),
      });

      const customerJson = await customerRes.json();
      if (!customerRes.ok || customerJson.errors) {
        logStep("Customer creation failed", customerJson);
        throw new Error(`Asaas customer error: ${JSON.stringify(customerJson.errors || customerJson)}`);
      }

      customerId = customerJson.id;
      logStep("Customer created", { customerId });
    }

    // 2. Determine final price (handle coupons internally)
    let finalPrice = plan.priceDecimal;
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    if (couponCode) {
      try {
        const userEmail = customerData.email?.toLowerCase();
        if (userEmail) {
          const { data: existingRedemption } = await supabaseClient
            .from("coupon_redemptions")
            .select("id")
            .eq("email", userEmail)
            .eq("coupon_code", couponCode.toUpperCase())
            .maybeSingle();

          if (existingRedemption) {
            logStep("Coupon already redeemed", { couponCode, email: userEmail });
          } else {
            // Validate coupon via validate-abacate-coupon (reuse existing logic)
            // For now, skip external coupon - can integrate later
            logStep("Coupon validation skipped for Asaas migration", { couponCode });
          }
        }
      } catch (e) {
        logStep("Coupon check failed", { error: String(e) });
      }
    }

    // 3. Create subscription with PIX billing
    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + 0); // First payment today

    const subscriptionBody = {
      customer: customerId,
      billingType: "PIX",
      value: finalPrice,
      nextDueDate: nextDueDate.toISOString().split("T")[0], // YYYY-MM-DD
      cycle: "MONTHLY",
      description: `${plan.name} - Assinatura mensal`,
      externalReference: userId || customerData.email,
    };

    logStep("Creating subscription", subscriptionBody);

    const subRes = await fetch(`${ASAAS_API}/subscriptions`, {
      method: "POST",
      headers: {
        "access_token": apiKey,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(subscriptionBody),
    });

    const subJson = await subRes.json();
    if (!subRes.ok || subJson.errors) {
      logStep("Subscription creation failed", subJson);
      throw new Error(`Asaas subscription error: ${JSON.stringify(subJson.errors || subJson)}`);
    }

    logStep("Subscription created", { subscriptionId: subJson.id, status: subJson.status });

    // 4. Get the first payment (charge) to obtain QR Code
    // Wait a moment for Asaas to generate the first charge
    await new Promise(resolve => setTimeout(resolve, 2000));

    const paymentsRes = await fetch(`${ASAAS_API}/subscriptions/${subJson.id}/payments`, {
      headers: {
        "access_token": apiKey,
        "Accept": "application/json",
      },
    });

    const paymentsJson = await paymentsRes.json();
    const firstPayment = paymentsJson.data?.[0];

    if (!firstPayment) {
      logStep("No payment found for subscription, returning subscription ID");
      // Track checkout lead anyway
      try {
        await supabaseClient.from("checkout_leads").insert({
          user_id: userId || null,
          email: customerData.email,
          name: customerData.name,
          phone: customerData.phone || null,
          tax_id: customerData.taxId || null,
          plan_attempted: plan.name,
          stripe_session_id: `asaas_sub_${subJson.id}`,
          checkout_started_at: new Date().toISOString(),
          checkout_completed: false,
        });
      } catch (e) {
        logStep("Failed to track checkout lead", { error: String(e) });
      }

      return new Response(
        JSON.stringify({
          subscriptionId: subJson.id,
          paymentId: null,
          status: "PENDING",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("First payment found", { paymentId: firstPayment.id, status: firstPayment.status });

    // 5. Get PIX QR Code for the first payment
    const pixRes = await fetch(`${ASAAS_API}/payments/${firstPayment.id}/pixQrCode`, {
      headers: {
        "access_token": apiKey,
        "Accept": "application/json",
      },
    });

    const pixJson = await pixRes.json();
    
    if (!pixRes.ok) {
      logStep("PIX QR Code fetch failed", pixJson);
      // Still return payment info without QR code
    }

    logStep("PIX QR Code generated", { hasPayload: !!pixJson.payload, hasImage: !!pixJson.encodedImage });

    // 6. Track checkout lead
    try {
      await supabaseClient.from("checkout_leads").insert({
        user_id: userId || null,
        email: customerData.email,
        name: customerData.name,
        phone: customerData.phone || null,
        tax_id: customerData.taxId || null,
        plan_attempted: plan.name,
        stripe_session_id: `asaas_sub_${subJson.id}`,
        checkout_started_at: new Date().toISOString(),
        checkout_completed: false,
      });
      logStep("Checkout lead tracked");
    } catch (e) {
      logStep("Failed to track checkout lead", { error: String(e) });
    }

    return new Response(
      JSON.stringify({
        subscriptionId: subJson.id,
        paymentId: firstPayment.id,
        brCode: pixJson.payload || "",
        brCodeBase64: pixJson.encodedImage ? `data:image/png;base64,${pixJson.encodedImage}` : "",
        amount: Math.round(finalPrice * 100), // return in cents for frontend compatibility
        expiresAt: firstPayment.dueDate,
        pixId: firstPayment.id, // for polling compatibility
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
