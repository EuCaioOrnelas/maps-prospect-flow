import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ASAAS_API = "https://api.asaas.com/v3";

const logStep = (step: string, details?: any) => {
  console.log(`[ASAAS-PIX-AUTO] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

const PLAN_CONFIG: Record<string, { name: string; priceMonthly: number; priceAnnual: number }> = {
  start: { name: "Wiize Start", priceMonthly: 296.00, priceAnnual: 2952.00 },
  growth: { name: "Wiize Growth", priceMonthly: 696.00, priceAnnual: 5952.00 },
  scale: { name: "Wiize Scale", priceMonthly: 897.00, priceAnnual: 897.00 },
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

    const { planKey, customerData, testOverridePrice, billingPeriod } = await req.json();
    if (!planKey || !customerData) throw new Error("planKey and customerData are required");

    const plan = PLAN_CONFIG[planKey];
    if (!plan) throw new Error(`Invalid plan: ${planKey}`);

    const isAnnual = billingPeriod === "annual";

    logStep("Request received", { planKey, email: customerData.email, billingPeriod: billingPeriod || "monthly" });

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

    // Clean CPF/CNPJ
    const cpfCnpj = customerData.taxId?.replace(/\D/g, "") || "";
    if (!cpfCnpj || cpfCnpj.length < 11) {
      throw new Error("CPF/CNPJ é obrigatório");
    }

    const phone = customerData.phone?.replace(/\D/g, "") || "";

    // 1. Create or find customer on Asaas
    const findRes = await fetch(`${ASAAS_API}/customers?cpfCnpj=${cpfCnpj}`, {
      headers: { "access_token": apiKey, "Accept": "application/json" },
    });
    const findJson = await findRes.json();
    
    let customerId: string;
    
    if (findJson.data && findJson.data.length > 0) {
      customerId = findJson.data[0].id;
      logStep("Existing customer found", { customerId });
    } else {
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

    // 2. Determine final price
    let finalPrice = plan.priceDecimal;
    
    // TEMP: Allow test override price
    if (testOverridePrice && typeof testOverridePrice === "number" && testOverridePrice > 0) {
      logStep("TEST OVERRIDE PRICE", { original: finalPrice, override: testOverridePrice });
      finalPrice = testOverridePrice;
    }

    // 3. Create PIX Automático authorization with immediate QR Code
    const startDate = new Date();
    const contractId = `wiize_${planKey}_${Date.now()}`;
    const externalRef = userId || customerData.email;

    const authorizationBody = {
      customerId: customerId,
      frequency: "MONTHLY",
      contractId: contractId.slice(0, 35),
      startDate: startDate.toISOString().split("T")[0],
      originalValue: finalPrice,
      value: finalPrice,
      description: `${plan.name} mensal`.slice(0, 35),
      immediateQrCode: {
        originalValue: finalPrice,
        value: finalPrice,
        description: `${plan.name} - 1a parcela`.slice(0, 35),
        externalReference: externalRef,
        expirationSeconds: 3600,
      },
    };

    logStep("Creating PIX Automático authorization", authorizationBody);

    const authRes = await fetch(`${ASAAS_API}/pix/automatic/authorizations`, {
      method: "POST",
      headers: {
        "access_token": apiKey,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(authorizationBody),
    });

    const authJson = await authRes.json();
    if (!authRes.ok || authJson.errors) {
      logStep("Authorization creation failed", authJson);
      throw new Error(`Asaas PIX Automático error: ${JSON.stringify(authJson.errors || authJson)}`);
    }

    logStep("Authorization created", { 
      authorizationId: authJson.id, 
      status: authJson.status,
    });

    const qrCodePayload = authJson.payload || authJson.immediateQrCode?.payload || "";
    const qrCodeImage = authJson.encodedImage || authJson.immediateQrCode?.encodedImage || "";
    const conciliationId = authJson.immediateQrCode?.conciliationIdentifier || "";

    // 4. Track checkout lead
    try {
      await supabaseClient.from("checkout_leads").insert({
        user_id: userId || null,
        email: customerData.email,
        name: customerData.name,
        phone: customerData.phone || null,
        tax_id: customerData.taxId || null,
        plan_attempted: plan.name,
        stripe_session_id: `asaas_pixauto_${authJson.id}`,
        checkout_started_at: new Date().toISOString(),
        checkout_completed: false,
      });
      logStep("Checkout lead tracked");
    } catch (e) {
      logStep("Failed to track checkout lead", { error: String(e) });
    }

    return new Response(
      JSON.stringify({
        authorizationId: authJson.id,
        brCode: qrCodePayload,
        brCodeBase64: qrCodeImage ? `data:image/png;base64,${qrCodeImage}` : "",
        amount: Math.round(finalPrice * 100),
        conciliationId: conciliationId,
        pixId: authJson.id, // for polling compatibility
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
