// Provider CRM — leads. Nunca vaza colunas internas nem tokens.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import type { Provider, ProviderContext } from "../registry/ProviderInterface.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export interface LeadDTO {
  id: string;
  contact_name: string | null;
  company_name: string | null;
  opportunity_level: string | null;
  ai_score: number | null;
  stage_id: string | null;
  responded: boolean;
  created_at: string;
}

async function execute(ctx: ProviderContext) {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const page = ctx.filters.pagination?.page ?? 1;
  const size = ctx.filters.pagination?.size ?? 50;
  const from = (page - 1) * size;
  const to = from + size - 1;

  let q = admin
    .from("leads")
    .select("id, contact_name, company_name, opportunity_level, ai_score, stage_id, has_responded, created_at", { count: "exact" })
    .eq("user_id", ctx.companyId);

  if (ctx.filters.stage_id) q = q.eq("stage_id", ctx.filters.stage_id);
  if (ctx.filters.period?.from) q = q.gte("created_at", ctx.filters.period.from);
  if (ctx.filters.period?.to) q = q.lte("created_at", ctx.filters.period.to);

  const [sortField, sortDir] = (ctx.filters.sort ?? "created_at:desc").split(":");
  q = q.order(sortField, { ascending: sortDir === "asc" });
  q = q.range(from, to);

  const { data, error, count } = await q;
  if (error) throw new Error(error.message);

  const items: LeadDTO[] = (data ?? []).map((l: any) => ({
    id: l.id,
    contact_name: l.contact_name,
    company_name: l.company_name,
    opportunity_level: l.opportunity_level,
    ai_score: l.ai_score,
    stage_id: l.stage_id,
    responded: Boolean(l.has_responded),
    created_at: l.created_at,
  }));

  return { data: { items, meta: { total: count ?? items.length, page, size } }, recordsCount: items.length };
}

export const crmProvider: Provider = {
  metadata: {
    name: "crm",
    description: "Leads do CRM da empresa com paginação e filtros por estágio e período.",
    version: "1.0.0",
    requiredPermissions: [],
    minimumPlan: "start",
    supportedFilters: ["period", "pagination", "stage_id", "sort"],
    defaultCacheTTL: 30,
    priority: 2,
    dependencies: [],
    inputSchema: { "filters.pagination": "{page,size}", "filters.stage_id": "uuid?", "filters.period": "{from,to}?", "filters.sort": "field:asc|desc?" },
    outputSchema: { items: "LeadDTO[]", "meta.total": "number", "meta.page": "number", "meta.size": "number" },
    status: "stable",
  },
  execute,
};
