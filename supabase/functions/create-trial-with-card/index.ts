// Cria assinatura no Asaas com cartão e cobrança agendada para D+7 (trial gratuito).
// Espelha 1:1 o payload validado em `create-asaas-card-checkout`, alterando apenas
// `nextDueDate` (D+7 em vez de D+1) e o ciclo (sempre MENSAL após o trial).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ASAAS_API = "https://api.asaas.com/v3";

const logStep = (step: string, details?: unknown) => {
  console.log(`[TRIAL-WITH-CARD] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

// Asaas exige sigla UF de 2 letras em `creditCardHolderInfo.state`.
// O ViaCEP devolve o nome por extenso ("Paraná") em `data.estado`, então
// normalizamos para a sigla aqui no backend.
const UF_BY_NAME: Record<string, string> = {
  "acre": "AC", "alagoas": "AL", "amapa": "AP", "amapá": "AP", "amazonas": "AM",
  "bahia": "BA", "ceara": "CE", "ceará": "CE", "distrito federal": "DF",
  "espirito santo": "ES", "espírito santo": "ES", "goias": "GO", "goiás": "GO",
  "maranhao": "MA", "maranhão": "MA", "mato grosso": "MT", "mato grosso do sul": "MS",
  "minas gerais": "MG", "para": "PA", "pará": "PA", "paraiba": "PB", "paraíba": "PB",
  "parana": "PR", "paraná": "PR", "pernambuco": "PE", "piaui": "PI", "piauí": "PI",
  "rio de janeiro": "RJ", "rio grande do norte": "RN", "rio grande do sul": "RS",
  "rondonia": "RO", "rondônia": "RO", "roraima": "RR", "santa catarina": "SC",
  "sao paulo": "SP", "são paulo": "SP", "sergipe": "SE", "tocantins": "TO",
};

function toUF(input: string | undefined | null): string {
  const v = (input || "").trim();
  if (!v) return "";
  if (v.length === 2) return v.toUpperCase();
  return UF_BY_NAME[v.toLowerCase()] || v.slice(0, 2).toUpperCase();
}

// Após o trial a cobrança é sempre mensal — confirmado pelo product
const PLAN_CONFIG: Record<string, { name: string; priceMonthly: number }> = {
  start: { name: "Wiize Start", priceMonthly: 296.0 },
  growth: { name: "Wiize Growth", priceMonthly: 696.0 },
  scale: { name: "Wiize Scale", priceMonthly: 1496.0 },
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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { userId, planKey, customerData, creditCard } = await req.json();
    if (!planKey || !customerData || !creditCard) {
      throw new Error("planKey, customerData and creditCard are required");
    }

    const plan = PLAN_CONFIG[planKey];
    if (!plan) throw new Error(`Invalid plan: ${planKey}`);

    logStep("Request received", { planKey, email: customerData.email });

    // Validate credit card data (mesma validação do checkout que funciona)
    if (!creditCard.holderName || !creditCard.number || !creditCard.expiryMonth || !creditCard.expiryYear || !creditCard.ccv) {
      throw new Error("Dados do cartão incompletos");
    }

    // Resolve userId via auth header se não foi enviado explicitamente
    let resolvedUserId: string | null = userId || null;
    const authHeader = req.headers.get("Authorization");
    if (!resolvedUserId && authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabaseClient.auth.getUser(token);
      if (data.user) resolvedUserId = data.user.id;
    }
    if (!resolvedUserId && customerData.email) {
      const { data: profileByEmail } = await supabaseClient
        .from("profiles")
        .select("id")
        .eq("email", customerData.email)
        .maybeSingle();
      if (profileByEmail) resolvedUserId = profileByEmail.id;
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
    const city = customerData.city || "";
    const state = toUF(customerData.state);
    const addressComplement = customerData.addressComplement || "";

    // 1. Create or find customer on Asaas (payload idêntico ao checkout)
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

    // 2. Trial de 7 dias — primeira cobrança agendada para D+7
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 7);
    const nextDueDate = trialEnd.toISOString().split("T")[0];

    // 3. Subscription com cartão — payload IDÊNTICO ao create-asaas-card-checkout
    const subscriptionBody: Record<string, any> = {
      customer: customerId,
      billingType: "CREDIT_CARD",
      cycle: "MONTHLY",
      value: plan.priceMonthly,
      nextDueDate,
      description: `${plan.name} Mensal (após trial 7 dias)`,
      externalReference: resolvedUserId || customerData.email,
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
        addressComplement: addressComplement || undefined,
        province: neighborhood,
        city: city || "São Paulo",
        state: state || "SP",
        phone: phone,
        mobilePhone: phone,
      },
    };

    logStep("Creating subscription", { customer: customerId, cycle: "MONTHLY", value: plan.priceMonthly, nextDueDate });

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
      // Mapeia erros conhecidos do Asaas para mensagens claras
      const firstErr = subJson.errors?.[0];
      const code = firstErr?.code || "";
      const desc = firstErr?.description || "";
      let friendly = desc || JSON.stringify(subJson);
      if (code === "invalid_creditCard" || /não autorizada|nao autorizada/i.test(desc)) {
        friendly =
          "Cartão não autorizado pelo banco. Confira número, validade e CVV, verifique se há limite disponível e se o cartão está habilitado para compras online. Se o problema persistir, tente outro cartão.";
      } else if (code === "invalid_creditCard_holderInfo" || /endere[cç]o|cep|state|province/i.test(desc)) {
        friendly = "Os dados do titular do cartão estão incompletos. Confira CEP, endereço, número e cidade.";
      } else if (/expir/i.test(desc)) {
        friendly = "Cartão vencido. Use um cartão com validade futura.";
      } else if (/cpf|cnpj/i.test(desc)) {
        friendly = "CPF/CNPJ inválido. Confira o documento informado.";
      }
      throw new Error(friendly);
    }

    logStep("Subscription created", { id: subJson.id, status: subJson.status, nextDueDate });

    const cardLast4 = creditCard.number.replace(/\s/g, "").slice(-4);
    const cardBrand = subJson.creditCard?.creditCardBrand || "CARD";

    // 4. Persistir info do trial no profile (best-effort) e tracking
    if (resolvedUserId) {
      const { error: updateError } = await supabaseClient
        .from("profiles")
        .update({
          trial_card_last4: cardLast4,
          trial_card_brand: cardBrand,
          trial_asaas_subscription_id: subJson.id,
          trial_asaas_customer_id: customerId,
          trial_plan_chosen: planKey,
          trial_billing_period: "monthly",
          trial_will_charge_at: trialEnd.toISOString(),
          trial_auto_charge_cancelled: false,
          cpf: cpfCnpj,
          phone: customerData.phone || null,
          postal_code: postalCode || null,
          address: address || null,
          address_number: addressNum || null,
          neighborhood: neighborhood || null,
        })
        .eq("id", resolvedUserId);

      if (updateError) logStep("Profile update failed", updateError);
    }

    try {
      await supabaseClient.from("checkout_leads").insert({
        user_id: resolvedUserId,
        email: customerData.email,
        name: customerData.name,
        phone: customerData.phone || null,
        tax_id: customerData.taxId || null,
        postal_code: postalCode || null,
        address: address || null,
        address_number: addressNum || null,
        neighborhood: neighborhood || null,
        plan_attempted: plan.name,
        stripe_session_id: `asaas_trial_${subJson.id}`,
        checkout_started_at: new Date().toISOString(),
        checkout_completed: false,
      });
    } catch (e) {
      logStep("Failed to track trial lead", { error: String(e) });
    }

    return new Response(
      JSON.stringify({
        success: true,
        subscriptionId: subJson.id,
        customerId,
        nextDueDate,
        cardLast4,
        cardBrand,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});
