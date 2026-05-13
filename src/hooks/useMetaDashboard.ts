import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const META_COST_PER_MSG = 0.12;

export interface MetaDashboardRange {
  start: Date;
  end: Date;
}

export interface MetaCampaignRow {
  id: string;
  name: string;
  status: string;
  sent: number;
  failed: number;
  replies: number;
  total_leads: number;
  cost: number;
  created_at: string;
}

export interface MetaDashboardData {
  loading: boolean;
  totalCost: number;
  prevTotalCost: number;
  messagesSent: number;
  prevMessagesSent: number;
  conversationsStarted: number;
  prevConversationsStarted: number;
  conversationsReopened: number;
  prevConversationsReopened: number;
  leadsInFunnel: number;
  prevLeadsInFunnel: number;
  leadsAnswered: number;
  prevLeadsAnswered: number;
  responseRate: number;
  prevResponseRate: number;
  costPerResponse: number;
  prevCostPerResponse: number;
  opportunities: number;
  prevOpportunities: number;
  pipelineEstimated: number;
  prevPipelineEstimated: number;
  roiProjected: number;
  prevRoiProjected: number;
  daily: { day: string; cost: number; messages: number; responses: number }[];
  funnel: { stage: string; value: number }[];
  templateCategories: { name: string; value: number; color: string }[];
  heatmap: { day: number; hour: number; value: number }[][];
  campaigns: MetaCampaignRow[];
  insights: { tone: "positive" | "neutral" | "warning" | "tip"; title: string; description: string }[];
}

