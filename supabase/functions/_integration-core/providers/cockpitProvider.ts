// Provider Cockpit — snapshot completo do Growth Cockpit / dashboard executivo.
// Consolida TODOS os cards visíveis no dashboard principal em um único payload
// para que consumidores (ex.: Wian) não precisem orquestrar múltiplas fontes.
//
// Filtros:
//   filters.period.from / filters.period.to  -> ISO 8601. Se ausente, considera
//   histórico total da conta (fallback documentado).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import type { Provider, ProviderContext } from "../registry/ProviderInterface.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Buckets espelham exatamente src/hooks/useCockpitForecast.ts
const SCORE_BUCKETS = [
  { label: "Pronto p/ venda", min: 801, max: 1000, low: 0.40, high: 0.65 },
  { label: "Alto valor",       min: 601, max: 800,  low: 0.20, high: 0.35 },
  { label: "Engajado",         min: 401, max: 600,  low: 0.10, high: 0.18 },
  { label: "Baixo engajamento",min: 201, max: 400,  low: 0.04, high: 0.08 },
  { label: "Frio",             min: 0,   max: 200,  low: 0.01, high: 0.03 },
];

function daysBetween(from: string | null, to: string | null): number {
  if (!from || !to) return 30;
  const d = (new Date(to).getTime() - new Date(from).getTime()) / 86_400_000;
  return Math.max(1, Math.round(d));
}

