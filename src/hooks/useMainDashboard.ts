import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { subDays } from "date-fns";

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
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rawData, setRawData] = useState({
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
    if (!user) return;
    fetchData();
  }, [user, periodDays]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    const now = new Date();
    const periodStart = subDays(now, periodDays);
    const prevPeriodStart = subDays(now, periodDays * 2);
    const prevPeriodEnd = periodStart;

    try {
      const [
        searchCurrent, searchPrev,
        campaignsCurrent, campaignsPrev,
        responsesCurrent, responsesPrev,
        numbersRes, warmingRes, incidentsRes, cplRes,
        allTimeSearchRes, profileRes,
        allTimeCampaignsRes,
        leadsFunnelRes,
      ] = await Promise.all([
        supabase.from('search_history').select('results_count')
          .eq('user_id', user.id).gte('created_at', periodStart.toISOString()),
        supabase.from('search_history').select('results_count')
          .eq('user_id', user.id)
          .gte('created_at', prevPeriodStart.toISOString())
          .lt('created_at', prevPeriodEnd.toISOString()),
        supabase.from('whatsapp_campaigns')
          .select('id, name, status, sent_count, failed_count, total_leads, total_responses, created_at, whatsapp_number_id')
          .eq('user_id', user.id)
          .gte('created_at', periodStart.toISOString())
          .order('created_at', { ascending: false }),
        supabase.from('whatsapp_campaigns')
          .select('sent_count, failed_count, total_responses')
          .eq('user_id', user.id)
          .gte('created_at', prevPeriodStart.toISOString())
          .lt('created_at', prevPeriodEnd.toISOString()),
        supabase.from('campaign_responses').select('responded_at')
          .eq('user_id', user.id).gte('responded_at', periodStart.toISOString()),
        supabase.from('campaign_responses').select('id')
          .eq('user_id', user.id)
          .gte('responded_at', prevPeriodStart.toISOString())
          .lt('responded_at', prevPeriodEnd.toISOString()),
        supabase.from('whatsapp_numbers')
          .select('id, name, phone_number, is_connected, daily_sent_count, last_sent_at')
          .eq('user_id', user.id),
        supabase.from('warming_sessions')
          .select('id, whatsapp_number_id, warming_level, warming_status, status, messages_sent_today, error_message')
          .eq('user_id', user.id),
        supabase.from('campaign_incidents')
          .select('id, incident_type, detected_at, contact_phone')
          .eq('user_id', user.id)
          .gte('created_at', periodStart.toISOString())
          .order('created_at', { ascending: false }).limit(20),
        (supabase.from('system_settings' as any).select('value')
          .eq('key', 'cpl_benchmark').maybeSingle() as unknown as Promise<any>),
        // All-time search data for cumulative metrics
        supabase.from('search_history').select('results_count, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true }),
        supabase.from('profiles').select('created_at').eq('id', user.id).maybeSingle(),
        // All-time campaigns for monthly breakdown
        supabase.from('whatsapp_campaigns')
          .select('sent_count, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true }),
        // Leads do CRM no período — fonte única para o funil operacional (alinhado com Meta)
        supabase.from('leads')
          .select('id, opportunity_level, first_message_sent, has_responded')
          .eq('user_id', user.id)
          .gte('created_at', periodStart.toISOString()),
      ]) as any;

      const campaigns = campaignsCurrent.data || [];
      const prevCampaignData = campaignsPrev.data || [];

      const leadsProspected = (searchCurrent.data || []).reduce((s, r) => s + (r.results_count || 0), 0);
      const prevLeadsProspected = (searchPrev.data || []).reduce((s, r) => s + (r.results_count || 0), 0);
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
      (searchCurrent.data || []).forEach((r: any) => {
        // searchCurrent doesn't have created_at selected; use allTimeData filtered
      });
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

      setRawData({
        leadsProspected, prevLeadsProspected,
        messagesSent, prevMessagesSent,
        messagesFailed, prevMessagesFailed,
        totalResponses, prevTotalResponses,
        campaigns,
        numbers: numbersRes.data || [],
        warmingSessions: warmingRes.data || [],
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
      });
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
