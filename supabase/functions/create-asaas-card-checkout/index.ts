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

const PLAN_CONFIG: Record<string, { name: string; priceAnnual: number; installmentValue: number }> = {
  start: { name: "Wiize Start", priceAnnual: 2952.00, installmentValue: 246.00 },
  growth: { name: "Wiize Growth", priceAnnual: 5952.00, installmentValue: 496.00 },
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

    const { planKey, customerData, creditCard } = await req.json();
    if (!planKey || !customerData || !creditCard) {
      throw new Error("planKey, customerData and creditCard are required");
    }

    const plan = PLAN_CONFIG[planKey];
    if (!plan) throw new Error(`Invalid plan: ${planKey}`);

    logStep("Request received", { planKey, email: customerData.email });

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

    // 2. Create subscription with credit card (YEARLY cycle)
    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + 1); // tomorrow
    const dueDateStr = nextDueDate.toISOString().split("T")[0];

    const subscriptionBody = {
      customer: customerId,
      billingType: "CREDIT_CARD",
      cycle: "YEARLY",
      value: plan.priceAnnual,
      nextDueDate: dueDateStr,
      description: `${plan.name} Anual`,
      externalReference: userId || customerData.email,
      maxInstallmentCount: 12,
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
        postalCode: postalCode || "00000000",
        addressNumber: customerData.addressNumber || "0",
        phone: phone,
      },
    };

    logStep("Creating subscription", { customer: customerId, cycle: "YEARLY", value: plan.priceAnnual });

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

    logStep("Subscription created", { id: subJson.id, status: subJson.status });

    // 3. Track checkout lead
    try {
      await supabaseClient.from("checkout_leads").insert({
        user_id: userId || null,
        email: customerData.email,
        name: customerData.name,
        phone: customerData.phone || null,
        tax_id: customerData.taxId || null,
        plan_attempted: plan.name,
        stripe_session_id: `asaas_card_sub_${subJson.id}`,
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
