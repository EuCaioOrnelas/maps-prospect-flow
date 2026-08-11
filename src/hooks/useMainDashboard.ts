import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { subDays } from "date-fns";
import { getSnapshot, commitSnapshot } from "@/lib/dashboardSnapshot";


export interface MonthlyBreakdown {
  month: string;
  leads: number;
  conversations: number;
  opportunities: number;
}

export interface DashboardMetrics {
  leadsProspected: number;
  prevLeadsProspected: number;
  messagesSent: number;
  prevMessagesSent: number;
  messagesFailed: number;
  prevMessagesFailed: number;
  totalResponses: number;
  prevTotalResponses: number;
  deliverabilityRate: number;
  prevDeliverabilityRate: number;
  responseRate: number;
  prevResponseRate: number;
  campaigns: any[];
  numbers: any[];
  warmingSessions: any[];
  incidents: any[];
  responsesByDay: { date: string; count: number }[];
  cplBenchmark: number;
  loading: boolean;
  allTimeLeads: number;
  cumulativeByMonth: { month: string; total: number }[];
  accountCreatedAt: string | null;
  monthlyLeads: number;
  activeDays: number;
  monthlyBreakdown: MonthlyBreakdown[];
  leadsByDay: { date: string; count: number }[];
  funnel: { stage: string; value: number }[];
}

