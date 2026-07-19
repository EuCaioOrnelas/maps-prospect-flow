// Provider CRM — leads completos com valor em negociação e sumário agregado.
// Sempre expõe:
//   - items[]  -> lista paginada
//   - meta     -> total / page / size
//   - summary  -> total_contacts, taxa_conversao, valor_total_negociacao,
//                 by_stage, avg_score
//
// Filtros suportados:
//   period.from / period.to  (created_at)
//   pagination.page / .size
//   stage_id  (uuid)
//   sort=field:asc|desc
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import type { Provider, ProviderContext } from "../registry/ProviderInterface.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export interface LeadDTO {
  id: string;
  contact_name: string | null;
  company_name: string | null;
  phone: string | null;
  email: string | null;
  category: string | null;
  city: string | null;
  region: string | null;
  rating: number | null;
  review_count: number | null;
  opportunity_level: string | null;
  closing_probability: number | null;
  ai_score: number | null;
  estimated_value: number | null;
  stage_id: string | null;
  first_message_sent: boolean;
  responded: boolean;
  responded_at: string | null;
  created_at: string;
}

async function execute(ctx: ProviderContext) {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const owner = ctx.companyId;
  const page = ctx.filters.pagination?.page ?? 1;
  const size = Math.min(200, ctx.filters.pagination?.size ?? 50);
  const fromIdx = (page - 1) * size;
  const toIdx = fromIdx + size - 1;

  const sortMap: Record<string, string> = {
    created_at: "created_at",
    ai_score: "ai_score",
    estimated_value: "estimated_value",
    closing_probability: "closing_probability",
    opportunity_level: "opportunity_level",
    contact_name: "contact_name",
    company_name: "company_name",
    stage_id: "pipeline_stage_id",
    rating: "rating",
  };

  const cols = "id, contact_name, company_name, phone, email, category, city, region, rating, review_count, opportunity_level, closing_probability, ai_score, estimated_value, pipeline_stage_id, first_message_sent, has_responded, responded_at, created_at";

  // Query paginada (list)
  let q = admin.from("leads").select(cols, { count: "exact" }).eq("owner_user_id", owner);
  if (ctx.filters.stage_id) q = q.eq("pipeline_stage_id", ctx.filters.stage_id);
  if (ctx.filters.period?.from) q = q.gte("created_at", ctx.filters.period.from);
  if (ctx.filters.period?.to)   q = q.lte("created_at", ctx.filters.period.to);
  const [sortField, sortDir] = (ctx.filters.sort ?? "created_at:desc").split(":");
  q = q.order(sortMap[sortField] ?? "created_at", { ascending: sortDir === "asc" });
  q = q.range(fromIdx, toIdx);

  // Query summary (agregada sobre TODOS os leads filtrados, sem paginação)
  let sq = admin.from("leads")
    .select("estimated_value, has_responded, ai_score, pipeline_stage_id, opportunity_level")
    .eq("owner_user_id", owner);
  if (ctx.filters.stage_id) sq = sq.eq("pipeline_stage_id", ctx.filters.stage_id);
  if (ctx.filters.period?.from) sq = sq.gte("created_at", ctx.filters.period.from);
  if (ctx.filters.period?.to)   sq = sq.lte("created_at", ctx.filters.period.to);

  const [{ data, error, count }, sumRes] = await Promise.all([q, sq]);
  if (error) throw new Error(error.message);
  if (sumRes.error) throw new Error(sumRes.error.message);

  const summaryRows = sumRes.data ?? [];
  const totalContacts = summaryRows.length;
  const totalNegotiationValue = summaryRows.reduce((s, l: any) => s + Number(l.estimated_value || 0), 0);
  const respondedCount = summaryRows.filter((l: any) => l.has_responded).length;
  const conversionRate = totalContacts > 0 ? Number((respondedCount / totalContacts).toFixed(4)) : 0;
  const scoredSummary = summaryRows.filter((l: any) => (l.ai_score ?? 0) > 0);
  const avgScore = scoredSummary.length
    ? Math.round(scoredSummary.reduce((s, l: any) => s + Number(l.ai_score || 0), 0) / scoredSummary.length)
    : 0;

  const byStage: Record<string, { count: number; value: number }> = {};
  for (const l of summaryRows as any[]) {
    const key = l.pipeline_stage_id ?? "sem_estagio";
    byStage[key] ??= { count: 0, value: 0 };
    byStage[key].count += 1;
    byStage[key].value += Number(l.estimated_value || 0);
  }

  const items: LeadDTO[] = (data ?? []).map((l: any) => ({
    id: l.id,
    contact_name: l.contact_name,
    company_name: l.company_name,
    phone: l.phone,
    email: l.email,
    category: l.category,
    city: l.city,
    region: l.region,
    rating: l.rating,
    review_count: l.review_count,
    opportunity_level: l.opportunity_level,
    closing_probability: l.closing_probability,
    ai_score: l.ai_score,
    estimated_value: l.estimated_value,
    stage_id: l.pipeline_stage_id,
    first_message_sent: Boolean(l.first_message_sent),
    responded: Boolean(l.has_responded),
    responded_at: l.responded_at,
    created_at: l.created_at,
  }));

  return {
    data: {
      items,
      meta: { total: count ?? totalContacts, page, size },
      summary: {
        total_contacts: totalContacts,
        responded: respondedCount,
        taxa_conversao: conversionRate,
        valor_total_negociacao: totalNegotiationValue,
        avg_ai_score: avgScore,
        by_stage: byStage,
        currency: "BRL",
      },
    },
    recordsCount: items.length,
  };
}

export const crmProvider: Provider = {
  metadata: {
    name: "crm",
    description: "Leads do CRM com paginação, filtros e sumário agregado (total, conversão, valor em negociação).",
    version: "2.0.0",
    requiredPermissions: [],
    minimumPlan: "start",
    supportedFilters: ["period", "pagination", "stage_id", "sort"],
    defaultCacheTTL: 30,
    priority: 2,
    dependencies: [],
    inputSchema: {
      "filters.pagination": "{page,size}",
      "filters.stage_id": "uuid?",
      "filters.period": "{from,to}?",
      "filters.sort": "field:asc|desc?",
    },
    outputSchema: {
      items: "LeadDTO[]",
      "meta.total": "number",
      "summary.total_contacts": "number",
      "summary.taxa_conversao": "number 0..1",
      "summary.valor_total_negociacao": "number BRL",
      "summary.avg_ai_score": "number",
      "summary.by_stage": "{ [stage_id]: { count, value } }",
    },
    status: "stable",
  },
  execute,
};
