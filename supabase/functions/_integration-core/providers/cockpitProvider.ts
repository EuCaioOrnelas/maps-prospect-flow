// Provider Cockpit — KPIs executivos consolidados da empresa.
// Toda a regra de cálculo permanece na Wiize; o consumidor apenas interpreta.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import type { Provider, ProviderContext } from "../registry/ProviderInterface.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function execute(ctx: ProviderContext) {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const from = ctx.filters.period?.from ?? null;
  const to = ctx.filters.period?.to ?? null;

  let leadsQ = admin.from("leads").select("id, has_responded, pipeline_stage_id", { count: "exact" }).eq("user_id", ctx.companyId);
  if (from) leadsQ = leadsQ.gte("created_at", from);
  if (to) leadsQ = leadsQ.lte("created_at", to);

  let campQ = admin.from("meta_campaigns").select("id, success_count", { count: "exact" }).eq("user_id", ctx.companyId);
  if (from) campQ = campQ.gte("created_at", from);
  if (to) campQ = campQ.lte("created_at", to);

  const [leadsRes, campRes] = await Promise.all([leadsQ, campQ]);
  if (leadsRes.error) throw new Error(leadsRes.error.message);
  if (campRes.error) throw new Error(campRes.error.message);

  const leads = leadsRes.data ?? [];
  const leadsTotal = leadsRes.count ?? leads.length;
  const leadsResponded = leads.filter((l: any) => l.has_responded).length;

  let sent = 0;
  for (const c of campRes.data ?? []) sent += c.success_count ?? 0;

  const data = {
    period: { from, to },
    leads_total: leadsTotal,
    leads_responded: leadsResponded,
    leads_conversion_rate: leadsTotal > 0 ? Number((leadsResponded / leadsTotal).toFixed(4)) : 0,
    campaigns_total: campRes.count ?? (campRes.data ?? []).length,
    campaigns_messages_sent: sent,
    campaigns_reply_rate: 0,
    pipeline_open_leads: leads.filter((l: any) => l.pipeline_stage_id).length,
  };
  return { data, recordsCount: 1 };
}

export const cockpitProvider: Provider = {
  metadata: {
    name: "cockpit",
    description: "KPIs executivos do Growth Cockpit (leads, conversão, campanhas, pipeline).",
    version: "1.0.0",
    requiredPermissions: [],
    minimumPlan: "start",
    supportedFilters: ["period"],
    defaultCacheTTL: 60,
    priority: 1,
    dependencies: [],
    inputSchema: { "filters.period": "{from,to}?" },
    outputSchema: {
      leads_total: "number", leads_responded: "number", leads_conversion_rate: "number",
      campaigns_total: "number", campaigns_messages_sent: "number", campaigns_reply_rate: "number",
      pipeline_open_leads: "number",
    },
    status: "stable",
  },
  execute,
};
