import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { subDays, subHours } from "date-fns";

export interface DashboardKPIData {
  // Receita Potencial — sum of estimated_value from ALL CRM leads (no period filter)
  receitaPotencial: number;
  receitaPotencialGrowth: number; // % growth vs 30 days ago snapshot

  // Leads Quentes Hoje — leads with 150+ score growth in last 24h
  leadsQuentesHoje: number;
  leadsQuentesOntem: number;

  // Gargalo — health status
  healthStatus: string;
  healthDetail: string;

  // IA Economizou — time saved
  aiMinutesSaved: number;

  // Real mini-stats for Hero
  leadsGeradosPeriodo: number;
  conversasAtivasPeriodo: number;
  oportunidadesQuentesPeriodo: number;

  loading: boolean;
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

      const [
        // CRM deals for Receita Potencial (all time)
        allDealsRes,
        // Deals created in last 30 days for growth
        recentDealsRes,
        // Deals created 30-60 days ago for growth comparison
        prevDealsRes,
        // Score snapshots for hot leads detection (last 24h vs previous)
        recentScoreLogsRes,
        // Yesterday's score logs
        yesterdayScoreLogsRes,
        // Leads created in period (opportunities)
        leadsInPeriodRes,
        // Active conversations (agent conversations with recent activity)
        activeConvosRes,
        // Revenue leads that became hot in period (score >= 601)
        hotLeadsInPeriodRes,
        // AI agent message logs (outbound) for time saved
        aiMessagesRes,
        // WA flow executions for time saved
        flowExecsRes,
        // Score snapshots today vs yesterday for health
        scoreTodayRes,
        scoreYesterdayRes,
      ] = await Promise.all([
        supabase.from("leads").select("estimated_value").eq("user_id", user.id),
        supabase.from("leads").select("estimated_value").eq("user_id", user.id)
          .gte("created_at", thirtyDaysAgo.toISOString()),
        supabase.from("leads").select("estimated_value").eq("user_id", user.id)
          .gte("created_at", subDays(now, 60).toISOString())
          .lt("created_at", thirtyDaysAgo.toISOString()),
        // Score logs in last 24h
        supabase.from("revenue_score_logs").select("lead_id, points_applied").eq("user_id", user.id)
          .gte("created_at", last24h.toISOString()),
        // Score logs 24-48h ago
        supabase.from("revenue_score_logs").select("lead_id, points_applied").eq("user_id", user.id)
          .gte("created_at", last48h.toISOString())
          .lt("created_at", last24h.toISOString()),
        // Leads generated in period
        supabase.from("search_history").select("results_count").eq("user_id", user.id)
          .gte("created_at", periodStart.toISOString()),
        // Active agent conversations in period
        supabase.from("agent_conversations").select("id, agent_id")
          .in("status", ["active", "waiting_response"])
          .gte("updated_at", periodStart.toISOString()),
        // Hot leads (score >= 601) created or scored in period
        supabase.from("revenue_leads").select("id, score_total").eq("user_id", user.id)
          .gte("score_total", 601)
          .gte("created_at", periodStart.toISOString()),
        // AI messages (outbound, from agents)
        supabase.from("agent_message_logs").select("content, direction")
          .eq("direction", "outbound")
          .gte("created_at", periodStart.toISOString()),
        // Flow executions in period
        supabase.from("wa_flow_executions" as any).select("id, node_history").eq("user_id", user.id)
          .gte("created_at", periodStart.toISOString()),
        // Score today for health
        supabase.from("revenue_leads").select("score_total").eq("user_id", user.id),
        // Search history for opportunity trend
        supabase.from("search_history").select("results_count").eq("user_id", user.id)
          .gte("created_at", subDays(now, 7).toISOString()),
      ]);

      // --- Receita Potencial ---
      const allDeals = allDealsRes.data || [];
      const receitaPotencial = allDeals.reduce((s, d) => s + (Number(d.estimated_value) || 0), 0);
      const recentDeals = recentDealsRes.data || [];
      const prevDeals = prevDealsRes.data || [];
      const recentSum = recentDeals.reduce((s, d) => s + (Number(d.estimated_value) || 0), 0);
      const prevSum = prevDeals.reduce((s, d) => s + (Number(d.estimated_value) || 0), 0);
      const receitaPotencialGrowth = prevSum > 0 ? ((recentSum - prevSum) / prevSum) * 100 : 0;

      // --- Leads Quentes Hoje (150+ score growth in 24h) ---
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

      // Filter active convos to only this user's agents
      const agentConvos = activeConvosRes.data || [];
      // We need to check agent ownership - fetch user's agents
      const { data: userAgents } = await supabase.from("ai_agents").select("id").eq("user_id", user.id);
      const userAgentIds = new Set((userAgents || []).map(a => a.id));
      const conversasAtivasPeriodo = agentConvos.filter(c => userAgentIds.has(c.agent_id)).length;

      const oportunidadesQuentesPeriodo = (hotLeadsInPeriodRes.data || []).length;

      // --- IA Economizou ---
      const aiMessages = aiMessagesRes.data || [];
      // Average human typing speed: ~40 words/min, ~200 chars/min
      const totalAIChars = aiMessages.reduce((s, m) => s + ((m.content || '').length), 0);
      const aiTypingMinutes = totalAIChars / 200;

      // Flow executions - estimate 2 min per node traversal for a human
      const flowExecs = (flowExecsRes as any).data || [];
      let flowNodes = 0;
      flowExecs.forEach((exec: any) => {
        if (Array.isArray(exec.node_history)) {
          flowNodes += exec.node_history.length;
        }
      });
      const flowMinutes = flowNodes * 2;

      const aiMinutesSaved = Math.round(aiTypingMinutes + flowMinutes);

      // --- Health Status ---
      const allScores = (scoreTodayRes.data || []).map((l: any) => l.score_total || 0);
      const avgScore = allScores.length > 0 ? allScores.reduce((a: number, b: number) => a + b, 0) / allScores.length : 0;
      const recentOppCount = (scoreYesterdayRes.data || []).reduce((s, r) => s + (r.results_count || 0), 0);

      let healthStatus = "Operação Saudável";
      let healthDetail = "Score e oportunidades dentro do esperado";

      if (avgScore < 150 && recentOppCount < 10) {
        healthStatus = "Atenção Necessária";
        healthDetail = "Score médio baixo e poucas oportunidades recentes";
      } else if (avgScore < 200) {
        healthStatus = "Score Baixo";
        healthDetail = "Engajamento dos leads precisa melhorar";
      } else if (recentOppCount === 0) {
        healthStatus = "Sem Prospecção";
        healthDetail = "Nenhuma oportunidade gerada recentemente";
      } else if (avgScore >= 400) {
        healthStatus = "Excelente";
        healthDetail = "Score alto e pipeline ativo";
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
      loading: true,
    };
  }

  return { ...data, loading: false };
}
