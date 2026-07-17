// Provider Meta Campaigns — campanhas WhatsApp via Meta Cloud API. Sem tokens.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import type { Provider, ProviderContext } from "../registry/ProviderInterface.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function execute(ctx: ProviderContext) {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const page = ctx.filters.pagination?.page ?? 1;
  const size = ctx.filters.pagination?.size ?? 50;
  const from = (page - 1) * size;
  const to = from + size - 1;
  const sortMap: Record<string, string> = {
    created_at: "created_at",
    status: "status",
    name: "campaign_name",
    campaign_name: "campaign_name",
    total_recipients: "total_recipients",
    sent_count: "success_count",
    success_count: "success_count",
  };

  let q = admin
    .from("meta_campaigns")
    .select(
      "id, campaign_name, status, total_recipients, success_count, failed_count, created_at",
      { count: "exact" },
    )
    .eq("user_id", ctx.companyId);

  if (ctx.filters.period?.from) q = q.gte("created_at", ctx.filters.period.from);
  if (ctx.filters.period?.to) q = q.lte("created_at", ctx.filters.period.to);
  if (ctx.filters.campaign_id) q = q.eq("id", ctx.filters.campaign_id);

  const [sortField, sortDir] = (ctx.filters.sort ?? "created_at:desc").split(":");
  q = q.order(sortMap[sortField] ?? "created_at", { ascending: sortDir === "asc" });
  q = q.range(from, to);

  const { data, error, count } = await q;
  if (error) throw new Error(error.message);

  const items = (data ?? []).map((c: any) => {
    const sent = c.success_count ?? 0;
    const replied = 0;
    return {
      id: c.id, name: c.campaign_name, status: c.status,
      total_recipients: c.total_recipients ?? 0,
      sent, delivered: sent, read: 0,
      replied, failed: c.failed_count ?? 0,
      reply_rate: sent > 0 ? Number((replied / sent).toFixed(4)) : 0,
      started_at: c.created_at, completed_at: null, scheduled_at: null,
    };
  });

  return { data: { items, meta: { total: count ?? items.length, page, size } }, recordsCount: items.length };
}

export const campaignsProvider: Provider = {
  metadata: {
    name: "campaigns",
    description: "Campanhas WhatsApp Meta com métricas agregadas por campanha.",
    version: "1.0.0",
    requiredPermissions: [],
    minimumPlan: "growth",
    supportedFilters: ["period", "pagination", "campaign_id", "sort"],
    defaultCacheTTL: 30,
    priority: 3,
    dependencies: [],
    inputSchema: { "filters.pagination": "{page,size}", "filters.campaign_id": "uuid?", "filters.period": "{from,to}?", "filters.sort": "field:asc|desc?" },
    outputSchema: { items: "CampaignDTO[]", "meta.total": "number" },
    status: "stable",
  },
  execute,
};

// "meta" provider = alias focado em métricas agregadas (sem paginação detalhada).
export const metaProvider: Provider = {
  metadata: {
    name: "meta",
    description: "Métricas agregadas de todas as campanhas Meta no período.",
    version: "1.0.0",
    requiredPermissions: [],
    minimumPlan: "growth",
    supportedFilters: ["period"],
    defaultCacheTTL: 60,
    priority: 4,
    dependencies: ["campaigns"],
    inputSchema: { "filters.period": "{from,to}?" },
    outputSchema: { campaigns_total: "number", sent: "number", delivered: "number", read: "number", replied: "number", failed: "number", reply_rate: "number" },
    status: "stable",
  },
  async execute(ctx: ProviderContext) {
    const dep = ctx.dependencies["campaigns"] as { items: any[] } | undefined;
    const items = dep?.items ?? [];
    let sent = 0, delivered = 0, read = 0, replied = 0, failed = 0;
    for (const c of items) {
      sent += c.sent ?? 0; delivered += c.delivered ?? 0; read += c.read ?? 0;
      replied += c.replied ?? 0; failed += c.failed ?? 0;
    }
    return {
      data: {
        campaigns_total: items.length,
        sent, delivered, read, replied, failed,
        reply_rate: sent > 0 ? Number((replied / sent).toFixed(4)) : 0,
      },
      recordsCount: items.length,
    };
  },
};
