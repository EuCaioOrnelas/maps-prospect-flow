import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ASAAS_API = "https://api.asaas.com/v3";

const logStep = (step: string, details?: any) => {
  console.log(`[ASAAS-CARD-CHECKOUT] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
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

    const { planKey, customerData } = await req.json();
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
        throw new Error(`Erro ao criar cliente: ${JSON.stringify(customerJson.errors || customerJson)}`);
      }

      customerId = customerJson.id;
      logStep("Customer created", { customerId });
    }

    // 2. Create payment link with installment options
    // Use the domain registered in Asaas account for callback URLs
    const callbackDomain = customerData.callbackDomain || "https://wiize.com.br";
    const externalRef = userId || customerData.email;

    const paymentLinkBody: Record<string, any> = {
      name: `${plan.name} Anual`,
      description: `Assinatura anual ${plan.name} - 12x de R$ ${plan.installmentValue.toFixed(2).replace('.', ',')}`,
      billingType: "CREDIT_CARD",
      chargeType: "INSTALLMENT",
      maxInstallmentCount: 12,
      value: plan.priceAnnual,
      dueDateLimitDays: 3,
      externalReference: externalRef,
      notificationEnabled: true,
      callback: {
        successUrl: `${callbackDomain}/checkout-success?provider=asaas`,
        autoRedirect: true,
      },
    };

    logStep("Creating payment link", { value: plan.priceAnnual, installments: 12 });

    const linkRes = await fetch(`${ASAAS_API}/paymentLinks`, {
      method: "POST",
      headers: {
        "access_token": apiKey,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(paymentLinkBody),
    });

    const linkJson = await linkRes.json();
    if (!linkRes.ok || linkJson.errors) {
      logStep("Payment link creation failed", linkJson);
      throw new Error(`Erro Asaas: ${JSON.stringify(linkJson.errors || linkJson)}`);
    }

    logStep("Payment link created", { id: linkJson.id, url: linkJson.url });

    // 3. Track checkout lead
    try {
      await supabaseClient.from("checkout_leads").insert({
        user_id: userId || null,
        email: customerData.email,
        name: customerData.name,
        phone: customerData.phone || null,
        tax_id: customerData.taxId || null,
        plan_attempted: plan.name,
        stripe_session_id: `asaas_card_${linkJson.id}`,
        checkout_started_at: new Date().toISOString(),
        checkout_completed: false,
      });
      logStep("Checkout lead tracked");
    } catch (e) {
      logStep("Failed to track checkout lead", { error: String(e) });
    }

    return new Response(
      JSON.stringify({
        checkoutUrl: linkJson.url,
        paymentLinkId: linkJson.id,
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
