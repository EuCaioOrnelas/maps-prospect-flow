// Edge function: consulta a API do Asaas em tempo real e retorna:
// - Assinantes ativos (cartão recorrente + PIX automático)
// - MRR consolidado
// - Lista de pagamentos PIX recentes
// Útil para o admin ter a verdade vinda direto do Asaas, sem depender do banco local.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: any) => {
  console.log(`[ADMIN-ASAAS-STATS] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

const ASAAS_BASE = "https://api.asaas.com/v3";

interface AsaasSubscription {
  id: string;
  customer: string;
  value: number;
  cycle: string; // MONTHLY | YEARLY
  status: string; // ACTIVE | INACTIVE | EXPIRED
  billingType: string; // CREDIT_CARD | PIX | BOLETO
  description?: string;
  nextDueDate?: string;
  dateCreated?: string;
}

interface AsaasPixAuth {
  id: string;
  customer: string;
  value: number;
  frequency?: string; // MONTHLY | YEARLY
  status: string; // ACTIVE | CANCELLED | EXPIRED
  description?: string;
  nextScheduledDate?: string;
  dateCreated?: string;
}

interface AsaasPayment {
  id: string;
  customer: string;
  customerName?: string;
  value: number;
  netValue?: number;
  status: string; // CONFIRMED | RECEIVED | PENDING | OVERDUE | REFUNDED
  billingType: string;
  description?: string;
  dueDate?: string;
  paymentDate?: string;
  confirmedDate?: string;
  invoiceUrl?: string;
  subscription?: string;
  pixAutomaticAuthorizationId?: string;
}

async function fetchAllPages<T>(url: string, apiKey: string, max: number = 500): Promise<T[]> {
  const all: T[] = [];
  let offset = 0;
  const limit = 100;
  while (all.length < max) {
    const u = new URL(url);
    u.searchParams.set("limit", String(limit));
    u.searchParams.set("offset", String(offset));
    const res = await fetch(u.toString(), {
      headers: { access_token: apiKey, "Content-Type": "application/json" },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Asaas API ${res.status}: ${text.slice(0, 200)}`);
    }
    const json = await res.json();
    const data: T[] = json.data || [];
    all.push(...data);
    if (data.length < limit) break;
    offset += limit;
  }
  return all;
}