export function useMainDashboard(periodDays: number): DashboardMetrics {
  const { user, accountOwnerId } = useAuth();
  const publicDemo = typeof window !== "undefined" && window.location.pathname === "/tour-guiado";
  const snapKey = `main:${accountOwnerId || "anon"}:${periodDays}`;
  const cachedSnap = publicDemo ? null : getSnapshot<any>(snapKey);
  const [loading, setLoading] = useState(!publicDemo && !cachedSnap);
  const [rawData, setRawData] = useState(cachedSnap ?? {
    leadsProspected: 0,
    prevLeadsProspected: 0,
    messagesSent: 0,
    prevMessagesSent: 0,
    messagesFailed: 0,
    prevMessagesFailed: 0,
    totalResponses: 0,
    prevTotalResponses: 0,
    campaigns: [] as any[],
    numbers: [] as any[],
    warmingSessions: [] as any[],
    incidents: [] as any[],
    responsesByDay: [] as { date: string; count: number }[],
    cplBenchmark: 50,
    allTimeLeads: 0,
    cumulativeByMonth: [] as { month: string; total: number }[],
    accountCreatedAt: null as string | null,
    monthlyLeads: 0,
    activeDays: 0,
    monthlyBreakdown: [] as MonthlyBreakdown[],
    leadsByDay: [] as { date: string; count: number }[],
    funnel: [] as { stage: string; value: number }[],
  });

  useEffect(() => {
    if (publicDemo) return;
    if (!user || !accountOwnerId) return;
    const snap = getSnapshot<any>(snapKey);
    if (snap) { setRawData(snap); setLoading(false); }
    fetchData();
  }, [user?.id, accountOwnerId, periodDays, publicDemo, snapKey]);

  const fetchData = async () => {
    if (!user || !accountOwnerId) return;
    // Não mostra skeleton se já temos dados em cache — atualização é silenciosa
    if (!getSnapshot<any>(snapKey)) setLoading(true);


    const now = new Date();
    const periodStart = subDays(now, periodDays);
    const prevPeriodStart = subDays(now, periodDays * 2);
    const prevPeriodEnd = periodStart;

    try {
      const [
        responsesCurrent, responsesPrev,
        numbersRes, incidentsRes, cplRes,
        allTimeSearchRes, profileRes,
        allTimeCampaignsRes,
        leadsFunnelRes,
      ] = await Promise.all([
        supabase.from('campaign_responses').select('responded_at')
          .eq('owner_user_id', accountOwnerId).gte('responded_at', periodStart.toISOString()),
        supabase.from('campaign_responses').select('id')
          .eq('owner_user_id', accountOwnerId)
          .gte('responded_at', prevPeriodStart.toISOString())
          .lt('responded_at', prevPeriodEnd.toISOString()),
        supabase.from('whatsapp_numbers')
          .select('id, name, phone_number, is_connected, daily_sent_count, last_sent_at')
          .eq('owner_user_id', accountOwnerId),
        supabase.from('campaign_incidents')
          .select('id, incident_type, detected_at, contact_phone')
          .eq('owner_user_id', accountOwnerId)
          .gte('created_at', periodStart.toISOString())
          .order('created_at', { ascending: false }).limit(20),
        (supabase.from('system_settings' as any).select('value')
          .eq('key', 'cpl_benchmark').maybeSingle() as unknown as Promise<any>),
        // Consulta única de search_history (all-time) — período atual e anterior
        // são derivados em memória a partir deste mesmo conjunto.
        supabase.from('search_history').select('results_count, created_at')
          .eq('owner_user_id', accountOwnerId)
          .order('created_at', { ascending: true }),
        supabase.from('profiles').select('created_at').eq('id', accountOwnerId).maybeSingle(),
        // Consulta única de campanhas (all-time) — período atual, anterior e
        // breakdown mensal derivam deste mesmo conjunto.
        supabase.from('whatsapp_campaigns')
          .select('id, name, status, sent_count, failed_count, total_leads, total_responses, created_at, whatsapp_number_id')
          .eq('owner_user_id', accountOwnerId)
          .order('created_at', { ascending: true }),
        // Leads do CRM no período — fonte única para o funil operacional (alinhado com Meta)
        supabase.from('leads')
          .select('id, opportunity_level, first_message_sent, has_responded')
          .eq('owner_user_id', accountOwnerId)
          .gte('created_at', periodStart.toISOString()),
      ]) as any;

      // ── Derivações em memória (substituem consultas duplicadas) ──
      // Comparação por timestamp numérico (evita depender do formato ISO retornado).
      const periodStartMs = periodStart.getTime();
      const prevStartMs = prevPeriodStart.getTime();
      const prevEndMs = prevPeriodEnd.getTime();
      const ts = (v: string) => new Date(v).getTime();

      const allSearchRows: any[] = allTimeSearchRes.data || [];
      const searchCurrentRows = allSearchRows.filter((r) => ts(r.created_at) >= periodStartMs);
      const searchPrevRows = allSearchRows.filter(
        (r) => ts(r.created_at) >= prevStartMs && ts(r.created_at) < prevEndMs
      );

      const allCampaignRows: any[] = allTimeCampaignsRes.data || [];
      // Mesma ordenação da consulta original do período (created_at desc)
      const campaigns = allCampaignRows
        .filter((c) => ts(c.created_at) >= periodStartMs)
        .slice()
        .reverse();
      const prevCampaignData = allCampaignRows.filter(
        (c) => ts(c.created_at) >= prevStartMs && ts(c.created_at) < prevEndMs
      );

      const leadsProspected = searchCurrentRows.reduce((s, r) => s + (r.results_count || 0), 0);
      const prevLeadsProspected = searchPrevRows.reduce((s, r) => s + (r.results_count || 0), 0);
      const messagesSent = campaigns.reduce((s, c) => s + (c.sent_count || 0), 0);
      const messagesFailed = campaigns.reduce((s, c) => s + (c.failed_count || 0), 0);
      const prevMessagesSent = prevCampaignData.reduce((s, c) => s + (c.sent_count || 0), 0);
      const prevMessagesFailed = prevCampaignData.reduce((s, c) => s + (c.failed_count || 0), 0);
      const totalResponses = (responsesCurrent.data || []).length;
      const prevTotalResponses = (responsesPrev.data || []).length;

      // Responses by day
      const byDayMap: Record<string, number> = {};
      (responsesCurrent.data || []).forEach((r: any) => {
        const day = new Date(r.responded_at).toLocaleDateString('pt-BR');
        byDayMap[day] = (byDayMap[day] || 0) + 1;
      });
      const responsesByDay = Object.entries(byDayMap)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => {
          const [dA, mA, yA] = a.date.split('/').map(Number);
          const [dB, mB, yB] = b.date.split('/').map(Number);
          return new Date(yA, mA - 1, dA).getTime() - new Date(yB, mB - 1, dB).getTime();
        });

      const cplValue = cplRes.data?.value as any;

      // Cumulative data
      const allTimeData = allTimeSearchRes.data || [];
      const allTimeLeads = allTimeData.reduce((s: number, r: any) => s + (r.results_count || 0), 0);

      // Build cumulative by month
      const monthMap: Record<string, number> = {};
      const dayMap: Record<string, number> = {};
      allTimeData.forEach((r: any) => {
        const d = new Date(r.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthMap[key] = (monthMap[key] || 0) + (r.results_count || 0);
        const dayKey = d.toISOString().slice(0, 10);
        dayMap[dayKey] = (dayMap[dayKey] || 0) + (r.results_count || 0);
      });
      const sortedMonths = Object.keys(monthMap).sort();
      let cumTotal = 0;
      const cumulativeByMonth = sortedMonths.map(m => {
        cumTotal += monthMap[m];
        return { month: m.slice(2).replace('-', '/'), total: cumTotal };
      });

      // Active days (unique days with searches in current period)
      const activeDaysSet = new Set<string>();
      allTimeData
        .filter((r: any) => new Date(r.created_at) >= periodStart)
        .forEach((r: any) => {
          activeDaysSet.add(new Date(r.created_at).toISOString().slice(0, 10));
        });

      // Build monthly breakdown — always last 3 calendar months (including current)
      const campaignMonthMap: Record<string, number> = {};
      (allTimeCampaignsRes.data || []).forEach((c: any) => {
        const d = new Date(c.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        campaignMonthMap[key] = (campaignMonthMap[key] || 0) + (c.sent_count || 0);
      });

      // Generate last 3 months keys (current + 2 previous), handling year boundaries
      const last3MonthKeys: string[] = [];
      for (let i = 2; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        last3MonthKeys.push(key);
      }

      const monthlyBreakdown: MonthlyBreakdown[] = last3MonthKeys.map(m => {
        const leads = monthMap[m] || 0;
        const conversations = campaignMonthMap[m] || 0;
        const opportunities = Math.round(conversations * 0.03);
        return {
          month: m.slice(2).replace('-', '/'),
          leads,
          conversations,
          opportunities,
        };
      });

      // Build leadsByDay sorted
      const leadsByDay = Object.entries(dayMap)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Funil operacional — mesma lógica do Meta, sobre TODOS os leads do CRM no período
      const leadsFunnelRows: any[] = (leadsFunnelRes?.data as any[]) || [];
      const captados = leadsFunnelRows.length;
      const analisados = leadsFunnelRows.filter((l) => l.opportunity_level).length;
      const enviados = leadsFunnelRows.filter((l) => l.first_message_sent).length;
      const respondidos = leadsFunnelRows.filter((l) => l.has_responded).length;
      const oportunidades = leadsFunnelRows.filter((l) =>
        ["alto", "alta", "high", "muito_alto"].includes((l.opportunity_level || "").toLowerCase())
      ).length;
      const funnel = [
        { stage: "Captados", value: captados },
        { stage: "Analisados", value: analisados },
        { stage: "Enviados", value: enviados },
        { stage: "Respondeu", value: respondidos },
        { stage: "Oportunidades", value: oportunidades },
      ];

      const next = {
        leadsProspected, prevLeadsProspected,
        messagesSent, prevMessagesSent,
        messagesFailed, prevMessagesFailed,
        totalResponses, prevTotalResponses,
        campaigns,
        numbers: numbersRes.data || [],
        warmingSessions: [] as any[],
        incidents: incidentsRes.data || [],
        responsesByDay,
        cplBenchmark: cplValue?.value || 50,
        allTimeLeads,
        cumulativeByMonth,
        accountCreatedAt: profileRes.data?.created_at || null,
        monthlyLeads: leadsProspected,
        activeDays: activeDaysSet.size,
        monthlyBreakdown,
        leadsByDay,
        funnel,
      };
      // Atualiza somente quando os números realmente mudaram
      if (commitSnapshot(snapKey, next)) setRawData(next);

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  return useMemo(() => {
    const { messagesSent, messagesFailed, prevMessagesSent, prevMessagesFailed, totalResponses, prevTotalResponses } = rawData;
    const total = messagesSent + messagesFailed;
    const prevTotal = prevMessagesSent + prevMessagesFailed;

    return {
      ...rawData,
      deliverabilityRate: total > 0 ? (messagesSent / total) * 100 : 0,
      prevDeliverabilityRate: prevTotal > 0 ? (prevMessagesSent / prevTotal) * 100 : 0,
      responseRate: messagesSent > 0 ? (totalResponses / messagesSent) * 100 : 0,
      prevResponseRate: prevMessagesSent > 0 ? (prevTotalResponses / prevMessagesSent) * 100 : 0,
      loading,
    };
  }, [rawData, loading]);
}
