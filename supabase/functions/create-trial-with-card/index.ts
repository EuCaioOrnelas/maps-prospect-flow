import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ASAAS_API = "https://api.asaas.com/v3";

const PLAN_CONFIG: Record<string, { name: string; priceMonthly: number }> = {
  start: { name: "Wiize Start", priceMonthly: 296.0 },
  growth: { name: "Wiize Growth", priceMonthly: 696.0 },
  scale: { name: "Wiize Scale", priceMonthly: 1496.0 },
};

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

const logStep = (step: string, details?: unknown) => {
  console.log(`[TRIAL-WITH-CARD] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

function toUF(input: string | undefined | null): string {
  const value = (input || "").trim();
  if (!value) return "";
  if (value.length === 2) return value.toUpperCase();
  return UF_BY_NAME[value.toLowerCase()] || value.slice(0, 2).toUpperCase();
}

function normalizeAddressNumber(input: string | undefined | null) {
  const value = (input || "").trim();
  const hasDigits = /\d/.test(value);
  const isWithoutNumber = /^s\/?n$/i.test(value);

  return {
    addressNumber: value ? (hasDigits || isWithoutNumber ? value : "S/N") : "S/N",
    extraComplement: !hasDigits && value && !isWithoutNumber ? value : "",
  };
}

function formatAsaasPostalCode(input: string | undefined | null) {
  const digits = (input || "").replace(/\D/g, "");
  if (digits.length !== 8) return "";
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function normalizePhoneNumbers(input: string | undefined | null) {
  const digits = (input || "").replace(/\D/g, "");

  if (digits.length === 11) {
    return {
      phone: undefined,
      mobilePhone: digits,
    };
  }

  if (digits.length === 10) {
    return {
      phone: digits,
      mobilePhone: undefined,
    };
  }

  return {
    phone: undefined,
    mobilePhone: undefined,
  };
}

function buildFriendlyPaymentError(errorPayload: any) {
  const errors = Array.isArray(errorPayload?.errors) ? errorPayload.errors : [];
  const firstErr = errors[0];
  const code = String(firstErr?.code || "").toLowerCase();
  const descriptions = errors.map((err: { description?: string }) => err.description || "").join(" | ");
  let friendly = firstErr?.description || JSON.stringify(errorPayload);

  if (/cidade do titular|estado de resid[êe]ncia do titular|invalid_creditcard_holderinfo|addressnumber|addresscomplement|postalcode|cep|endere[cç]o/i.test(descriptions)) {
    friendly =
      "❌ O gateway rejeitou os dados do endereço do titular.\n\nA Asaas exige o holderInfo no formato exato e IP real do cliente.\n\n👉 Solução: confira CEP, número e complemento e tente novamente.";
  } else if (/saldo insuficiente|sem limite|limite insuficiente|insufficient/i.test(descriptions)) {
    friendly =
      "❌ Cartão recusado: SEM LIMITE DISPONÍVEL.\n\nMesmo sem cobrança imediata, o banco pode fazer uma validação inicial e recusar por falta de limite.\n\n👉 Solução: libere limite no app do banco ou use outro cartão.";
  } else if (/cart[aã]o bloqueado|card.*blocked|blocked.*card/i.test(descriptions)) {
    friendly =
      "❌ Cartão BLOQUEADO pelo banco emissor.\n\n👉 Solução: desbloqueie o cartão para compras online ou use outro cartão.";
  } else if (/n[ãa]o habilitado.*online|online.*n[ãa]o|not.*authorized.*online|e-commerce.*disabled/i.test(descriptions)) {
    friendly =
      "❌ Cartão não habilitado para COMPRAS ONLINE.\n\n👉 Solução: habilite compras online no app do banco ou use outro cartão.";
  } else if (/suspeita.*fraude|fraud|suspected/i.test(descriptions)) {
    friendly =
      "❌ Transação recusada por SUSPEITA DE FRAUDE pelo banco.\n\n👉 Solução: autorize a transação com o banco e tente novamente.";
  } else if (/expir|venc/i.test(descriptions)) {
    friendly =
      "❌ Cartão VENCIDO.\n\n👉 Solução: use um cartão com validade futura.";
  } else if (/cvv|cvc|c[oó]digo de seguran[çc]a|security code/i.test(descriptions)) {
    friendly =
      "❌ CVV INVÁLIDO.\n\n👉 Solução: confira o código de segurança do cartão.";
  } else if (/n[úu]mero.*cart[ãa]o|card.*number|invalid.*number/i.test(descriptions)) {
    friendly =
      "❌ NÚMERO DO CARTÃO INVÁLIDO.\n\n👉 Solução: confira os dígitos do cartão e tente novamente.";
  } else if (/cpf|cnpj/i.test(descriptions)) {
    friendly =
      "❌ CPF/CNPJ INVÁLIDO.\n\n👉 Solução: confira o documento informado.";
  } else if (/email|e-mail/i.test(descriptions)) {
    friendly =
      "❌ EMAIL INVÁLIDO.\n\n👉 Solução: confira o email informado.";
  } else if (/phone|telefone|mobile/i.test(descriptions)) {
    friendly =
      "❌ TELEFONE INVÁLIDO.\n\n👉 Solução: informe o telefone com DDD.";
  } else if (code === "invalid_creditcard" || /n[ãa]o autorizad|not authorized|declined|recusad/i.test(descriptions)) {
    friendly =
      "❌ Cartão RECUSADO pelo banco emissor.\n\n👉 Solução: confira os dados, autorize a compra no banco ou tente outro cartão.";
  } else if (/timeout|conex[ãa]o|connection/i.test(descriptions)) {
    friendly =
      "❌ Erro de conexão com o gateway de pagamento.\n\n👉 Solução: aguarde alguns segundos e tente novamente.";
  }

  return friendly;
}

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

    if (!creditCard.holderName || !creditCard.number || !creditCard.expiryMonth || !creditCard.expiryYear || !creditCard.ccv) {
      throw new Error("Dados do cartão incompletos");
    }

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

    const cpfCnpj = customerData.taxId?.replace(/\D/g, "") || "";
    if (!cpfCnpj || cpfCnpj.length < 11) {
      throw new Error("CPF/CNPJ é obrigatório");
    }

    const phone = customerData.phone?.replace(/\D/g, "") || "";
    const postalCode = customerData.postalCode?.replace(/\D/g, "") || "";
    const formattedPostalCode = formatAsaasPostalCode(customerData.postalCode);
    const address = customerData.address?.trim() || "";
    const neighborhood = customerData.neighborhood?.trim() || "";
    const state = toUF(customerData.state);
    const addressMeta = normalizeAddressNumber(customerData.addressNumber);
    const extraComplement = customerData.addressComplement?.trim() || "";
    const addressComplement = [addressMeta.extraComplement, extraComplement].filter(Boolean).join(" - ");
    const phoneInfo = normalizePhoneNumbers(customerData.phone);

    if (!formattedPostalCode) {
      throw new Error("CEP inválido. Informe um CEP válido no formato 00000-000.");
    }

    const realIp = req.headers.get("x-real-ip") || "";
    const forwardedFor = req.headers.get("x-forwarded-for") || "";
    const fallbackIp = realIp || forwardedFor.split(",")[0]?.trim() || "";
    const remoteIp = String(customerData.remoteIp || fallbackIp || "").trim();
    if (!remoteIp || remoteIp === "unknown") {
      throw new Error("Não foi possível identificar o IP do cliente para validar o cartão.");
    }

    logStep("Request received", {
      planKey,
      email: customerData.email,
      postalCode: formattedPostalCode,
      addressNumber: addressMeta.addressNumber,
      remoteIp,
    });

    const findRes = await fetch(`${ASAAS_API}/customers?cpfCnpj=${cpfCnpj}`, {
      headers: { "access_token": apiKey, "Accept": "application/json" },
    });
    const findJson = await findRes.json();

    let customerId: string;
    const customerPayload: Record<string, string | boolean | undefined> = {
      name: customerData.name,
      email: customerData.email,
      cpfCnpj,
      mobilePhone: phoneInfo.mobilePhone,
      phone: phoneInfo.phone,
      postalCode: formattedPostalCode,
      addressNumber: addressMeta.addressNumber,
      complement: addressComplement || undefined,
      notificationDisabled: false,
    };

    if (findJson.data && findJson.data.length > 0) {
      customerId = findJson.data[0].id;
      logStep("Existing customer found, updating address", { customerId, postalCode, state });

      const customerUpdateRes = await fetch(`${ASAAS_API}/customers/${customerId}`, {
        method: "POST",
        headers: {
          "access_token": apiKey,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(customerPayload),
      });
      const customerUpdateJson = await customerUpdateRes.json();

      if (!customerUpdateRes.ok || customerUpdateJson.errors) {
        logStep("Customer update failed", customerUpdateJson);
        throw new Error(`Erro ao atualizar cliente: ${JSON.stringify(customerUpdateJson.errors || customerUpdateJson)}`);
      }
    } else {
      const customerRes = await fetch(`${ASAAS_API}/customers`, {
        method: "POST",
        headers: {
          "access_token": apiKey,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(customerPayload),
      });
      const customerJson = await customerRes.json();

      if (!customerRes.ok || customerJson.errors) {
        logStep("Customer creation failed", customerJson);
        throw new Error(`Erro ao criar cliente: ${JSON.stringify(customerJson.errors || customerJson)}`);
      }

      customerId = customerJson.id;
      logStep("Customer created", { customerId });
    }

    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 7);
    const nextDueDate = trialEnd.toISOString().split("T")[0];

    const subscriptionBody: Record<string, any> = {
      customer: customerId,
      billingType: "CREDIT_CARD",
      cycle: "MONTHLY",
      value: plan.priceMonthly,
      nextDueDate,
      description: `${plan.name} Mensal (após trial 7 dias)`,
      externalReference: resolvedUserId || customerData.email,
      remoteIp,
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
        cpfCnpj,
        postalCode: postalCode || "01310100",
        addressNumber: addressMeta.addressNumber,
        addressComplement: addressComplement || undefined,
        phone,
        mobilePhone: phone || undefined,
      },
    };

    logStep("Creating subscription", {
      customer: customerId,
      cycle: "MONTHLY",
      value: plan.priceMonthly,
      nextDueDate,
      remoteIp,
      holderPostalCode: postalCode,
      holderAddressNumber: addressMeta.addressNumber,
    });

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
      logStep("Subscription creation failed", { response: subJson, request: subscriptionBody });
      throw new Error(buildFriendlyPaymentError(subJson));
    }

    logStep("Subscription created", { id: subJson.id, status: subJson.status, nextDueDate });

    const cardLast4 = creditCard.number.replace(/\s/g, "").slice(-4);
    const cardBrand = subJson.creditCard?.creditCardBrand || "CARD";

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
          address_number: addressMeta.addressNumber || null,
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
        address_number: addressMeta.addressNumber || null,
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
    const isHandledPaymentError = errorMessage.includes("❌");
    return new Response(
      JSON.stringify({ error: errorMessage, handled: isHandledPaymentError }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: isHandledPaymentError ? 400 : 500,
      },
    );
  }
});