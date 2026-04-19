// Cria conta de trial com cartão tokenizado e assinatura agendada para D+7 no Asaas.
// O cartão NÃO é cobrado agora — apenas tokenizado (a Asaas valida o cartão fazendo um auth de R$ 0).
// A subscription é criada com nextDueDate = trial_end (D+7) e ciclo MONTHLY.
// Se o user cancelar antes do D+7, a subscription é deletada e nada é cobrado.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ASAAS_API = "https://api.asaas.com/v3";

const log = (step: string, details?: unknown) => {
  console.log(`[TRIAL-WITH-CARD] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

// Trial sempre vira plano MENSAL (independente da escolha) — confirmado pelo product
const PLAN_CONFIG: Record<string, { name: string; priceMonthly: number; searchesLimit: number }> = {
  start: { name: "Wiize Start", priceMonthly: 296.0, searchesLimit: 1000 },
  growth: { name: "Wiize Growth", priceMonthly: 696.0, searchesLimit: 3000 },
  scale: { name: "Wiize Scale", priceMonthly: 1496.0, searchesLimit: 10000 },
};

const BRAZIL_STATE_CODES: Record<string, string> = {
  "acre": "AC",
  "alagoas": "AL",
  "amapa": "AP",
  "amazonas": "AM",
  "bahia": "BA",
  "ceara": "CE",
  "distrito federal": "DF",
  "espirito santo": "ES",
  "goias": "GO",
  "maranhao": "MA",
  "mato grosso": "MT",
  "mato grosso do sul": "MS",
  "minas gerais": "MG",
  "para": "PA",
  "paraiba": "PB",
  "parana": "PR",
  "pernambuco": "PE",
  "piaui": "PI",
  "rio de janeiro": "RJ",
  "rio grande do norte": "RN",
  "rio grande do sul": "RS",
  "rondonia": "RO",
  "roraima": "RR",
  "santa catarina": "SC",
  "sao paulo": "SP",
  "sergipe": "SE",
  "tocantins": "TO",
};

export const normalizeBrazilianState = (value?: string | null) => {
  const raw = (value || "").trim();
  if (!raw) return "SP";

  const normalized = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (normalized.length === 2) return normalized.toUpperCase();

  return BRAZIL_STATE_CODES[normalized] || raw.toUpperCase().slice(0, 2) || "SP";
};

export const buildCreditCardHolderInfo = ({
  customerData,
  cpfCnpj,
  postalCode,
  city,
  state,
  phone,
}: {
  customerData: Record<string, string>;
  cpfCnpj: string;
  postalCode: string;
  city: string;
  state: string;
  phone: string;
}) => ({
  name: customerData.name,
  email: customerData.email,
  cpfCnpj,
  postalCode: postalCode || "01310100",
  addressNumber: customerData.addressNumber || "S/N",
  address: customerData.address || "Não informado",
  province: customerData.neighborhood || "Centro",
  cityName: city,
  state: normalizeBrazilianState(state),
  phone,
  mobilePhone: phone,
});

const buildDirectSubscriptionHolderInfo = ({
  customerData,
  cpfCnpj,
  postalCode,
  city,
  state,
  phone,
}: {
  customerData: Record<string, string>;
  cpfCnpj: string;
  postalCode: string;
  city: string;
  state: string;
  phone: string;
}) => ({
  name: customerData.name,
  email: customerData.email,
  cpfCnpj,
  postalCode: postalCode || "01310100",
  addressNumber: customerData.addressNumber || "S/N",
  address: customerData.address || "Não informado",
  province: customerData.neighborhood || "Centro",
  cityName: city,
  state: normalizeBrazilianState(state),
  phone,
  mobilePhone: phone,
});

const extractAsaasErrorMessage = (payload: any) =>
  payload?.errors?.map((e: { description: string }) => e.description).join(", ") || JSON.stringify(payload);

const getRemoteIp = (req: Request) => {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();

  return req.headers.get("x-real-ip") || "127.0.0.1";
};

const buildAsaasCustomerPayload = ({
  customerData,
  cpfCnpj,
  phone,
  postalCode,
  city,
  state,
}: {
  customerData: Record<string, string>;
  cpfCnpj: string;
  phone: string;
  postalCode: string;
  city: string;
  state: string;
}) => ({
  name: customerData.name,
  email: customerData.email,
  cpfCnpj,
  mobilePhone: phone,
  notificationDisabled: false,
  postalCode: postalCode || "01310100",
  address: customerData.address || "Não informado",
  addressNumber: customerData.addressNumber || "S/N",
  province: customerData.neighborhood || "Centro",
  city,
  state: normalizeBrazilianState(state),
  complement: customerData.addressComplement || undefined,
});

if (import.meta.main) serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("ASAAS_API_KEY");
    if (!apiKey) throw new Error("ASAAS_API_KEY not configured");
    const remoteIp = getRemoteIp(req);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { userId, planKey, customerData, creditCard } = await req.json();
    if (!planKey || !customerData || !creditCard) {
      throw new Error("planKey, customerData and creditCard are required");
    }

    const plan = PLAN_CONFIG[planKey];
    if (!plan) throw new Error(`Invalid plan: ${planKey}`);

    log("Request", { userId, planKey, email: customerData.email });

    // Validate
    const cpfCnpj = (customerData.taxId || "").replace(/\D/g, "");
    if (!cpfCnpj || cpfCnpj.length < 11) throw new Error("CPF/CNPJ é obrigatório");
    if (!creditCard.holderName || !creditCard.number || !creditCard.expiryMonth || !creditCard.expiryYear || !creditCard.ccv) {
      throw new Error("Dados do cartão incompletos");
    }

    const phone = (customerData.phone || "").replace(/\D/g, "");
    const postalCode = (customerData.postalCode || "").replace(/\D/g, "");

    // Lookup city/state via ViaCEP if not provided
    let city = customerData.city || "";
    let state = customerData.state || "";
    if ((!city || !state) && postalCode.length === 8) {
      try {
        const cepRes = await fetch(`https://viacep.com.br/ws/${postalCode}/json/`);
        const cepJson = await cepRes.json();
        if (!cepJson.erro) {
          city = city || cepJson.localidade || "";
          state = state || cepJson.uf || "";
        }
      } catch (_) { /* ignore */ }
    }
    if (!city) city = "São Paulo";
    if (!state) state = "SP";
    city = city.trim() || "São Paulo";
    state = normalizeBrazilianState(state);

    // 1. Find or create Asaas customer
    const findRes = await fetch(`${ASAAS_API}/customers?cpfCnpj=${cpfCnpj}`, {
      headers: { access_token: apiKey, Accept: "application/json" },
    });
    const findJson = await findRes.json();

    const customerPayload = buildAsaasCustomerPayload({ customerData, cpfCnpj, phone, postalCode, city, state });

    let customerId: string;
    if (findJson.data && findJson.data.length > 0) {
      customerId = findJson.data[0].id;
      log("Existing customer", { customerId });

      const updateRes = await fetch(`${ASAAS_API}/customers/${customerId}`, {
        method: "POST",
        headers: { access_token: apiKey, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(customerPayload),
      });
      const updateJson = await updateRes.json();
      if (!updateRes.ok || updateJson.errors) {
        log("Customer update failed", updateJson);
      } else {
        log("Customer updated", { customerId, city: customerPayload.city, state: customerPayload.state });
      }
    } else {
      const cRes = await fetch(`${ASAAS_API}/customers`, {
        method: "POST",
        headers: { access_token: apiKey, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(customerPayload),
      });
      const cJson = await cRes.json();
      if (!cRes.ok || cJson.errors) {
        throw new Error(`Erro criando cliente: ${JSON.stringify(cJson.errors || cJson)}`);
      }
      customerId = cJson.id;
      log("Customer created", { customerId });
    }

    // 2. Compute trial end date (7 days from now)
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 7);
    const nextDueDate = trialEnd.toISOString().split("T")[0];

    // 3. Reaproveita trial já criado para evitar múltiplas assinaturas em retries.
    let existingSubscription: any = null;
    const existingSubsRes = await fetch(`${ASAAS_API}/subscriptions?customer=${customerId}&limit=100&offset=0`, {
      headers: { access_token: apiKey, Accept: "application/json" },
    });
    const existingSubsJson = await existingSubsRes.json().catch(() => ({}));
    if (existingSubsRes.ok && Array.isArray(existingSubsJson.data)) {
      existingSubscription = existingSubsJson.data.find((subscription: any) => {
        const description = String(subscription?.description || "").toLowerCase();
        const externalReference = String(subscription?.externalReference || "");
        return description.includes("após trial 7 dias")
          && [customerData.email, userId].filter(Boolean).includes(externalReference)
          && Number(subscription?.value) === Number(plan.priceMonthly);
      }) || null;
    }

    let cardLast4 = creditCard.number.replace(/\s/g, "").slice(-4);
    let cardBrand = "CARD";
    let subJson = existingSubscription;

    if (!subJson) {
      const subBody: Record<string, unknown> = {
        customer: customerId,
        billingType: "CREDIT_CARD",
        cycle: "MONTHLY",
        value: plan.priceMonthly,
        nextDueDate,
        description: `${plan.name} Mensal (após trial 7 dias)`,
        externalReference: userId || customerData.email,
        remoteIp,
        creditCard: {
          holderName: creditCard.holderName,
          number: creditCard.number.replace(/\s/g, ""),
          expiryMonth: creditCard.expiryMonth,
          expiryYear: creditCard.expiryYear,
          ccv: creditCard.ccv,
        },
        creditCardHolderInfo: buildDirectSubscriptionHolderInfo({
          customerData,
          cpfCnpj,
          postalCode,
          city,
          state,
          phone,
        }),
      };

      log("Creating subscription scheduled for", { nextDueDate, remoteIp, customerId, city, state });

      const subRes = await fetch(`${ASAAS_API}/subscriptions`, {
        method: "POST",
        headers: { access_token: apiKey, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(subBody),
      });
      subJson = await subRes.json();
      if (!subRes.ok || subJson.errors) {
        log("Subscription failed", subJson);
        throw new Error(extractAsaasErrorMessage(subJson));
      }
      log("Subscription created", { id: subJson.id, status: subJson.status });
    } else {
      log("Reusing existing trial subscription", { id: subJson.id, status: subJson.status });
    }

    // 4. Extract card details for display
    cardBrand = cardBrand || subJson.creditCard?.creditCardBrand || "CARD";

    // 6. Save trial info on profile (only if userId is provided — otherwise just validate)
    if (userId) {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          trial_card_last4: cardLast4,
          trial_card_brand: cardBrand,
          trial_card_token: null,
          trial_asaas_subscription_id: subJson.id,
          trial_asaas_customer_id: customerId,
          trial_plan_chosen: planKey,
          trial_billing_period: "monthly",
          trial_will_charge_at: trialEnd.toISOString(),
          trial_auto_charge_cancelled: false,
          cpf: cpfCnpj,
          phone: customerData.phone || null,
          postal_code: postalCode || null,
          address: customerData.address || null,
          address_number: customerData.addressNumber || null,
          neighborhood: customerData.neighborhood || null,
          city: city || null,
          state: state || null,
        })
        .eq("id", userId);

      if (updateError) {
        log("Profile update failed", updateError);
      }
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
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
