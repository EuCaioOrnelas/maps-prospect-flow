import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { subDays, subHours } from "date-fns";
import { TrendingDown, TrendingUp, Flame, Zap, Clock, AlertCircle, ThermometerSun } from "lucide-react";
import React from "react";
import type { ExecutiveAlert } from "@/components/dashboard/v2/ExecutiveAlerts";

export interface DashboardKPIData {
  receitaPotencial: number;
  receitaPotencialGrowth: number;
  leadsQuentesHoje: number;
  leadsQuentesOntem: number;
  healthStatus: string;
  healthDetail: string;
  aiMinutesSaved: number;
  leadsGeradosPeriodo: number;
  conversasAtivasPeriodo: number;
  oportunidadesQuentesPeriodo: number;
  radarLeads: RadarLead[];
  executiveAlerts: ExecutiveAlert[];
  loading: boolean;
}

export interface RadarLead {
  id: string;
  name: string;
  phone: string;
  segment: string;
  score: number;
  potential: number;
  status: string;
  scoreGrowth7d: number;
}

function getStatusFromScore(score: number): string {
  if (score >= 801) return "Pronto p/ venda";
  if (score >= 601) return "Alto valor";
  if (score >= 401) return "Engajado";
  if (score >= 201) return "Baixo engajamento";
  return "Frio";
}