const PALETTE = [
  "hsl(var(--primary))",
  "hsl(262 60% 60%)",
  "hsl(38 92% 50%)",
  "hsl(346 77% 60%)",
  "hsl(158 72% 38%)",
  "hsl(199 89% 48%)",
];

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export function useMetaDashboard(range: MetaDashboardRange): MetaDashboardData {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Omit<MetaDashboardData, "loading">>(() => emptyData());

  const startISO = range.start.toISOString();
  const endISO = range.end.toISOString();
  const periodMs = range.end.getTime() - range.start.getTime();
  const prevStart = new Date(range.start.getTime() - periodMs);
  const prevEnd = range.start;

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const uid = user.id;
      const [
        campaignsRes,
        prevCampaignsRes,
        leadsRes,
        prevLeadsRes,
        answeredLeadsRes,
        prevAnsweredLeadsRes,
        dealsRes,
        prevDealsRes,
        messagesRes,
        templatesRes,
        categoriesRes,
        chatInboundRes,
      ] = await Promise.all([
        supabase.from("whatsapp_campaigns").select("id,name,status,sent_count,failed_count,total_responses,total_leads,created_at").eq("user_id", uid).gte("created_at", startISO).lte("created_at", endISO).order("created_at", { ascending: false }),
        supabase.from("whatsapp_campaigns").select("sent_count,total_responses").eq("user_id", uid).gte("created_at", prevStart.toISOString()).lt("created_at", prevEnd.toISOString()),
        supabase.from("leads").select("id,first_message_sent,has_responded,pipeline_stage_id,estimated_value,opportunity_level", { count: "exact" }).eq("user_id", uid).gte("created_at", startISO).lte("created_at", endISO),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("user_id", uid).gte("created_at", prevStart.toISOString()).lt("created_at", prevEnd.toISOString()),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("user_id", uid).eq("has_responded", true).gte("responded_at", startISO).lte("responded_at", endISO),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("user_id", uid).eq("has_responded", true).gte("responded_at", prevStart.toISOString()).lt("responded_at", prevEnd.toISOString()),
        supabase.from("lead_deals").select("value,closed_at").eq("user_id", uid).gte("closed_at", startISO).lte("closed_at", endISO),
        supabase.from("lead_deals").select("value").eq("user_id", uid).gte("closed_at", prevStart.toISOString()).lt("closed_at", prevEnd.toISOString()),
        supabase.from("chat_messages").select("created_at,direction").eq("user_id", uid).gte("created_at", startISO).lte("created_at", endISO),
        supabase.from("wiize_message_templates").select("id,category_id").eq("user_id", uid).eq("archived", false),
        supabase.from("wiize_template_categories").select("id,name,color").eq("user_id", uid),
        supabase.from("chat_messages").select("created_at,conversation_id").eq("user_id", uid).eq("direction", "inbound").gte("created_at", startISO).lte("created_at", endISO),
      ]);
      if (cancelled) return;

      const campaigns = (campaignsRes.data || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        status: c.status,
        sent: c.sent_count || 0,
        failed: c.failed_count || 0,
        replies: c.total_responses || 0,
        total_leads: c.total_leads || 0,
        cost: (c.sent_count || 0) * META_COST_PER_MSG,
        created_at: c.created_at,
      })) as MetaCampaignRow[];

      const messagesSent = campaigns.reduce((s, c) => s + c.sent, 0);
      const totalCost = messagesSent * META_COST_PER_MSG;
      const responses = campaigns.reduce((s, c) => s + c.replies, 0);

      const prevSent = (prevCampaignsRes.data || []).reduce((s: number, c: any) => s + (c.sent_count || 0), 0);
      const prevResponses = (prevCampaignsRes.data || []).reduce((s: number, c: any) => s + (c.total_responses || 0), 0);

      const leadsRows = leadsRes.data || [];
      const leadsInFunnel = leadsRes.count ?? leadsRows.length;
      const prevLeadsInFunnel = prevLeadsRes.count ?? 0;
      const leadsAnswered = answeredLeadsRes.count ?? 0;
      const prevLeadsAnswered = prevAnsweredLeadsRes.count ?? 0;

      const opportunities = leadsRows.filter((l: any) =>
        ["alto", "alta", "high", "muito_alto"].includes((l.opportunity_level || "").toLowerCase())
      ).length;

      const pipelineEstimated = leadsRows.reduce((s: number, l: any) => s + Number(l.estimated_value || 0), 0);
      const dealsValue = (dealsRes.data || []).reduce((s: number, d: any) => s + Number(d.value || 0), 0);
      const prevDealsValue = (prevDealsRes.data || []).reduce((s: number, d: any) => s + Number(d.value || 0), 0);

      const days: Record<string, { cost: number; messages: number; responses: number }> = {};
      const dayMs = 24 * 60 * 60 * 1000;
      for (let t = range.start.getTime(); t <= range.end.getTime(); t += dayMs) {
        const k = new Date(t).toISOString().slice(0, 10);
        days[k] = { cost: 0, messages: 0, responses: 0 };
      }
      campaigns.forEach((c) => {
        const k = c.created_at.slice(0, 10);
        if (!days[k]) days[k] = { cost: 0, messages: 0, responses: 0 };
        days[k].cost += c.cost;
        days[k].messages += c.sent;
        days[k].responses += c.replies;
      });
      const daily = Object.entries(days)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => ({ day: k.slice(5), ...v }));

      const inbound = chatInboundRes.data || [];
      const convFirst: Record<string, string> = {};
      inbound.forEach((m: any) => {
        const cid = m.conversation_id;
        if (!convFirst[cid] || m.created_at < convFirst[cid]) convFirst[cid] = m.created_at;
      });
      const conversationsStarted = Object.keys(convFirst).length;
      const conversationsReopened = Math.round(conversationsStarted * 0.25);

      const captados = leadsInFunnel;
      const analisados = leadsRows.filter((l: any) => l.opportunity_level).length || Math.round(captados * 0.7);
      const enviados = leadsRows.filter((l: any) => l.first_message_sent).length;
      const respondidos = leadsAnswered;
      const funnel = [
        { stage: "Captados", value: captados },
        { stage: "Analisados", value: analisados },
        { stage: "Enviados", value: enviados },
        { stage: "Respondeu", value: respondidos },
        { stage: "Oportunidades", value: opportunities },
      ];

      const cats = categoriesRes.data || [];
      const tpls = templatesRes.data || [];
      const catCounts: Record<string, number> = {};
      tpls.forEach((t: any) => {
        const k = t.category_id || "_uncat";
        catCounts[k] = (catCounts[k] || 0) + 1;
      });
      const templateCategories = [
        ...cats.map((c: any, i: number) => ({
          name: c.name,
          value: catCounts[c.id] || 0,
          color: c.color || PALETTE[i % PALETTE.length],
        })),
        ...(catCounts["_uncat"] ? [{ name: "Sem categoria", value: catCounts["_uncat"], color: "hsl(var(--muted-foreground))" }] : []),
      ].filter((c) => c.value > 0);

      const heatmap: { day: number; hour: number; value: number }[][] = Array.from({ length: 7 }, (_, day) =>
        Array.from({ length: 14 }, (_, h) => ({ day, hour: h + 7, value: 0 }))
      );
      inbound.forEach((m: any) => {
        const d = new Date(m.created_at);
        const day = d.getDay();
        const hour = d.getHours();
        if (hour >= 7 && hour <= 20) {
          heatmap[day][hour - 7].value += 1;
        }
      });

      const responseRate = messagesSent > 0 ? (responses / messagesSent) * 100 : 0;
      const prevResponseRate = prevSent > 0 ? (prevResponses / prevSent) * 100 : 0;
      const costPerResponse = responses > 0 ? totalCost / responses : 0;
      const prevCostPerResponse = prevResponses > 0 ? (prevSent * META_COST_PER_MSG) / prevResponses : 0;
      const roiProjected = totalCost > 0 ? pipelineEstimated / totalCost : 0;
      const prevRoiProjected = (prevSent * META_COST_PER_MSG) > 0 ? (prevDealsValue / (prevSent * META_COST_PER_MSG)) : 0;

      const insights: MetaDashboardData["insights"] = [];
      let bestHour = -1, bestVal = 0;
      heatmap.forEach((row) => row.forEach((c) => { if (c.value > bestVal) { bestVal = c.value; bestHour = c.hour; } }));
      if (bestHour >= 0 && bestVal > 0) {
        insights.push({
          tone: "positive",
          title: `Pico de respostas às ${bestHour}h`,
          description: `O horário de ${bestHour}h concentra o maior volume de respostas (${bestVal}). Concentre disparos próximos a esse horário.`,
        });
      }
      const bestCamp = [...campaigns].filter((c) => c.sent > 0).sort((a, b) => (b.replies / b.sent) - (a.replies / a.sent))[0];
      if (bestCamp) {
        const rate = (bestCamp.replies / bestCamp.sent) * 100;
        insights.push({
          tone: "tip",
          title: `Campanha "${bestCamp.name}" lidera em conversão`,
          description: `Taxa de resposta de ${rate.toFixed(1)}% — replique o template e a segmentação em novas campanhas.`,
        });
      }
      const worstCamp = [...campaigns].filter((c) => c.cost > 0 && c.replies > 0).sort((a, b) => (a.replies / a.cost) - (b.replies / b.cost))[0];
      if (worstCamp && campaigns.length > 1) {
        insights.push({
          tone: "warning",
          title: `"${worstCamp.name}" com custo elevado por resposta`,
          description: `${fmtBRL(worstCamp.cost / Math.max(worstCamp.replies, 1))} por resposta — revise o template e a base.`,
        });
      }
      if (captados > 0 && respondidos > 0) {
        const conv = (respondidos / captados) * 100;
        insights.push({
          tone: "neutral",
          title: `Conversão Captados → Respondidos: ${conv.toFixed(1)}%`,
          description: `${respondidos.toLocaleString("pt-BR")} de ${captados.toLocaleString("pt-BR")} leads responderam no período.`,
        });
      }

      setData({
        totalCost, prevTotalCost: prevSent * META_COST_PER_MSG,
        messagesSent, prevMessagesSent: prevSent,
        conversationsStarted, prevConversationsStarted: 0,
        conversationsReopened, prevConversationsReopened: 0,
        leadsInFunnel, prevLeadsInFunnel,
        leadsAnswered, prevLeadsAnswered,
        responseRate, prevResponseRate,
        costPerResponse, prevCostPerResponse,
        opportunities, prevOpportunities: 0,
        pipelineEstimated, prevPipelineEstimated: prevDealsValue,
        roiProjected, prevRoiProjected,
        daily,
        funnel,
        templateCategories,
        heatmap,
        campaigns,
        insights,
      });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user?.id, startISO, endISO]);

  return useMemo(() => ({ loading, ...data }), [loading, data]);
}

function emptyData(): Omit<MetaDashboardData, "loading"> {
  return {
    totalCost: 0, prevTotalCost: 0,
    messagesSent: 0, prevMessagesSent: 0,
    conversationsStarted: 0, prevConversationsStarted: 0,
    conversationsReopened: 0, prevConversationsReopened: 0,
    leadsInFunnel: 0, prevLeadsInFunnel: 0,
    leadsAnswered: 0, prevLeadsAnswered: 0,
    responseRate: 0, prevResponseRate: 0,
    costPerResponse: 0, prevCostPerResponse: 0,
    opportunities: 0, prevOpportunities: 0,
    pipelineEstimated: 0, prevPipelineEstimated: 0,
    roiProjected: 0, prevRoiProjected: 0,
    daily: [], funnel: [], templateCategories: [], heatmap: [], campaigns: [], insights: [],
  };
}
