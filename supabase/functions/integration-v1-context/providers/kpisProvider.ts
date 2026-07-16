// Provider KPIs / Forecast: agrega métricas de negócio da empresa.
// Toda regra continua na Wiize. O Wian apenas interpreta.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import type { IntegrationFilters } from "../filters/filterSchema.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export interface KPIsDTO {
  period: { from: string | null; to: string | null };
  leads_total: number;
  leads_responded: number;
  leads_conversion_rate: number;
  campaigns_total: number;
  campaigns_messages_sent: number;
  campaigns_reply_rate: number;
  pipeline_open_leads: number;
}

export async function getKPIs(companyId: string, filters: IntegrationFilters): Promise<KPIsDTO> {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const from = filters.period?.from ?? null;
  const to = filters.period?.to ?? null;

  // Consultas em paralelo — performance é prioridade.
  const leadsQ = (() => {
    let q = admin
      .from("leads")
      .select("id, has_responded, stage_id", { count: "exact", head: false })
      .eq("user_id", companyId);
    if (from) q = q.gte("created_at", from);
    if (to) q = q.lte("created_at", to);
    return q;
  })();

  const campaignsQ = (() => {
    let q = admin
      .from("meta_campaigns")
      .select("id, sent_count, replied_count", { count: "exact" })
      .eq("user_id", companyId);
    if (from) q = q.gte("created_at", from);
    if (to) q = q.lte("created_at", to);
    return q;
  })();

  const [leadsRes, campaignsRes] = await Promise.all([leadsQ, campaignsQ]);
  if (leadsRes.error) throw new Error(leadsRes.error.message);
  if (campaignsRes.error) throw new Error(campaignsRes.error.message);

  const leads = leadsRes.data ?? [];
  const leadsTotal = leadsRes.count ?? leads.length;
  const leadsResponded = leads.filter((l: any) => l.has_responded).length;

  const campaigns = campaignsRes.data ?? [];
  let sent = 0;
  let replied = 0;
  for (const c of campaigns) {
    sent += c.sent_count ?? 0;
    replied += c.replied_count ?? 0;
  }

  return {
    period: { from, to },
    leads_total: leadsTotal,
    leads_responded: leadsResponded,
    leads_conversion_rate: leadsTotal > 0 ? Number((leadsResponded / leadsTotal).toFixed(4)) : 0,
    campaigns_total: campaignsRes.count ?? campaigns.length,
    campaigns_messages_sent: sent,
    campaigns_reply_rate: sent > 0 ? Number((replied / sent).toFixed(4)) : 0,
    pipeline_open_leads: leads.filter((l: any) => l.stage_id).length,
  };
}
