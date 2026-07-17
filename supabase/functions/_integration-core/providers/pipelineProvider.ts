// Provider Pipeline — colunas do kanban com contagem de leads por estágio.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import type { Provider, ProviderContext } from "../registry/ProviderInterface.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function execute(ctx: ProviderContext) {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: stages, error } = await admin
    .from("pipeline_stages")
    .select("id, name, position")
    .eq("user_id", ctx.companyId)
    .order("position", { ascending: true });
  if (error) throw new Error(error.message);

  const { data: leads } = await admin.from("leads").select("pipeline_stage_id").eq("user_id", ctx.companyId);
  const byStage = new Map<string, number>();
  for (const l of leads ?? []) byStage.set(l.pipeline_stage_id, (byStage.get(l.pipeline_stage_id) ?? 0) + 1);

  const items = (stages ?? []).map((s: any) => ({
    id: s.id, name: s.name, sort_order: s.position, leads_count: byStage.get(s.id) ?? 0,
  }));
  return { data: { items, meta: { total: items.length } }, recordsCount: items.length };
}

export const pipelineProvider: Provider = {
  metadata: {
    name: "pipeline",
    description: "Estágios do pipeline de vendas com contagem de leads por coluna.",
    version: "1.0.0",
    requiredPermissions: [],
    minimumPlan: "start",
    supportedFilters: [],
    defaultCacheTTL: 60,
    priority: 3,
    dependencies: [],
    inputSchema: {},
    outputSchema: { items: "StageDTO[]", "meta.total": "number" },
    status: "stable",
  },
  execute,
};
