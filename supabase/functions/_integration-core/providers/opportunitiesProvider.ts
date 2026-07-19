// Provider Opportunities — panorama completo de oportunidades comerciais.
// Consolida totais, qualificados, alta oportunidade, score médio E breakdowns
// por categoria, cidade, avaliação (rating), índice de fechamento (closing_probability),
// intenção, resposta e status.
//
// Filtros:
//   period.from / period.to  -> ISO 8601. Ausente = histórico total.
//   pagination.page / .size  -> aplica-se somente ao array items[].
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import type { Provider, ProviderContext } from "../registry/ProviderInterface.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function bucketize<T>(arr: T[], keyFn: (v: T) => string | null): Record<string, number> {
  const out: Record<string, number> = {};
  for (const v of arr) {
    const k = keyFn(v) ?? "desconhecido";
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

function avg(arr: number[]): number {
  return arr.length ? Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2)) : 0;
}

async function execute(ctx: ProviderContext) {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const owner = ctx.companyId;
  const from = ctx.filters.period?.from ?? null;
  const to = ctx.filters.period?.to ?? null;
  const page = ctx.filters.pagination?.page ?? 1;
  const size = Math.min(200, ctx.filters.pagination?.size ?? 50);

  const cols = "id, contact_name, company_name, phone, category, city, region, rating, review_count, opportunity_level, closing_probability, ai_score, estimated_value, has_responded, first_message_sent, pipeline_stage_id, created_at";
  let q = admin.from("leads").select(cols).eq("owner_user_id", owner);
  if (from) q = q.gte("created_at", from);
  if (to)   q = q.lte("created_at", to);
  const { data, error } = await q;
  if (error) throw new Error(error.message);

  const rows: any[] = data ?? [];
  const total = rows.length;
  // "Qualificados" = leads com opportunity_level definido
  const qualified = rows.filter(r => !!r.opportunity_level);
  // "Alta Oportunidade" = opportunity_level em ["alto","alta","high","muito_alto"]
  const highOpp = rows.filter(r =>
    ["alto", "alta", "high", "muito_alto"].includes(String(r.opportunity_level || "").toLowerCase())
  );
  const scored = rows.filter(r => (r.ai_score ?? 0) > 0);
  const responded = rows.filter(r => r.has_responded);
  const sent = rows.filter(r => r.first_message_sent);

  // Breakdowns
  const byCategory = bucketize(rows, r => r.category);
  const byCity = bucketize(rows, r => r.city);
  const byOpportunityLevel = bucketize(rows, r => r.opportunity_level);
  const byRating = bucketize(rows, r => {
    const v = Number(r.rating || 0);
    if (!v) return "sem_avaliacao";
    if (v >= 4.5) return "4.5+";
    if (v >= 4.0) return "4.0-4.4";
    if (v >= 3.0) return "3.0-3.9";
    return "<3.0";
  });
  const byClosingProbability = bucketize(rows, r => {
    const v = Number(r.closing_probability || 0);
    if (!v) return "sem_probabilidade";
    if (v >= 80) return "80-100";
    if (v >= 60) return "60-79";
    if (v >= 40) return "40-59";
    if (v >= 20) return "20-39";
    return "0-19";
  });
  const byScore = bucketize(rows, r => {
    const s = Number(r.ai_score || 0);
    if (!s) return "sem_score";
    if (s >= 801) return "pronto_venda";
    if (s >= 601) return "alto_valor";
    if (s >= 401) return "engajado";
    if (s >= 201) return "baixo_engajamento";
    return "frio";
  });

  // Paginated items (ordenados por score/valor)
  const sorted = [...rows].sort((a, b) => {
    const sa = Number(a.ai_score || 0), sb = Number(b.ai_score || 0);
    if (sb !== sa) return sb - sa;
    return Number(b.estimated_value || 0) - Number(a.estimated_value || 0);
  });
  const items = sorted.slice((page - 1) * size, page * size).map(r => ({
    id: r.id,
    contact_name: r.contact_name,
    company_name: r.company_name,
    phone: r.phone,
    category: r.category,
    city: r.city,
    region: r.region,
    rating: r.rating,
    review_count: r.review_count,
    opportunity_level: r.opportunity_level,
    closing_probability: r.closing_probability,
    ai_score: r.ai_score,
    estimated_value: r.estimated_value,
    responded: Boolean(r.has_responded),
    sent: Boolean(r.first_message_sent),
    stage_id: r.pipeline_stage_id,
    created_at: r.created_at,
  }));

  const data_out = {
    period: { from, to, fallback_all_time: !from && !to },
    summary: {
      total,
      qualified: qualified.length,
      high_opportunity: highOpp.length,
      avg_score: scored.length ? Math.round(scored.reduce((s, r) => s + Number(r.ai_score || 0), 0) / scored.length) : 0,
      responded: responded.length,
      sent: sent.length,
      response_rate: sent.length > 0 ? Number((responded.length / sent.length).toFixed(4)) : 0,
      qualification_rate: total > 0 ? Number((qualified.length / total).toFixed(4)) : 0,
      total_estimated_value: rows.reduce((s, r) => s + Number(r.estimated_value || 0), 0),
      avg_rating: avg(rows.filter(r => r.rating).map(r => Number(r.rating))),
      avg_closing_probability: avg(rows.filter(r => r.closing_probability).map(r => Number(r.closing_probability))),
      currency: "BRL",
    },
    breakdowns: {
      by_category: byCategory,
      by_city: byCity,
      by_opportunity_level: byOpportunityLevel,
      by_rating: byRating,
      by_closing_probability: byClosingProbability,
      by_score_bucket: byScore,
    },
    items,
    meta: { total, page, size, returned: items.length },
  };

  return { data: data_out, recordsCount: total };
}

export const opportunitiesProvider: Provider = {
  metadata: {
    name: "opportunities",
    description: "Panorama completo de oportunidades: totais, qualificados, alta oportunidade, score médio e breakdowns por categoria, cidade, rating, probabilidade, score e status.",
    version: "1.0.0",
    requiredPermissions: [],
    minimumPlan: "growth",
    supportedFilters: ["period", "pagination"],
    defaultCacheTTL: 60,
    priority: 2,
    dependencies: [],
    inputSchema: { "filters.period": "{from,to}?", "filters.pagination": "{page,size}?" },
    outputSchema: {
      "summary.total": "number",
      "summary.qualified": "number",
      "summary.high_opportunity": "number",
      "summary.avg_score": "number",
      "summary.total_estimated_value": "number BRL",
      "breakdowns.by_category": "{ [category]: count }",
      "breakdowns.by_city": "{ [city]: count }",
      "breakdowns.by_rating": "{ '4.5+'|'4.0-4.4'|...: count }",
      "breakdowns.by_closing_probability": "{ '80-100'|...: count }",
      "breakdowns.by_score_bucket": "{ pronto_venda|alto_valor|...: count }",
      items: "OpportunityDTO[]",
    },
    status: "stable",
  },
  execute,
};
