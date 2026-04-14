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
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-kpis", user?.id, periodDays],
    queryFn: async () => {
      if (!user) return null;

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
        supabase.from("leads").select("estimated_value").eq("user_id", user.id),
        supabase.from("leads").select("estimated_value").eq("user_id", user.id)
          .gte("created_at", thirtyDaysAgo.toISOString()),
        supabase.from("leads").select("estimated_value").eq("user_id", user.id)
          .gte("created_at", subDays(now, 60).toISOString())
          .lt("created_at", thirtyDaysAgo.toISOString()),
        supabase.from("revenue_score_logs").select("lead_id, points_applied").eq("user_id", user.id)
          .gte("created_at", last24h.toISOString()),
        supabase.from("revenue_score_logs").select("lead_id, points_applied").eq("user_id", user.id)
          .gte("created_at", last48h.toISOString())
          .lt("created_at", last24h.toISOString()),
        supabase.from("search_history").select("results_count").eq("user_id", user.id)
          .gte("created_at", periodStart.toISOString()),
        supabase.from("agent_conversations").select("id, agent_id")
          .in("status", ["active", "waiting_response"])
          .gte("updated_at", periodStart.toISOString()),
        supabase.from("revenue_leads").select("id, score_total").eq("user_id", user.id)
          .gte("score_total", 601)
          .gte("created_at", periodStart.toISOString()),
        supabase.from("agent_message_logs").select("content, direction")
          .eq("direction", "outbound")
          .gte("created_at", periodStart.toISOString()),
        supabase.from("wa_flow_executions" as any).select("id, node_history").eq("user_id", user.id)
          .gte("created_at", periodStart.toISOString()),
        // All revenue leads for health + radar
        supabase.from("revenue_leads").select("id, phone_e164, score_total, lead_name, status_bucket").eq("user_id", user.id),
        // Recent opportunities (last 7 days)
        supabase.from("search_history").select("results_count").eq("user_id", user.id)
          .gte("created_at", sevenDaysAgo.toISOString()),
        // Negative score logs last 7 days
        supabase.from("revenue_score_logs").select("lead_id, points_applied").eq("user_id", user.id)
          .lt("points_applied", 0)
          .gte("created_at", sevenDaysAgo.toISOString()),
        // Total prospected (all time)
        supabase.from("search_history").select("results_count").eq("user_id", user.id),
        // Total CRM leads
        supabase.from("leads").select("id").eq("user_id", user.id),
        // Score logs last 7 days (all, for radar growth)
        supabase.from("revenue_score_logs").select("lead_id, points_applied").eq("user_id", user.id)
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
      const { data: userAgents } = await supabase.from("ai_agents").select("id").eq("user_id", user.id);
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
        const decayLogs = scoreDecayRes.data || [];
        const decayLeadIds = new Set(decayLogs.map((l: any) => l.lead_id));
        const decayCount = decayLeadIds.size;
        if (decayCount > 0 && totalLeadsWithScore > 0) {
          totalMaxPoints += 10;
          const decayRatio = decayCount / totalLeadsWithScore;
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
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(500);

      // Also fetch company average ticket for fallback
      const { data: companyServices } = await supabase
        .from("company_services")
        .select("average_ticket")
        .eq("user_id", user.id);
      const avgTicket = companyServices && companyServices.length > 0
        ? companyServices.reduce((s, sv) => s + (sv.average_ticket || 0), 0) / companyServices.length
        : 0;

      // Match CRM leads to revenue_leads by phone
      const revenueLeadsMap = new Map<string, any>();
      (allRevenueLeadsRes.data || []).forEach((rl: any) => {
        const key = rl.phone_e164.replace(/\D/g, "").slice(-8);
        revenueLeadsMap.set(key, rl);
      });

      const radarLeads: RadarLead[] = (crmLeadsForRadar || [])
        .map((lead) => {
          const phoneKey = (lead.phone || "").replace(/\D/g, "").slice(-8);
          const revLead = phoneKey.length >= 8 ? revenueLeadsMap.get(phoneKey) : null;
          const score = revLead?.score_total || 0;
          const scoreGrowth = revLead ? (scoreGrowth7dMap.get(revLead.id) || 0) : 0;
          const potential = Number(lead.estimated_value) || avgTicket;
          return {
            id: lead.id,
            name: lead.company_name || "Sem nome",
            phone: lead.phone || "",
            segment: lead.category || "",
            score,
            potential,
            status: getStatusFromScore(score),
            scoreGrowth7d: scoreGrowth,
          };
        })
        .filter(l => l.scoreGrowth7d > 0)
        .sort((a, b) => b.scoreGrowth7d - a.scoreGrowth7d)
        .slice(0, 6);

      // --- Executive Alerts (real data-driven) ---
      const executiveAlerts: ExecutiveAlert[] = [];

      // 1. Leads with highest score growth today
      const topGrowthToday = Array.from(scoreGrowthByLead.entries())
        .sort((a, b) => b[1] - a[1]);
      if (topGrowthToday.length > 0 && topGrowthToday[0][1] >= 100) {
        executiveAlerts.push({
          type: 'success',
          icon: React.createElement(Flame, { size: 14 }),
          text: `${topGrowthToday.filter(([_, v]) => v >= 100).length} leads tiveram aumento de score superior a 100 pts nas últimas 24h`,
          route: '/crm-score',
        });
      }

      // 2. Score decay alert
      if (decayCount > 0) {
        executiveAlerts.push({
          type: 'warning',
          icon: React.createElement(TrendingDown, { size: 14 }),
          text: `${decayCount} leads perderam pontos de score nos últimos 7 dias — risco de esfriamento`,
          route: '/crm-score',
        });
      }

      // 3. Hot leads ready for sale
      const readyForSale = allScores.filter((s: number) => s >= 801).length;
      if (readyForSale > 0) {
        executiveAlerts.push({
          type: 'success',
          icon: React.createElement(Zap, { size: 14 }),
          text: `${readyForSale} leads com score acima de 800 — prontos para abordagem de venda`,
          route: '/crm',
        });
      }

      // 4. Cold leads warning
      const coldLeadsCount = allScores.filter((s: number) => s <= 200 && s > 0).length;
      if (coldLeadsCount > 5) {
        executiveAlerts.push({
          type: 'danger',
          icon: React.createElement(ThermometerSun, { size: 14 }),
          text: `${coldLeadsCount} leads frios (score ≤200) — considere reativação ou limpeza`,
          route: '/crm-score',
        });
      }

      // 5. Peak activity hour (based on score logs timestamps)
      const scoreLogs24h = recentScoreLogsRes.data || [];
      if (scoreLogs24h.length > 5) {
        const hourCounts = new Map<number, number>();
        scoreLogs24h.forEach((log: any) => {
          const h = new Date(log.created_at).getHours();
          hourCounts.set(h, (hourCounts.get(h) || 0) + 1);
        });
        const peakHour = Array.from(hourCounts.entries()).sort((a, b) => b[1] - a[1])[0];
        if (peakHour) {
          executiveAlerts.push({
            type: 'info',
            icon: React.createElement(Clock, { size: 14 }),
            text: `Pico de atividade dos leads: ${peakHour[0].toString().padStart(2, '0')}:00 — melhor horário para envios`,
            route: '/whatsapp-campaign',
          });
        }
      }

      // 6. No activity fallback
      if (executiveAlerts.length === 0) {
        executiveAlerts.push({
          type: 'info',
          icon: React.createElement(AlertCircle, { size: 14 }),
          text: 'Sem alertas no momento. Continue prospectando para gerar diagnósticos.',
          route: '/opportunities',
        });
      }

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
    enabled: !!user,
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
      loading: true,
    };
  }

  return { ...data, loading: false };
}
