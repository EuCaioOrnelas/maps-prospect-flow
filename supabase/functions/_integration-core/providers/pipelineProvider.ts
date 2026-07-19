// Provider Pipeline — estágios do kanban com contagem e valor por coluna.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import type { Provider, ProviderContext } from "../registry/ProviderInterface.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function execute(ctx: ProviderContext) {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const owner = ctx.companyId;
  const from = ctx.filters.period?.from ?? null;
  const to = ctx.filters.period?.to ?? null;

  const { data: stages, error } = await admin
    .from("pipeline_stages")
    .select("id, name, position, color, is_default")
    .eq("user_id", owner)
    .order("position", { ascending: true });
  if (error) throw new Error(error.message);

  let lq = admin.from("leads").select("pipeline_stage_id, estimated_value, has_responded").eq("owner_user_id", owner);
  if (from) lq = lq.gte("created_at", from);
  if (to)   lq = lq.lte("created_at", to);
  const { data: leads, error: le } = await lq;
  if (le) throw new Error(le.message);

  const agg = new Map<string, { count: number; value: number; responded: number }>();
  for (const l of leads ?? []) {
    const k = l.pipeline_stage_id ?? "sem_estagio";
    const cur = agg.get(k) ?? { count: 0, value: 0, responded: 0 };
    cur.count += 1;
    cur.value += Number(l.estimated_value || 0);
    if (l.has_responded) cur.responded += 1;
    agg.set(k, cur);
  }

  const items = (stages ?? []).map((s: any) => {
    const a = agg.get(s.id) ?? { count: 0, value: 0, responded: 0 };
    return {
      id: s.id,
      name: s.name,
      sort_order: s.position,
      color: s.color,
      is_default: s.is_default,
      leads_count: a.count,
      responded_count: a.responded,
      total_value: a.value,
      conversion_rate: a.count > 0 ? Number((a.responded / a.count).toFixed(4)) : 0,
    };
  });

  const totalContacts = (leads ?? []).length;
  const totalRespondidos = (leads ?? []).filter((l: any) => l.has_responded).length;
  const totalValue = (leads ?? []).reduce((s: number, l: any) => s + Number(l.estimated_value || 0), 0);

  return {
    data: {
      items,
      meta: { total: items.length },
      summary: {
        total_contacts: totalContacts,
        responded: totalRespondidos,
        taxa_conversao: totalContacts > 0 ? Number((totalRespondidos / totalContacts).toFixed(4)) : 0,
        valor_total_negociacao: totalValue,
        currency: "BRL",
        period: { from, to, fallback_all_time: !from && !to },
      },
    },
    recordsCount: items.length,
  };
}

export const pipelineProvider: Provider = {
  metadata: {
    name: "pipeline",
    description: "Estágios do pipeline com contagem, valor e taxa de conversão por coluna, e sumário agregado do funil.",
    version: "2.0.0",
    requiredPermissions: [],
    minimumPlan: "start",
    supportedFilters: ["period"],
    defaultCacheTTL: 60,
    priority: 3,
    dependencies: [],
    inputSchema: { "filters.period": "{from,to}?" },
    outputSchema: {
      items: "StageDTO[]",
      "summary.total_contacts": "number",
      "summary.taxa_conversao": "number 0..1",
      "summary.valor_total_negociacao": "number BRL",
    },
    status: "stable",
  },
  execute,
};
