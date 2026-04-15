import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ASAAS_API = "https://api.asaas.com/v3";

const logStep = (step: string, details?: any) => {
  console.log(`[ASAAS-CARD-SUB] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

const PLAN_CONFIG: Record<string, { name: string; priceMonthly: number; priceAnnual: number; installmentValue: number }> = {
  start: { name: "Wiize Start", priceMonthly: 296.00, priceAnnual: 2952.00, installmentValue: 246.00 },
  growth: { name: "Wiize Growth", priceMonthly: 696.00, priceAnnual: 5952.00, installmentValue: 496.00 },
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

    const { planKey, customerData, creditCard, installmentCount, billingPeriod } = await req.json();
    if (!planKey || !customerData || !creditCard) {
      throw new Error("planKey, customerData and creditCard are required");
    }

    const isAnnual = billingPeriod === "annual";
    const plan = PLAN_CONFIG[planKey];
    if (!plan) throw new Error(`Invalid plan: ${planKey}`);

    logStep("Request received", { planKey, email: customerData.email, billingPeriod: billingPeriod || "annual" });

    // Validate credit card data
    if (!creditCard.holderName || !creditCard.number || !creditCard.expiryMonth || !creditCard.expiryYear || !creditCard.ccv) {
      throw new Error("Dados do cartão incompletos");
    }

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
      }
    }

    // Clean CPF/CNPJ
    const cpfCnpj = customerData.taxId?.replace(/\D/g, "") || "";
    if (!cpfCnpj || cpfCnpj.length < 11) {
      throw new Error("CPF/CNPJ é obrigatório");
    }

    const phone = customerData.phone?.replace(/\D/g, "") || "";
    const postalCode = customerData.postalCode?.replace(/\D/g, "") || "";
    const address = customerData.address || "";
    const addressNum = customerData.addressNumber || "S/N";
    const neighborhood = customerData.neighborhood || "";

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
        throw new Error(`Erro ao criar cliente: ${JSON.stringify(customerJson.errors || customerJson)}`);
      }

      customerId = customerJson.id;
      logStep("Customer created", { customerId });
    }

    // 2. Determine cycle, value and installments
    const cycle = isAnnual ? "YEARLY" : "MONTHLY";
    const value = isAnnual ? plan.priceAnnual : plan.priceMonthly;
    const maxInstallments = isAnnual ? Math.min(Math.max(installmentCount || 12, 1), 12) : 1;

    // 3. Create subscription with credit card
    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + 1); // tomorrow
    const dueDateStr = nextDueDate.toISOString().split("T")[0];

    const subscriptionBody: Record<string, any> = {
      customer: customerId,
      billingType: "CREDIT_CARD",
      cycle: cycle,
      value: value,
      nextDueDate: dueDateStr,
      description: `${plan.name} ${isAnnual ? "Anual" : "Mensal"}`,
      externalReference: userId || customerData.email,
      creditCard: {
        holderName: creditCard.holderName,
        number: creditCard.number.replace(/\s/g, ""),
        expiryMonth: creditCard.expiryMonth,
        expiryYear: creditCard.expiryYear,
        ccv: creditCard.ccv,
      },
      creditCardHolderInfo: {
        name: customerData.name,
        email: customerData.email,
        cpfCnpj: cpfCnpj,
        postalCode: postalCode || "01310100",
        addressNumber: addressNum,
        address: address,
        province: neighborhood,
        phone: phone,
      },
    };

    // Only add installments for annual
    if (isAnnual && maxInstallments > 1) {
      subscriptionBody.maxInstallmentCount = maxInstallments;
    }

    logStep("Creating subscription", { customer: customerId, cycle, value });

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
      const errorMsg = subJson.errors?.map((e: any) => e.description).join(", ") || JSON.stringify(subJson);
      throw new Error(errorMsg);
    }

    logStep("Subscription created", { id: subJson.id, status: subJson.status, cycle });

    // 4. Track checkout lead
    try {
      await supabaseClient.from("checkout_leads").insert({
        user_id: userId || null,
        email: customerData.email,
        name: customerData.name,
        phone: customerData.phone || null,
        tax_id: customerData.taxId || null,
        postal_code: postalCode || null,
        address: address || null,
        address_number: addressNum || null,
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
        status: subJson.status,
        success: true,
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
