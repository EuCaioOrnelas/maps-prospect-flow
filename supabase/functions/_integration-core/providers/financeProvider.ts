// Provider Finance / Sales — vendas fechadas, MRR, projeção 12m.
// Fonte: lead_deals. Regra de MRR e projeção espelha src/hooks/useSales.ts.
//
// Filtros:
//   period.from / period.to -> aplica sobre created_at das vendas.
//   Ausente = histórico total (fallback).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import type { Provider, ProviderContext } from "../registry/ProviderInterface.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function execute(ctx: ProviderContext) {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const owner = ctx.companyId;
  const from = ctx.filters.period?.from ?? null;
  const to = ctx.filters.period?.to ?? null;

  let q = admin.from("lead_deals")
    .select("id, lead_id, title, value, sale_type, contract_months, status, payment_method, start_date, expiration_date, closed_at, created_at")
    .eq("owner_user_id", owner)
    .order("created_at", { ascending: false });
  if (from) q = q.gte("created_at", from);
  if (to)   q = q.lte("created_at", to);
  const { data, error } = await q;
  if (error) throw new Error(error.message);

  const sales: any[] = data ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const isActive = (s: any) => s.status === "active" && (!s.expiration_date || s.expiration_date >= today);

  const receitaTotal = sales.reduce((acc, s) => {
    const val = Number(s.value || 0);
    return acc + (s.sale_type === "one_time" ? val : val * Number(s.contract_months || 1));
  }, 0);

  const mrrAtivo = sales.filter(s => s.sale_type === "recurring" && isActive(s))
    .reduce((acc, s) => acc + Number(s.value || 0), 0);

  const vendasAtivas = sales.filter(isActive).length;

  const projected12mo = sales.filter(s => s.sale_type === "recurring" && isActive(s))
    .reduce((acc, s) => {
      if (!s.expiration_date) return acc + Number(s.value || 0) * 12;
      const months = Math.max(0, Math.min(12, Math.ceil(
        (new Date(s.expiration_date).getTime() - Date.now()) / (30 * 86_400_000)
      )));
      return acc + Number(s.value || 0) * months;
    }, 0);

  const expiringSoon = sales.filter(s => {
    if (!isActive(s) || !s.expiration_date) return false;
    const days = (new Date(s.expiration_date).getTime() - Date.now()) / 86_400_000;
    return days >= 0 && days <= 30;
  }).length;

  // Distribuição por meio de pagamento
  const byPayment: Record<string, number> = {};
  for (const s of sales) {
    const k = s.payment_method || "desconhecido";
    byPayment[k] = (byPayment[k] ?? 0) + 1;
  }

  return {
    data: {
      period: { from, to, fallback_all_time: !from && !to },
      summary: {
        receita_total: Math.round(receitaTotal),
        mrr_ativo: Math.round(mrrAtivo),
        vendas_ativas: vendasAtivas,
        projecao_12_meses: Math.round(projected12mo),
        vendas_expirando_30d: expiringSoon,
        total_registros: sales.length,
        currency: "BRL",
      },
      breakdowns: {
        by_payment_method: byPayment,
        by_type: {
          one_time: sales.filter(s => s.sale_type === "one_time").length,
          recurring: sales.filter(s => s.sale_type === "recurring").length,
        },
      },
      items: sales.map(s => ({
        id: s.id,
        lead_id: s.lead_id,
        title: s.title,
        value: Number(s.value || 0),
        sale_type: s.sale_type,
        contract_months: s.contract_months,
        status: s.status,
        payment_method: s.payment_method,
        start_date: s.start_date,
        expiration_date: s.expiration_date,
        closed_at: s.closed_at,
        created_at: s.created_at,
        is_active: isActive(s),
      })),
    },
    recordsCount: sales.length,
  };
}

export const financeProvider: Provider = {
  metadata: {
    name: "finance",
    description: "Vendas fechadas e métricas financeiras: receita total, MRR ativo, vendas ativas, projeção 12 meses.",
    version: "1.0.0",
    requiredPermissions: [],
    minimumPlan: "start",
    supportedFilters: ["period"],
    defaultCacheTTL: 60,
    priority: 4,
    dependencies: [],
    inputSchema: { "filters.period": "{from,to}?" },
    outputSchema: {
      "summary.receita_total": "number BRL acumulado",
      "summary.mrr_ativo": "number BRL/mês",
      "summary.vendas_ativas": "number",
      "summary.projecao_12_meses": "number BRL",
      items: "SaleDTO[]",
    },
    status: "stable",
  },
  execute,
};