async function fetchCustomersMap(apiKey: string, customerIds: string[]): Promise<Map<string, { name?: string; email?: string; cpfCnpj?: string }>> {
  // Asaas /customers permite buscar de uma vez por id; para simplicidade buscamos lote pequeno.
  const map = new Map<string, any>();
  // Limite para não ultrapassar tempo da edge function
  const unique = Array.from(new Set(customerIds)).slice(0, 200);
  await Promise.all(
    unique.map(async (id) => {
      try {
        const res = await fetch(`${ASAAS_BASE}/customers/${id}`, {
          headers: { access_token: apiKey, "Content-Type": "application/json" },
        });
        if (res.ok) {
          const c = await res.json();
          map.set(id, { name: c.name, email: c.email, cpfCnpj: c.cpfCnpj });
        }
      } catch (_) { /* ignore */ }
    })
  );
  return map;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth: verificar admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ?? "";

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Validar o mesmo status de admin usado pelo frontend, com o token do usuário.
    const { data: isAdmin, error: adminError } = await userClient.rpc("is_current_user_admin");
    if (adminError || isAdmin !== true) {
      log("Forbidden", { adminError: adminError?.message || null, isAdmin });
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    const apiKey = Deno.env.get("ASAAS_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "ASAAS_API_KEY not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    log("Fetching subscriptions and PIX auths");

    // 1. Subscriptions ativas (recurring CREDIT_CARD/BOLETO)
    const subs = await fetchAllPages<AsaasSubscription>(
      `${ASAAS_BASE}/subscriptions?status=ACTIVE`,
      apiKey,
      500
    );

    // 2. PIX automático — endpoint correto usado na criação/polling é /pix/automatic/authorizations.
    // Mantemos fallback para o endpoint antigo caso a API varie por conta/ambiente.
    let pixAuths: AsaasPixAuth[] = [];
    try {
      pixAuths = await fetchAllPages<AsaasPixAuth>(
        `${ASAAS_BASE}/pix/automatic/authorizations?status=ACTIVE`,
        apiKey,
        500
      );
    } catch (primaryError) {
      log("PIX automatic endpoint failed, trying legacy endpoint", { error: String(primaryError) });
      try {
        pixAuths = await fetchAllPages<AsaasPixAuth>(
          `${ASAAS_BASE}/pix/recurring/authorizations?status=ACTIVE`,
          apiKey,
          500
        );
      } catch (legacyError) {
        log("PIX auths endpoints not available", { primaryError: String(primaryError), legacyError: String(legacyError) });
      }
    }

    // 3. Pagamentos recentes (últimos 90 dias) — para faturas PIX e MRR realizado
    const since = new Date();
    since.setDate(since.getDate() - 90);
    const sinceStr = since.toISOString().slice(0, 10);

    const paymentsAll = await fetchAllPages<AsaasPayment>(
      `${ASAAS_BASE}/payments?dateCreated[ge]=${sinceStr}`,
      apiKey,
      1000
    );

    // Filtrar PIX (independentemente de status) e cartão
    const pixPayments = paymentsAll.filter((p) => p.billingType === "PIX");
    const cardPayments = paymentsAll.filter((p) => p.billingType === "CREDIT_CARD");

    // Buscar nomes dos clientes únicos (apenas para PIX, para mostrar na tabela)
    const customerIds = pixPayments.map((p) => p.customer);
    const customerMap = await fetchCustomersMap(apiKey, customerIds);

    // Set de subscription IDs (cartão) e PIX auth IDs que JÁ tiveram cobrança confirmada.
    // Sub Asaas vira ACTIVE assim que o cartão é cadastrado, mesmo em trial não-pago.
    // Para o MRR só contam subs que efetivamente cobraram pelo menos uma vez.
    const paidCardSubIds = new Set<string>();
    for (const p of cardPayments) {
      if (!p.subscription) continue;
      if (p.status === "CONFIRMED" || p.status === "RECEIVED") {
        paidCardSubIds.add(p.subscription);
      }
    }
    const paidPixAuthIds = new Set<string>();
    for (const p of pixPayments) {
      const authId = p.pixAutomaticAuthorizationId || p.subscription;
      if (!authId) continue;
      if (p.status === "CONFIRMED" || p.status === "RECEIVED") {
        paidPixAuthIds.add(authId);
      }
    }

    // ==== MRR consolidado ====
    // Cartão recorrente: somar valor mensalizado APENAS de subs com pagamento confirmado.
    let cardMrr = 0;
    let cardSubsCount = 0;
    let cardTrialMrr = 0;
    let cardTrialSubsCount = 0;
    for (const s of subs) {
      if (s.billingType !== "CREDIT_CARD") continue;
      const monthly = s.cycle === "YEARLY" ? s.value / 12 : s.value;
      if (paidCardSubIds.has(s.id)) {
        cardMrr += monthly;
        cardSubsCount++;
      } else {
        cardTrialMrr += monthly;
        cardTrialSubsCount++;
        log("Skipping unpaid card sub (trial/never paid)", { id: s.id, value: s.value });
      }
    }

    // PIX automático: mesma lógica
    let pixMrr = 0;
    let pixSubsCount = 0;
    let pixTrialMrr = 0;
    let pixTrialSubsCount = 0;
    for (const a of pixAuths) {
      const monthly = a.frequency === "YEARLY" ? a.value / 12 : a.value;
      if (paidPixAuthIds.has(a.id)) {
        pixMrr += monthly;
        pixSubsCount++;
      } else {
        pixTrialMrr += monthly;
        pixTrialSubsCount++;
        log("Skipping unpaid PIX auth (trial/never paid)", { id: a.id, value: a.value });
      }
    }

    // ==== Faturas PIX (formatadas para a UI) ====
    const pixInvoices = pixPayments.map((p) => {
      const cust = customerMap.get(p.customer) || {};
      return {
        id: p.id,
        customer_id: p.customer,
        customer_name: cust.name || p.customerName || "—",
        customer_email: cust.email || null,
        customer_doc: cust.cpfCnpj || null,
        value: p.value,
        net_value: p.netValue || null,
        status: p.status, // CONFIRMED | RECEIVED | PENDING | OVERDUE | REFUNDED
        description: p.description || null,
        due_date: p.dueDate || null,
        payment_date: p.paymentDate || p.confirmedDate || null,
        invoice_url: p.invoiceUrl || null,
        subscription_id: p.subscription || p.pixAutomaticAuthorizationId || null,
      };
    });

    // ==== Métricas de receita PIX deste mês ====
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthStartStr = monthStart.toISOString().slice(0, 10);

    const pixReceivedThisMonth = pixPayments
      .filter((p) => {
        if (!["CONFIRMED", "RECEIVED"].includes(p.status)) return false;
        const d = p.paymentDate || p.confirmedDate;
        return d && d >= monthStartStr;
      })
      .reduce((s, p) => s + (p.netValue || p.value), 0);

    const pixPendingCount = pixPayments.filter((p) => p.status === "PENDING").length;
    const pixOverdueCount = pixPayments.filter((p) => p.status === "OVERDUE").length;
    const pixPaidCount = pixPayments.filter((p) => ["CONFIRMED", "RECEIVED"].includes(p.status)).length;

    log("Done", {
      cardSubs: cardSubsCount,
      pixSubs: pixSubsCount,
      cardMrr,
      pixMrr,
      pixInvoicesCount: pixInvoices.length,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        summary: {
          card_active_subs: cardSubsCount,
          pix_active_subs: pixSubsCount,
          total_active_subs: cardSubsCount + pixSubsCount,
          card_mrr: cardMrr,
          pix_mrr: pixMrr,
          total_mrr: cardMrr + pixMrr,
          pix_received_this_month: pixReceivedThisMonth,
          pix_paid_count_90d: pixPaidCount,
          pix_pending_count_90d: pixPendingCount,
          pix_overdue_count_90d: pixOverdueCount,
        },
        pix_invoices: pixInvoices,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("ERROR", { msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