async function execute(ctx: ProviderContext) {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const owner = ctx.companyId;
  const from = ctx.filters.period?.from ?? null;
  const to = ctx.filters.period?.to ?? null;
  const periodDays = daysBetween(from, to);

  const inPeriod = <T extends { gte: any; lte: any }>(q: T): T => {
    if (from) q = q.gte("created_at", from) as any;
    if (to)   q = q.lte("created_at", to) as any;
    return q;
  };

  // --------- Fontes paralelas ---------
  const [
    leadsPeriod,       // funil + oportunidades no período
    leadsAllTime,      // receita potencial acumulada
    dealsPeriod,       // sales no período
    dealsAllTime,      // sales all-time (MRR / receita)
    scoreLogs24h,      // leads quentes hoje
    scoreLogs7d,       // decaimento + radar
    revenueLeads,      // health + score médio
    searchPeriod,      // leads prospectados
    searchAllTime,     // total prospectado (health threshold)
    aiMsgsPeriod,      // IA economizou (chars)
    flowExecsPeriod,   // IA economizou (nodes)
    campaignsPeriod,   // dashboard cross-check
    services,          // ticket médio fallback
    stages,            // pipeline_stage por lead
  ] = await Promise.all([
    inPeriod(admin.from("leads")
      .select("id, estimated_value, opportunity_level, ai_score, first_message_sent, has_responded, category, city, closing_probability, pipeline_stage_id, created_at")
      .eq("owner_user_id", owner)),
    admin.from("leads").select("id, estimated_value, pipeline_stage_id").eq("owner_user_id", owner),
    inPeriod(admin.from("lead_deals")
      .select("value, sale_type, contract_months, status, expiration_date, created_at")
      .eq("owner_user_id", owner)),
    admin.from("lead_deals")
      .select("value, sale_type, contract_months, status, expiration_date, closed_at")
      .eq("owner_user_id", owner),
    admin.from("revenue_score_logs").select("lead_id, points_applied, created_at")
      .eq("owner_user_id", owner)
      .gte("created_at", new Date(Date.now() - 24 * 3600_000).toISOString()),
    admin.from("revenue_score_logs").select("lead_id, points_applied, created_at")
      .eq("owner_user_id", owner)
      .gte("created_at", new Date(Date.now() - 7 * 86_400_000).toISOString()),
    admin.from("revenue_leads").select("id, score_total, status_bucket").eq("owner_user_id", owner),
    inPeriod(admin.from("search_history").select("results_count, created_at").eq("owner_user_id", owner)),
    admin.from("search_history").select("results_count").eq("owner_user_id", owner),
    inPeriod(admin.from("agent_message_logs").select("content").eq("owner_user_id", owner).eq("direction", "outbound")),
    inPeriod(admin.from("wa_flow_executions" as any).select("node_history").eq("owner_user_id", owner)),
    inPeriod(admin.from("meta_campaigns").select("success_count, failed_count, total_recipients, status").eq("owner_user_id", owner)),
    admin.from("company_services").select("average_ticket").eq("owner_user_id", owner),
    admin.from("pipeline_stages").select("id, name, position").eq("user_id", owner),
  ]) as any;

  const leadsP = leadsPeriod.data ?? [];
  const leadsAll = leadsAllTime.data ?? [];
  const dealsP = dealsPeriod.data ?? [];
  const dealsAll = dealsAllTime.data ?? [];
  const revLeads = revenueLeads.data ?? [];
  const camps = campaignsPeriod.data ?? [];

  // --------- Ticket médio ---------
  const svc = services.data ?? [];
  const averageTicket = svc.length
    ? svc.reduce((a: number, s: any) => a + Number(s.average_ticket || 0), 0) / svc.length
    : 0;

  // --------- Receita potencial (pipeline value) ---------
  const receitaPotencialTotal = leadsAll.reduce((s: number, l: any) => s + Number(l.estimated_value || 0), 0);
  const receitaPotencialPeriodo = leadsP.reduce((s: number, l: any) => s + Number(l.estimated_value || 0), 0);

  // --------- Funil operacional ---------
  const funnelCaptados = leadsP.length;
  const funnelAnalisados = leadsP.filter((l: any) => l.opportunity_level).length;
  const funnelEnviados = leadsP.filter((l: any) => l.first_message_sent).length;
  const funnelRespondeu = leadsP.filter((l: any) => l.has_responded).length;
  const funnelOportunidades = leadsP.filter((l: any) =>
    ["alto", "alta", "high", "muito_alto"].includes(String(l.opportunity_level || "").toLowerCase())
  ).length;
  const pct = (n: number) => funnelCaptados > 0 ? Number((n / funnelCaptados).toFixed(4)) : 0;

  // --------- Leads quentes hoje ---------
  const growth24h = new Map<string, number>();
  for (const l of scoreLogs24h.data ?? []) {
    growth24h.set(l.lead_id, (growth24h.get(l.lead_id) ?? 0) + Number(l.points_applied || 0));
  }
  const leadsQuentesHoje = Array.from(growth24h.values()).filter(v => v >= 150).length;

  // --------- IA Economizou (min) ---------
  const chars = (aiMsgsPeriod.data ?? []).reduce((s: number, m: any) => s + String(m.content || "").length, 0);
  let flowNodes = 0;
  for (const e of flowExecsPeriod.data ?? []) {
    if (Array.isArray(e.node_history)) flowNodes += e.node_history.length;
  }
  const aiMinutesSaved = Math.round(chars / 200 + flowNodes * 2);

  // --------- Health / Gargalo ---------
  const totalProspected = (searchAllTime.data ?? []).reduce((s: number, r: any) => s + (r.results_count || 0), 0);
  const totalCrmLeads = leadsAll.length;
  const scores = revLeads.map((r: any) => Number(r.score_total || 0));
  const avgScore = scores.length ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0;
  const hotCount = scores.filter(s => s >= 601).length;
  const coldCount = scores.filter(s => s <= 200).length;
  const readyForSale = scores.filter(s => s >= 801).length;

  const hasEnoughData = totalProspected >= 300 && totalCrmLeads >= 50;
  let healthStatus = "Dados Insuficientes";
  let healthDetail = "";
  let healthScore = 0;
  if (!hasEnoughData) {
    const missing: string[] = [];
    if (totalProspected < 300) missing.push(`${totalProspected}/300 leads prospectados`);
    if (totalCrmLeads < 50) missing.push(`${totalCrmLeads}/50 leads no CRM`);
    healthDetail = `Necessário: ${missing.join(" e ")}`;
  } else {
    let max = 0, pts = 0;
    if (scores.length) { max += 40; pts += Math.min(40, (avgScore / 1000) * 40); }
    if (scores.length) { max += 25; pts += hotCount ? Math.min(25, (hotCount / scores.length) * 100) : 0; }
    if (scores.length && coldCount) { max += 15; pts -= Math.min(15, (coldCount / scores.length) * 30); }
    healthScore = max > 0 ? Math.max(0, Math.round((pts / max) * 100)) : 0;
    if (healthScore >= 70) { healthStatus = "Excelente"; healthDetail = `Score médio ${Math.round(avgScore)}, ${hotCount} leads quentes.`; }
    else if (healthScore >= 50) { healthStatus = "Operação Saudável"; healthDetail = `Score médio ${Math.round(avgScore)}.`; }
    else if (healthScore >= 30) { healthStatus = "Atenção Necessária"; healthDetail = `Score médio ${Math.round(avgScore)}. Aumente engajamento.`; }
    else if (healthScore >= 15) { healthStatus = "Score Baixo"; healthDetail = `Score médio ${Math.round(avgScore)}. Engajamento fraco.`; }
    else { healthStatus = "Crítico"; healthDetail = "Pipeline parado. Inicie campanhas e prospecção urgentemente."; }
  }

  // --------- Forecast (conservador / realista / agressivo) ---------
  const buckets = SCORE_BUCKETS.map(b => {
    const inB = scores.filter(s => s >= b.min && s <= b.max).length;
    const low = Math.round(inB * b.low);
    const high = Math.round(inB * b.high);
    const mid = Math.round(inB * (b.low + b.high) / 2);
    return { label: b.label, count: inB, sales_low: low, sales_mid: mid, sales_high: high,
             revenue_low: low * averageTicket, revenue_mid: mid * averageTicket, revenue_high: high * averageTicket };
  });
  const forecastRealista = buckets.reduce((s, b) => s + b.revenue_mid, 0);
  const forecast = {
    conservador: Math.round(forecastRealista * 0.5),
    realista: Math.round(forecastRealista),
    agressivo: Math.round(forecastRealista * 1.5),
    buckets,
    average_ticket: averageTicket,
  };

  // --------- Radar (top leads por crescimento 7d) ---------
  const growth7d = new Map<string, number>();
  for (const l of scoreLogs7d.data ?? []) {
    growth7d.set(l.lead_id, (growth7d.get(l.lead_id) ?? 0) + Number(l.points_applied || 0));
  }
  const radarRaw = Array.from(growth7d.entries())
    .filter(([_, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([lead_id, growth]) => ({ lead_id, score_growth_7d: growth }));

  // --------- Alertas executivos ---------
  const alerts: Array<{ type: string; text: string; route?: string }> = [];
  const decayLeads = new Set((scoreLogs7d.data ?? []).filter((l: any) => (l.points_applied ?? 0) < 0).map((l: any) => l.lead_id));
  if (decayLeads.size > 0) alerts.push({ type: "warning", text: `${decayLeads.size} leads perderam pontos de score nos últimos 7 dias — risco de esfriamento`, route: "/crm-score" });
  if (readyForSale > 0) alerts.push({ type: "success", text: `${readyForSale} leads com score acima de 800 — prontos para abordagem de venda`, route: "/crm" });
  if (coldCount > 5) alerts.push({ type: "danger", text: `${coldCount} leads frios (score ≤200) — considere reativação ou limpeza`, route: "/crm-score" });
  // Pico de atividade
  const hourCounts = new Map<number, number>();
  for (const l of scoreLogs24h.data ?? []) {
    if (!l.created_at) continue;
    const h = new Date(l.created_at).getHours();
    hourCounts.set(h, (hourCounts.get(h) ?? 0) + 1);
  }
  if (hourCounts.size) {
    const peak = Array.from(hourCounts.entries()).sort((a, b) => b[1] - a[1])[0];
    alerts.push({ type: "info", text: `Pico de atividade dos leads: ${String(peak[0]).padStart(2, "0")}:00 — melhor horário para envios`, route: "/meta-campaigns" });
  }
  if (!alerts.length) alerts.push({ type: "info", text: "Sem alertas no momento. Continue prospectando para gerar diagnósticos." });

  // --------- Sales / MRR (all-time + no período) ---------
  const today = new Date().toISOString().slice(0, 10);
  const isActive = (d: any) => d.status === "active" && (!d.expiration_date || d.expiration_date >= today);
  const revenueTotalAllTime = dealsAll.reduce((s: number, d: any) => {
    const val = Number(d.value || 0);
    return s + (d.sale_type === "one_time" ? val : val * Number(d.contract_months || 1));
  }, 0);
  const mrrActive = dealsAll.filter((d: any) => d.sale_type === "recurring" && isActive(d))
    .reduce((s: number, d: any) => s + Number(d.value || 0), 0);
  const activeSalesCount = dealsAll.filter(isActive).length;
  const projected12mo = dealsAll.filter((d: any) => d.sale_type === "recurring" && isActive(d))
    .reduce((s: number, d: any) => {
      if (!d.expiration_date) return s + Number(d.value || 0) * 12;
      const months = Math.max(0, Math.min(12, Math.ceil((new Date(d.expiration_date).getTime() - Date.now()) / (30 * 86_400_000))));
      return s + Number(d.value || 0) * months;
    }, 0);

  // --------- Campanhas (dashboard cross-check) ---------
  const campaignsSent = camps.reduce((s: number, c: any) => s + (c.success_count || 0), 0);
  const campaignsFailed = camps.reduce((s: number, c: any) => s + (c.failed_count || 0), 0);
  const campaignsRecipients = camps.reduce((s: number, c: any) => s + (c.total_recipients || 0), 0);

  // --------- Payload consolidado ---------
  const data = {
    period: { from, to, days: periodDays, fallback_all_time: !from && !to },
    // Card: Receita Potencial Atual (soma valor em negociação)
    receita_potencial: {
      total: receitaPotencialTotal,
      no_periodo: receitaPotencialPeriodo,
      currency: "BRL",
    },
    // Card: Leads Quentes Hoje
    leads_quentes_hoje: leadsQuentesHoje,
    // Card: Gargalo Atual / Health
    gargalo: {
      status: healthStatus,
      detail: healthDetail,
      health_score: healthScore,
      total_prospected: totalProspected,
      total_crm_leads: totalCrmLeads,
      avg_score: Math.round(avgScore),
      hot_leads: hotCount,
      cold_leads: coldCount,
      ready_for_sale: readyForSale,
    },
    // Card: IA Economizou
    ia_economizou_min: aiMinutesSaved,
    // Card: Forecast
    forecast,
    // Card: Funil Operacional
    funil_operacional: [
      { stage: "Captados",      value: funnelCaptados,      pct: pct(funnelCaptados) },
      { stage: "Analisados",    value: funnelAnalisados,    pct: pct(funnelAnalisados) },
      { stage: "Enviados",      value: funnelEnviados,      pct: pct(funnelEnviados) },
      { stage: "Respondeu",     value: funnelRespondeu,     pct: pct(funnelRespondeu) },
      { stage: "Oportunidades", value: funnelOportunidades, pct: pct(funnelOportunidades) },
    ],
    // Card: Radar de Oportunidades
    radar: radarRaw,
    // Card: Alertas Executivos
    alertas: alerts,
    // Card: Comercial (Sales / MRR)
    comercial: {
      receita_total_acumulada: revenueTotalAllTime,
      mrr_ativo: mrrActive,
      vendas_ativas: activeSalesCount,
      projecao_12_meses: Math.round(projected12mo),
      currency: "BRL",
    },
    // Card: Campanhas Meta no período
    campanhas: {
      total: camps.length,
      recipients: campaignsRecipients,
      sent: campaignsSent,
      failed: campaignsFailed,
      delivery_rate: (campaignsSent + campaignsFailed) > 0
        ? Number((campaignsSent / (campaignsSent + campaignsFailed)).toFixed(4)) : 0,
    },
  };

  return { data, recordsCount: 1 };
}

export const cockpitProvider: Provider = {
  metadata: {
    name: "cockpit",
    description: "Snapshot completo do Growth Cockpit: receita potencial, leads quentes, gargalo/health, IA economizada, forecast, funil, radar, alertas, comercial e campanhas.",
    version: "2.0.0",
    requiredPermissions: [],
    minimumPlan: "start",
    supportedFilters: ["period"],
    defaultCacheTTL: 60,
    priority: 1,
    dependencies: [],
    inputSchema: { "filters.period": "{from,to}? — se ausente, retorna histórico total" },
    outputSchema: {
      receita_potencial: "{ total, no_periodo, currency }",
      leads_quentes_hoje: "number",
      gargalo: "{ status, detail, health_score, ... }",
      ia_economizou_min: "number",
      forecast: "{ conservador, realista, agressivo, buckets[], average_ticket }",
      funil_operacional: "{ stage, value, pct }[]",
      radar: "{ lead_id, score_growth_7d }[]",
      alertas: "{ type, text, route? }[]",
      comercial: "{ receita_total_acumulada, mrr_ativo, vendas_ativas, projecao_12_meses, currency }",
      campanhas: "{ total, recipients, sent, failed, delivery_rate }",
    },
    status: "stable",
  },
  execute,
};