export function useDashboardKPIs(periodDays: number): DashboardKPIData {
  const { user, accountOwnerId } = useAuth();
  const publicDemo = typeof window !== "undefined" && window.location.pathname === "/tour-guiado";

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-kpis", accountOwnerId, periodDays],
    enabled: !!user && !publicDemo,
    queryFn: async () => {
      if (!user || !accountOwnerId) return null;

      const now = new Date();
      const periodStart = subDays(now, periodDays);
      const last24h = subHours(now, 24);
      const last48h = subHours(now, 48);
      const thirtyDaysAgo = subDays(now, 30);
      const sevenDaysAgo = subDays(now, 7);

      const [
        allDealsRes,
        recentDealsRes,
        prevDealsRes,
        recentScoreLogsRes,
        yesterdayScoreLogsRes,
        leadsInPeriodRes,
        activeConvosRes,
        hotLeadsInPeriodRes,
        aiMessagesRes,
        flowExecsRes,
        allRevenueLeadsRes,
        recentOppSearchRes,
        scoreDecayRes,
        // Total prospected leads (all time) for health threshold
        totalProspectedRes,
        // Total CRM leads for health threshold
        totalCrmLeadsRes,
        // Score growth in last 7 days per lead (for Radar)
        scoreGrowth7dRes,
      ] = await Promise.all([
        supabase.from("leads").select("estimated_value").eq("owner_user_id", accountOwnerId),
        supabase.from("leads").select("estimated_value").eq("owner_user_id", accountOwnerId)
          .gte("created_at", thirtyDaysAgo.toISOString()),
        supabase.from("leads").select("estimated_value").eq("owner_user_id", accountOwnerId)
          .gte("created_at", subDays(now, 60).toISOString())
          .lt("created_at", thirtyDaysAgo.toISOString()),
        supabase.from("revenue_score_logs").select("lead_id, points_applied, created_at").eq("owner_user_id", accountOwnerId)
          .gte("created_at", last24h.toISOString()),
        supabase.from("revenue_score_logs").select("lead_id, points_applied").eq("owner_user_id", accountOwnerId)
          .gte("created_at", last48h.toISOString())
          .lt("created_at", last24h.toISOString()),
        supabase.from("search_history").select("results_count").eq("owner_user_id", accountOwnerId)
          .gte("created_at", periodStart.toISOString()),
        supabase.from("agent_conversations").select("id, agent_id")
          .eq("owner_user_id", accountOwnerId)
          .in("status", ["active", "waiting_response"])
          .gte("updated_at", periodStart.toISOString()),
        supabase.from("revenue_leads").select("id, score_total").eq("owner_user_id", accountOwnerId)
          .gte("score_total", 601)
          .gte("created_at", periodStart.toISOString()),
        supabase.from("agent_message_logs").select("content, direction")
          .eq("owner_user_id", accountOwnerId)
          .eq("direction", "outbound")
          .gte("created_at", periodStart.toISOString()),
        supabase.from("wa_flow_executions" as any).select("id, node_history").eq("owner_user_id", accountOwnerId)
          .gte("created_at", periodStart.toISOString()),
        // All revenue leads for health + radar
        supabase.from("revenue_leads").select("id, phone_e164, score_total, lead_name, status_bucket").eq("owner_user_id", accountOwnerId),
        // Recent opportunities (last 7 days)
        supabase.from("search_history").select("results_count").eq("owner_user_id", accountOwnerId)
          .gte("created_at", sevenDaysAgo.toISOString()),
        // Negative score logs last 7 days
        supabase.from("revenue_score_logs").select("lead_id, points_applied").eq("owner_user_id", accountOwnerId)
          .lt("points_applied", 0)
          .gte("created_at", sevenDaysAgo.toISOString()),
        // Total prospected (all time)
        supabase.from("search_history").select("results_count").eq("owner_user_id", accountOwnerId),
        // Total CRM leads
        supabase.from("leads").select("id").eq("owner_user_id", accountOwnerId),
        // Score logs last 7 days (all, for radar growth)
        supabase.from("revenue_score_logs").select("lead_id, points_applied").eq("owner_user_id", accountOwnerId)
          .gte("created_at", sevenDaysAgo.toISOString()),
      ]);

      // --- Receita Potencial ---
      const allDeals = allDealsRes.data || [];
      const receitaPotencial = allDeals.reduce((s, d) => s + (Number(d.estimated_value) || 0), 0);
      const recentDeals = recentDealsRes.data || [];
      const prevDeals = prevDealsRes.data || [];
      const recentSum = recentDeals.reduce((s, d) => s + (Number(d.estimated_value) || 0), 0);
      const prevSum = prevDeals.reduce((s, d) => s + (Number(d.estimated_value) || 0), 0);
      const receitaPotencialGrowth = prevSum > 0 ? ((recentSum - prevSum) / prevSum) * 100 : 0;

      // --- Leads Quentes Hoje ---
      const scoreGrowthByLead = new Map<string, number>();
      (recentScoreLogsRes.data || []).forEach((log: any) => {
        const current = scoreGrowthByLead.get(log.lead_id) || 0;
        scoreGrowthByLead.set(log.lead_id, current + (log.points_applied || 0));
      });
      const leadsQuentesHoje = Array.from(scoreGrowthByLead.values()).filter(v => v >= 150).length;

      const yesterdayGrowthByLead = new Map<string, number>();
      (yesterdayScoreLogsRes.data || []).forEach((log: any) => {
        const current = yesterdayGrowthByLead.get(log.lead_id) || 0;
        yesterdayGrowthByLead.set(log.lead_id, current + (log.points_applied || 0));
      });
      const leadsQuentesOntem = Array.from(yesterdayGrowthByLead.values()).filter(v => v >= 150).length;

      // --- Mini stats ---
      const leadsGeradosPeriodo = (leadsInPeriodRes.data || []).reduce((s, r) => s + (r.results_count || 0), 0);

      const agentConvos = activeConvosRes.data || [];
      const { data: userAgents } = await supabase.from("ai_agents").select("id").eq("owner_user_id", accountOwnerId);
      const userAgentIds = new Set((userAgents || []).map(a => a.id));
      const conversasAtivasPeriodo = agentConvos.filter(c => userAgentIds.has(c.agent_id)).length;

      const oportunidadesQuentesPeriodo = (hotLeadsInPeriodRes.data || []).length;

      // --- IA Economizou ---
      const aiMessages = aiMessagesRes.data || [];
      const totalAIChars = aiMessages.reduce((s, m) => s + ((m.content || '').length), 0);
      const aiTypingMinutes = totalAIChars / 200;
      const flowExecs = (flowExecsRes as any).data || [];
      let flowNodes = 0;
      flowExecs.forEach((exec: any) => {
        if (Array.isArray(exec.node_history)) flowNodes += exec.node_history.length;
      });
      const aiMinutesSaved = Math.round(aiTypingMinutes + flowNodes * 2);

      // --- Health Status (global, no period filter) ---
      const totalProspected = (totalProspectedRes.data || []).reduce((s, r) => s + (r.results_count || 0), 0);
      const totalCrmLeads = (totalCrmLeadsRes.data || []).length;
      const allScores = (allRevenueLeadsRes.data || []).map((l: any) => l.score_total || 0);
      const totalLeadsWithScore = allScores.length;

      // Minimum data thresholds
      const hasEnoughData = totalProspected >= 300 && totalCrmLeads >= 50;

      let healthStatus: string;
      let healthDetail: string;

      if (!hasEnoughData) {
        healthStatus = "Dados Insuficientes";
        const missing: string[] = [];
        if (totalProspected < 300) missing.push(`${totalProspected}/300 leads prospectados`);
        if (totalCrmLeads < 50) missing.push(`${totalCrmLeads}/50 leads no CRM`);
        healthDetail = `Necessário: ${missing.join(' e ')}`;
      } else {
        const avgScore = totalLeadsWithScore > 0 ? allScores.reduce((a: number, b: number) => a + b, 0) / totalLeadsWithScore : 0;
        const hotCount = allScores.filter((s: number) => s >= 601).length;
        const coldCount = allScores.filter((s: number) => s <= 200).length;
        const recentOppCount = (recentOppSearchRes.data || []).reduce((s, r) => s + (r.results_count || 0), 0);

        // Dynamic calculation: only count factors that have data
        let totalMaxPoints = 0;
        let totalPoints = 0;

        // 1. Score médio (0-40 pts) — always used if we have scored leads
        if (totalLeadsWithScore > 0) {
          totalMaxPoints += 40;
          totalPoints += Math.min(40, (avgScore / 1000) * 40);
        }

        // 2. % leads quentes score>=601 (0-25 pts)
        if (totalLeadsWithScore > 0 && hotCount > 0) {
          totalMaxPoints += 25;
          const hotRatio = hotCount / totalLeadsWithScore;
          totalPoints += Math.min(25, hotRatio * 100);
        } else if (totalLeadsWithScore > 0) {
          // Has leads but none hot — still counts as a factor (0 points)
          totalMaxPoints += 25;
        }

        // 3. Penalidade leads frios score<=200 (penalty)
        if (totalLeadsWithScore > 0 && coldCount > 0) {
          totalMaxPoints += 15;
          const coldRatio = coldCount / totalLeadsWithScore;
          totalPoints -= Math.min(15, coldRatio * 30);
        }

        // 4. Oportunidades recentes (0-20 pts)
        if (recentOppCount > 0) {
          totalMaxPoints += 20;
          totalPoints += Math.min(20, recentOppCount * 2);
        } else {
          totalMaxPoints += 20;
        }

        // 5. Score decay penalty — only if there was decay
        const decayLogsInner = scoreDecayRes.data || [];
        const decayLeadIdsInner = new Set(decayLogsInner.map((l: any) => l.lead_id));
        const decayCountInner = decayLeadIdsInner.size;
        if (decayCountInner > 0 && totalLeadsWithScore > 0) {
          totalMaxPoints += 10;
          const decayRatio = decayCountInner / totalLeadsWithScore;
          totalPoints -= Math.min(10, decayRatio * 25);
        }

        // Normalize to 0-100
        const healthScore = totalMaxPoints > 0 ? Math.max(0, Math.round((totalPoints / totalMaxPoints) * 100)) : 0;

        if (healthScore >= 70) {
          healthStatus = "Excelente";
          healthDetail = `Score médio ${Math.round(avgScore)}, ${hotCount} leads quentes, ${recentOppCount} oportunidades recentes`;
        } else if (healthScore >= 50) {
          healthStatus = "Operação Saudável";
          healthDetail = `Score médio ${Math.round(avgScore)}, métricas dentro do esperado`;
        } else if (healthScore >= 30) {
          healthStatus = "Atenção Necessária";
          healthDetail = `Score médio ${Math.round(avgScore)}. Aumente o engajamento e prospecção`;
        } else if (healthScore >= 15) {
          healthStatus = "Score Baixo";
          healthDetail = `Score médio ${Math.round(avgScore)}. Engajamento dos leads precisa melhorar`;
        } else {
          healthStatus = "Crítico";
          healthDetail = `Pipeline parado. Inicie campanhas e prospecção urgentemente`;
        }
      }

      // --- Radar de Oportunidades (CRM leads with highest 7d score growth) ---
      const scoreGrowth7dMap = new Map<string, number>();
      (scoreGrowth7dRes.data || []).forEach((log: any) => {
        const current = scoreGrowth7dMap.get(log.lead_id) || 0;
        scoreGrowth7dMap.set(log.lead_id, current + (log.points_applied || 0));
      });

      // Get CRM leads with their details
      const { data: crmLeadsForRadar } = await supabase
        .from("leads")
        .select("id, company_name, phone, category, estimated_value")
        .eq("owner_user_id", accountOwnerId)
        .order("created_at", { ascending: false })
        .limit(500);

      // Also fetch company average ticket for fallback
      const { data: companyServices } = await supabase
        .from("company_services")
        .select("average_ticket")
        .eq("owner_user_id", accountOwnerId);
      const avgTicket = companyServices && companyServices.length > 0
        ? companyServices.reduce((s, sv) => s + (sv.average_ticket || 0), 0) / companyServices.length
        : 0;

      // Match CRM leads to revenue_leads by phone
      const revenueLeadsMap = new Map<string, any>();
      (allRevenueLeadsRes.data || []).forEach((rl: any) => {
        const key = rl.phone_e164.replace(/\D/g, "").slice(-8);
        revenueLeadsMap.set(key, rl);
      });

      const allRadarLeads: RadarLead[] = (crmLeadsForRadar || [])
        .map((lead) => {
          const phoneKey = (lead.phone || "").replace(/\D/g, "").slice(-8);
          const revLead = phoneKey.length >= 8 ? revenueLeadsMap.get(phoneKey) : null;
          const score = revLead?.score_total || 0;
          const scoreGrowth = revLead ? (scoreGrowth7dMap.get(revLead.id) || 0) : 0;
          const potential = Number(lead.estimated_value) || avgTicket;
          return {
            id: lead.id,
            name: lead.company_name || lead.phone || "Sem nome",
            phone: lead.phone || "",
            segment: lead.category || "",
            score,
            potential,
            status: getStatusFromScore(score),
            scoreGrowth7d: scoreGrowth,
          };
        })
        .filter(l => l.score > 0 || l.scoreGrowth7d > 0);

      // Prioritize: 1) leads with recent growth, 2) leads with highest score
      const withGrowth = allRadarLeads
        .filter(l => l.scoreGrowth7d > 0)
        .sort((a, b) => b.scoreGrowth7d - a.scoreGrowth7d);
      const withoutGrowth = allRadarLeads
        .filter(l => l.scoreGrowth7d === 0 && l.score > 0)
        .sort((a, b) => b.score - a.score);

      const radarLeads: RadarLead[] = [...withGrowth, ...withoutGrowth].slice(0, 6);

      // --- Executive Alerts (real data-driven, com comparação de períodos) ---
      const prevStart = subDays(now, periodDays * 2);
      const iso = (d: Date) => d.toISOString();
      const fortyEightHoursAgo = subHours(now, 48);
      const fourteenDaysAgo = subDays(now, 14);
      const nextSevenDays = new Date(now.getTime() + 7 * 86400000);

      const countOf = (res: any) => res?.count || 0;
      const sumResults = (res: any) => (res?.data || []).reduce((s: number, r: any) => s + (r.results_count || 0), 0);

      const [
        prospCurRes, prospPrevRes,
        newLeadsCurRes, newLeadsPrevRes,
        chatOutCurRes, chatOutPrevRes,
        agentOutCurRes, agentOutPrevRes,
        convCurRes, convPrevRes,
        dealsCurRes, dealsPrevRes,
        meetCurRes, meetPrevRes,
        noContactRes,
        stuckRes,
        upcomingMeetRes,
        pendingPastMeetRes,
        campaignsRes,
        numbersRes,
        inboundMsgsRes,
        outboundMsgsRes,
        forgottenHotRes,
      ] = await Promise.all([
        supabase.from("search_history").select("results_count").eq("owner_user_id", accountOwnerId).gte("created_at", iso(periodStart)),
        supabase.from("search_history").select("results_count").eq("owner_user_id", accountOwnerId).gte("created_at", iso(prevStart)).lt("created_at", iso(periodStart)),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("owner_user_id", accountOwnerId).gte("created_at", iso(periodStart)),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("owner_user_id", accountOwnerId).gte("created_at", iso(prevStart)).lt("created_at", iso(periodStart)),
        supabase.from("chat_messages").select("id", { count: "exact", head: true }).eq("owner_user_id", accountOwnerId).eq("direction", "outbound").gte("created_at", iso(periodStart)),
        supabase.from("chat_messages").select("id", { count: "exact", head: true }).eq("owner_user_id", accountOwnerId).eq("direction", "outbound").gte("created_at", iso(prevStart)).lt("created_at", iso(periodStart)),
        supabase.from("agent_message_logs").select("id", { count: "exact", head: true }).eq("owner_user_id", accountOwnerId).eq("direction", "outbound").gte("created_at", iso(periodStart)),
        supabase.from("agent_message_logs").select("id", { count: "exact", head: true }).eq("owner_user_id", accountOwnerId).eq("direction", "outbound").gte("created_at", iso(prevStart)).lt("created_at", iso(periodStart)),
        supabase.from("agent_conversations").select("id", { count: "exact", head: true }).eq("owner_user_id", accountOwnerId).gte("created_at", iso(periodStart)),
        supabase.from("agent_conversations").select("id", { count: "exact", head: true }).eq("owner_user_id", accountOwnerId).gte("created_at", iso(prevStart)).lt("created_at", iso(periodStart)),
        supabase.from("lead_deals").select("value, sale_type, contract_months").eq("owner_user_id", accountOwnerId).gte("closed_at", iso(periodStart)),
        supabase.from("lead_deals").select("value, sale_type, contract_months").eq("owner_user_id", accountOwnerId).gte("closed_at", iso(prevStart)).lt("closed_at", iso(periodStart)),
        supabase.from("calendar_events").select("id", { count: "exact", head: true }).eq("owner_user_id", accountOwnerId).gte("created_at", iso(periodStart)),
        supabase.from("calendar_events").select("id", { count: "exact", head: true }).eq("owner_user_id", accountOwnerId).gte("created_at", iso(prevStart)).lt("created_at", iso(periodStart)),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("owner_user_id", accountOwnerId).is("archived_at", null).eq("first_message_sent", false).lt("created_at", iso(fortyEightHoursAgo)),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("owner_user_id", accountOwnerId).is("archived_at", null).not("pipeline_stage_id", "is", null).lt("updated_at", iso(fourteenDaysAgo)),
        supabase.from("calendar_events").select("id", { count: "exact", head: true }).eq("owner_user_id", accountOwnerId).gte("starts_at", iso(now)).lte("starts_at", iso(nextSevenDays)).neq("status", "cancelled"),
        supabase.from("calendar_events").select("id", { count: "exact", head: true }).eq("owner_user_id", accountOwnerId).lt("ends_at", iso(now)).in("status", ["scheduled", "confirmed"]),
        supabase.from("whatsapp_campaigns").select("id, sent_count, total_responses").eq("owner_user_id", accountOwnerId).gte("created_at", iso(periodStart)),
        supabase.from("whatsapp_numbers").select("id, is_connected").eq("owner_user_id", accountOwnerId),
        supabase.from("chat_messages").select("conversation_id, created_at").eq("owner_user_id", accountOwnerId).eq("direction", "inbound").gte("created_at", iso(sevenDaysAgo)).order("created_at", { ascending: false }).limit(2000),
        supabase.from("chat_messages").select("conversation_id, created_at").eq("owner_user_id", accountOwnerId).eq("direction", "outbound").gte("created_at", iso(sevenDaysAgo)).order("created_at", { ascending: false }).limit(2000),
        supabase.from("revenue_leads").select("id, last_activity_at, score_total").eq("owner_user_id", accountOwnerId).gte("score_total", 601),
      ]);

      const dealValue = (rows: any[]) => rows.reduce((s, d) => s + (d.sale_type === "recurring" ? Number(d.value || 0) * (d.contract_months || 1) : Number(d.value || 0)), 0);
      const dealsCur = dealsCurRes.data || [];
      const dealsPrev = dealsPrevRes.data || [];

      // Conversas com mensagem do cliente sem resposta há mais de 24h
      const lastInbound = new Map<string, number>();
      (inboundMsgsRes.data || []).forEach((m: any) => {
        if (!m.conversation_id) return;
        const t = new Date(m.created_at).getTime();
        if (!lastInbound.has(m.conversation_id) || t > (lastInbound.get(m.conversation_id) as number)) lastInbound.set(m.conversation_id, t);
      });
      const lastOutbound = new Map<string, number>();
      (outboundMsgsRes.data || []).forEach((m: any) => {
        if (!m.conversation_id) return;
        const t = new Date(m.created_at).getTime();
        if (!lastOutbound.has(m.conversation_id) || t > (lastOutbound.get(m.conversation_id) as number)) lastOutbound.set(m.conversation_id, t);
      });
      let unansweredConversations = 0;
      lastInbound.forEach((inAt, convId) => {
        const outAt = lastOutbound.get(convId) || 0;
        if (inAt > outAt && now.getTime() - inAt > 24 * 3600 * 1000) unansweredConversations += 1;
      });

      // Melhor dia da semana por volume de respostas recebidas
      const weekdayNames = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
      const weekdayCounts = new Array(7).fill(0);
      (inboundMsgsRes.data || []).forEach((m: any) => {
        const d = new Date(m.created_at);
        if (!isNaN(d.getTime())) weekdayCounts[d.getDay()] += 1;
      });
      const totalInbound = weekdayCounts.reduce((a, b) => a + b, 0);
      let bestResponseWeekday: { label: string; rate: number } | null = null;
      if (totalInbound >= 20) {
        const bestIdx = weekdayCounts.indexOf(Math.max(...weekdayCounts));
        bestResponseWeekday = { label: weekdayNames[bestIdx], rate: Math.round((weekdayCounts[bestIdx] / totalInbound) * 100) };
      }

      const forgottenHotLeads = (forgottenHotRes.data || []).filter((l: any) => {
        if (!l.last_activity_at) return true;
        return new Date(l.last_activity_at).getTime() < sevenDaysAgo.getTime();
      }).length;

      const campaignsWithoutReturn = (campaignsRes.data || []).filter((c: any) => (c.sent_count || 0) >= 20 && (c.total_responses || 0) === 0).length;
      const disconnectedNumbers = (numbersRes.data || []).filter((n: any) => n.is_connected === false).length;

      // Taxa de conversão lead -> venda
      const newLeadsCur = countOf(newLeadsCurRes);
      const newLeadsPrev = countOf(newLeadsPrevRes);
      const conversionRate = newLeadsCur > 0 && newLeadsPrev > 0
        ? { current: (dealsCur.length / newLeadsCur) * 100, previous: (dealsPrev.length / newLeadsPrev) * 100 }
        : null;

      // Pico de horário
      const scoreLogs24h = recentScoreLogsRes.data || [];
      let peakHour: number | null = null;
      if (scoreLogs24h.length > 5) {
        const hourCounts = new Map<number, number>();
        scoreLogs24h.forEach((log: any) => {
          if (!log.created_at) return;
          const h = new Date(log.created_at).getHours();
          if (!isNaN(h)) hourCounts.set(h, (hourCounts.get(h) || 0) + 1);
        });
        const top = Array.from(hourCounts.entries()).sort((a, b) => b[1] - a[1])[0];
        if (top) peakHour = top[0];
      }

      const globalDecayLeadIds = new Set((scoreDecayRes.data || []).map((l: any) => l.lead_id));

      const executiveAlerts = buildExecutiveAlerts({
        periodDays,
        prospected: { current: sumResults(prospCurRes), previous: sumResults(prospPrevRes) },
        newLeads: { current: newLeadsCur, previous: newLeadsPrev },
        messagesSent: {
          current: countOf(chatOutCurRes) + countOf(agentOutCurRes),
          previous: countOf(chatOutPrevRes) + countOf(agentOutPrevRes),
        },
        conversations: { current: countOf(convCurRes), previous: countOf(convPrevRes) },
        deals: {
          currentCount: dealsCur.length,
          previousCount: dealsPrev.length,
          currentValue: dealValue(dealsCur),
          previousValue: dealValue(dealsPrev),
        },
        meetings: { current: countOf(meetCurRes), previous: countOf(meetPrevRes) },
        leadsWithoutFirstContact: countOf(noContactRes),
        unansweredConversations,
        stuckLeads: countOf(stuckRes),
        forgottenHotLeads,
        upcomingMeetings7d: countOf(upcomingMeetRes),
        pendingPastMeetings: countOf(pendingPastMeetRes),
        campaignsWithoutReturn,
        disconnectedNumbers,
        bestResponseWeekday,
        conversionRate,
        hotGrowth24h: Array.from(scoreGrowthByLead.values()).filter((v) => v >= 100).length,
        decayedLeads7d: globalDecayLeadIds.size,
        readyForSale: allScores.filter((s: number) => s >= 801).length,
        coldLeads: allScores.filter((s: number) => s <= 200 && s > 0).length,
        peakHour,
      });


      return {
        receitaPotencial,
        receitaPotencialGrowth,
        leadsQuentesHoje,
        leadsQuentesOntem,
        healthStatus,
        healthDetail,
        aiMinutesSaved,
        leadsGeradosPeriodo,
        conversasAtivasPeriodo,
        oportunidadesQuentesPeriodo,
        radarLeads,
        executiveAlerts,
      };
    },
    staleTime: 30_000,
  });

  if (isLoading || !data) {
    return {
      receitaPotencial: 0,
      receitaPotencialGrowth: 0,
      leadsQuentesHoje: 0,
      leadsQuentesOntem: 0,
      healthStatus: "Carregando...",
      healthDetail: "",
      aiMinutesSaved: 0,
      leadsGeradosPeriodo: 0,
      conversasAtivasPeriodo: 0,
      oportunidadesQuentesPeriodo: 0,
      radarLeads: [],
      executiveAlerts: [],
      loading: true,
    };
  }

  return { ...data, loading: false };
}
