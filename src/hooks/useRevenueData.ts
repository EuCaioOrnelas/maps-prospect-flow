import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Types matching DB schema
export interface RevenueLead {
  id: string;
  user_id: string;
  phone_e164: string;
  name: string | null;
  first_seen_at: string;
  last_activity_at: string;
  status_bucket: "COLD" | "ENGAGED" | "HOT" | "VERY_HOT";
  score_total: number;
  score_last_calc_at: string | null;
  source_number_instance_id: string | null;
  tags: string[];
  notes: string | null;
  risk_state: "OK" | "COOLING" | "AT_RISK";
  risk_reason: string | null;
  estimated_ticket_value: number | null;
  created_at: string;
  updated_at: string;
}

export interface RevenueEvent {
  id: string;
  user_id: string;
  lead_id: string;
  number_instance_id: string | null;
  event_type: string;
  event_value: number;
  event_meta: Record<string, unknown>;
  created_at: string;
}

export interface RevenueScoreLog {
  id: string;
  lead_id: string;
  event_id: string | null;
  user_id: string;
  event_type: string;
  points_applied: number;
  score_before: number;
  score_after: number;
  category: string;
  created_at: string;
}

export interface RevenueScoreSnapshot {
  id: string;
  lead_id: string;
  snapshot_date: string;
  score_value: number;
  status_bucket: string;
}

export interface RevenueSettings {
  id: string;
  user_id: string;
  default_ticket_value: number;
  default_close_rate_cold: number;
  default_close_rate_engaged: number;
  default_close_rate_hot: number;
  default_close_rate_very_hot: number;
  sla_first_response_minutes: number;
  risk_no_reply_hours: number;
  cooldown_decay_per_day: number;
}

export interface RevenueConversation {
  id: string;
  lead_id: string;
  number_instance_id: string | null;
  last_inbound_at: string | null;
  last_outbound_at: string | null;
  inbound_count_7d: number;
  outbound_count_7d: number;
  avg_response_time_seconds: number;
  unreplied_inbound_count: number;
}

export const useRevenueLeads = (filters?: {
  bucket?: string;
  riskState?: string;
  numberId?: string;
}) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["revenue-leads", user?.id, filters],
    queryFn: async () => {
      let query = supabase
        .from("revenue_leads")
        .select("*")
        .order("score_total", { ascending: false });

      if (filters?.bucket) {
        query = query.eq("status_bucket", filters.bucket as any);
      }
      if (filters?.riskState) {
        query = query.eq("risk_state", filters.riskState as any);
      }
      if (filters?.numberId) {
        query = query.eq("source_number_instance_id", filters.numberId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as RevenueLead[];
    },
    enabled: !!user,
  });
};

export const useRevenueLead = (leadId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["revenue-lead", leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("revenue_leads")
        .select("*")
        .eq("id", leadId)
        .single();
      if (error) throw error;
      return data as unknown as RevenueLead;
    },
    enabled: !!user && !!leadId,
  });
};

export const useRevenueEvents = (leadId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["revenue-events", leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("revenue_events")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as unknown as RevenueEvent[];
    },
    enabled: !!user && !!leadId,
  });
};

export const useRevenueScoreLogs = (leadId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["revenue-score-logs", leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("revenue_score_logs")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false })
        .limit(15);
      if (error) throw error;
      return (data || []) as unknown as RevenueScoreLog[];
    },
    enabled: !!user && !!leadId,
  });
};

export const useRevenueScoreSnapshots = (leadId: string, days: number = 30) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["revenue-score-snapshots", leadId, days],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - days);
      const { data, error } = await supabase
        .from("revenue_score_snapshots")
        .select("*")
        .eq("lead_id", leadId)
        .gte("snapshot_date", since.toISOString().split("T")[0])
        .order("snapshot_date", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as RevenueScoreSnapshot[];
    },
    enabled: !!user && !!leadId,
  });
};

export const useRevenueSettings = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["revenue-settings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("revenue_settings")
        .select("*")
        .maybeSingle();

      if (error) throw error;
      return data as unknown as RevenueSettings | null;
    },
    enabled: !!user,
  });
};

export const useRevenueIntentDistribution = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["revenue-intent-distribution", user?.id],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data, error } = await supabase
        .from("revenue_events")
        .select("event_type")
        .gte("created_at", sevenDaysAgo.toISOString())
        .in("event_type", [
          "INTENT_PRICE",
          "INTENT_BUY_NOW",
          "INTENT_AVAILABILITY",
          "INTENT_PAYMENT",
          "INTENT_PROPOSAL",
          "INTENT_URGENT",
          "INTENT_OBJECTION",
          "INTENT_NEGATIVE",
        ]);

      if (error) throw error;

      const counts: Record<string, number> = {};
      for (const e of data || []) {
        counts[e.event_type] = (counts[e.event_type] || 0) + 1;
      }
      return counts;
    },
    enabled: !!user,
  });
};

export const useRevenueConversations = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["revenue-conversations", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("revenue_conversations")
        .select("*");
      if (error) throw error;
      return (data || []) as unknown as RevenueConversation[];
    },
    enabled: !!user,
  });
};

export const useRevenueNumberStats = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["revenue-number-stats", user?.id],
    queryFn: async () => {
      const { data: leads, error } = await supabase
        .from("revenue_leads")
        .select("source_number_instance_id, status_bucket, risk_state, score_total");

      if (error) throw error;

      const stats: Record<string, {
        total: number;
        hot: number;
        veryHot: number;
        atRisk: number;
        avgScore: number;
        scores: number[];
      }> = {};

      for (const lead of (leads || []) as unknown as RevenueLead[]) {
        const nid = lead.source_number_instance_id || "unknown";
        if (!stats[nid]) {
          stats[nid] = { total: 0, hot: 0, veryHot: 0, atRisk: 0, avgScore: 0, scores: [] };
        }
        stats[nid].total++;
        stats[nid].scores.push(lead.score_total);
        if (lead.status_bucket === "HOT") stats[nid].hot++;
        if (lead.status_bucket === "VERY_HOT") stats[nid].veryHot++;
        if (lead.risk_state !== "OK") stats[nid].atRisk++;
      }

      for (const nid of Object.keys(stats)) {
        const s = stats[nid];
        s.avgScore = s.scores.length > 0 ? Math.round(s.scores.reduce((a, b) => a + b, 0) / s.scores.length) : 0;
      }

      return stats;
    },
    enabled: !!user,
  });
};

export const useRevenueDashboardStats = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["revenue-dashboard-stats", user?.id],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: leads, error } = await supabase
        .from("revenue_leads")
        .select("id, status_bucket, score_total, risk_state, last_activity_at, estimated_ticket_value, name, phone_e164");

      if (error) throw error;
      const all = (leads || []) as unknown as RevenueLead[];

      const active7d = all.filter(
        (l) => new Date(l.last_activity_at) >= sevenDaysAgo
      ).length;
      const hotCount = all.filter(
        (l) => l.status_bucket === "HOT" || l.status_bucket === "VERY_HOT"
      ).length;
      const atRiskCount = all.filter(
        (l) => l.risk_state !== "OK"
      ).length;

      // Priority score ranking
      const now = Date.now();
      const ranked = all.map((lead) => {
        const hoursAgo = (now - new Date(lead.last_activity_at).getTime()) / 3600000;
        let priorityScore = lead.score_total * 0.7;
        if (lead.risk_state === "AT_RISK") priorityScore += 150;
        if (hoursAgo < 2) priorityScore += 40;
        
        // Recommended action
        let recommendedAction = "";
        if ((lead.status_bucket === "HOT" || lead.status_bucket === "VERY_HOT") && lead.risk_state === "AT_RISK") {
          recommendedAction = "Responder imediatamente";
        } else if (lead.risk_state === "COOLING") {
          recommendedAction = "Reengajar com follow-up";
        } else if (lead.status_bucket === "VERY_HOT") {
          recommendedAction = "Enviar proposta";
        } else if (lead.status_bucket === "HOT") {
          recommendedAction = "Qualificar oportunidade";
        } else if (hoursAgo > 72) {
          recommendedAction = "Reengajar com follow-up";
        } else {
          recommendedAction = "Acompanhar";
        }

        return { ...lead, priorityScore, recommendedAction };
      });

      ranked.sort((a, b) => b.priorityScore - a.priorityScore);
      const topOpportunities = ranked.slice(0, 10);

      return {
        totalLeads: all.length,
        active7d,
        hotCount,
        atRiskCount,
        topOpportunities,
        allLeads: all,
        bucketCounts: {
          COLD: all.filter((l) => l.status_bucket === "COLD").length,
          ENGAGED: all.filter((l) => l.status_bucket === "ENGAGED").length,
          HOT: all.filter((l) => l.status_bucket === "HOT").length,
          VERY_HOT: all.filter((l) => l.status_bucket === "VERY_HOT").length,
        },
      };
    },
    enabled: !!user,
  });
};

export const useHasConnectedNumbers = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["has-connected-numbers", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_numbers")
        .select("id")
        .eq("user_id", user!.id)
        .limit(1);
      if (error) throw error;
      return (data || []).length > 0;
    },
    enabled: !!user,
  });
};

export const useRevenuePerformanceScore = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["revenue-performance-score", user?.id],
    queryFn: async () => {
      const emptyResult = {
        performanceScore: 0,
        avgResponseTimeMinutes: 0,
        hotResponseRate: 0,
        ignoredRate: 0,
        consistencyRate: 0,
        hasData: false,
      };

      // Check if user has any whatsapp numbers at all
      const { data: nums } = await supabase
        .from("whatsapp_numbers")
        .select("id")
        .eq("user_id", user!.id)
        .limit(1);
      if (!nums || nums.length === 0) return emptyResult;

      // Get conversations data for metrics
      const { data: convs, error: convErr } = await supabase
        .from("revenue_conversations")
        .select("avg_response_time_seconds, unreplied_inbound_count, last_inbound_at, last_outbound_at");
      if (convErr) throw convErr;

      const { data: leads, error: leadErr } = await supabase
        .from("revenue_leads")
        .select("status_bucket, risk_state, last_activity_at");
      if (leadErr) throw leadErr;

      const allConvs = (convs || []) as unknown as RevenueConversation[];
      const allLeads = (leads || []) as unknown as RevenueLead[];

      // Only consider leads with real interactions (score > 0)
      const interactedLeads = allLeads.filter((l) => l.score_total > 0);

      // If no real interaction data exists, return zeros
      if (interactedLeads.length === 0 && allConvs.length === 0) return emptyResult;

      // 1. Avg response time (30% weight) - target < 5 min (300s)
      const avgResponseTimes = allConvs
        .filter((c) => c.avg_response_time_seconds > 0)
        .map((c) => c.avg_response_time_seconds);
      const avgResponseTime = avgResponseTimes.length > 0
        ? avgResponseTimes.reduce((a, b) => a + b, 0) / avgResponseTimes.length
        : 0;
      const responseScore = avgResponseTimes.length === 0 ? 0 : Math.max(0, Math.min(100, 100 - (avgResponseTime - 300) / 30));

      // 2. % hot leads responded (40% weight)
      const hotLeads = interactedLeads.filter((l) => l.status_bucket === "HOT" || l.status_bucket === "VERY_HOT");
      const hotResponded = hotLeads.filter((l) => l.risk_state === "OK").length;
      const hotResponseRate = hotLeads.length > 0 ? (hotResponded / hotLeads.length) * 100 : 0;

      // 3. % ignored leads (20% weight)
      const totalUnreplied = allConvs.reduce((sum, c) => sum + c.unreplied_inbound_count, 0);
      const totalConvs = allConvs.length || 1;
      const ignoredRate = Math.min(100, (totalUnreplied / totalConvs) * 100);
      const ignoredScore = allConvs.length === 0 ? 0 : Math.max(0, 100 - ignoredRate * 2);

      // 4. Activity consistency (10% weight) - only count leads with real interactions
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const activeLeads = interactedLeads.filter((l) => new Date(l.last_activity_at) >= sevenDaysAgo).length;
      const consistencyScore = interactedLeads.length > 0 ? Math.min(100, (activeLeads / interactedLeads.length) * 100) : 0;

      const performanceScore = Math.round(
        responseScore * 0.3 +
        hotResponseRate * 0.4 +
        ignoredScore * 0.2 +
        consistencyScore * 0.1
      );

      return {
        performanceScore: Math.max(0, Math.min(100, performanceScore)),
        avgResponseTimeMinutes: Math.round(avgResponseTime / 60),
        hotResponseRate: Math.round(hotResponseRate),
        ignoredRate: Math.round(ignoredRate),
        consistencyRate: Math.round(consistencyScore),
        hasData: true,
      };
    },
    enabled: !!user,
  });
};

// === BOTTLENECK METRICS (7d) ===
export interface BottleneckMetrics {
  hotIgnoredPct: number;
  aboveSLAPct: number;
  avgFirstResponseMin: number;
  cooledLeads: number;
  objectionLeads: number;
  // Trend vs previous 7d
  hotIgnoredTrend: number;
  aboveSLATrend: number;
  avgFirstResponseTrend: number;
  cooledLeadsTrend: number;
}

export const useRevenueBottlenecks = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["revenue-bottlenecks", user?.id],
    queryFn: async () => {
      const now = new Date();
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const fourteenDaysAgo = new Date(now);
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      // Get all leads
      const { data: leads } = await supabase
        .from("revenue_leads")
        .select("status_bucket, risk_state, last_activity_at, score_total");
      const all = (leads || []) as unknown as RevenueLead[];

      // Get conversations
      const { data: convs } = await supabase
        .from("revenue_conversations")
        .select("avg_response_time_seconds, unreplied_inbound_count, last_inbound_at, last_outbound_at");
      const allConvs = (convs || []) as unknown as RevenueConversation[];

      // Get events for objection detection (current 7d)
      const { data: objEvents } = await supabase
        .from("revenue_events")
        .select("event_type, created_at")
        .in("event_type", ["INTENT_OBJECTION", "INTENT_NEGATIVE"])
        .gte("created_at", sevenDaysAgo.toISOString());

      // Current period metrics
      const hotLeads = all.filter((l) => l.status_bucket === "HOT" || l.status_bucket === "VERY_HOT");
      const hotIgnored = hotLeads.filter((l) => l.risk_state !== "OK").length;
      const hotIgnoredPct = hotLeads.length > 0 ? Math.round((hotIgnored / hotLeads.length) * 100) : 0;

      const responseTimesMs = allConvs
        .filter((c) => c.avg_response_time_seconds > 0)
        .map((c) => c.avg_response_time_seconds);
      const avgFirstResponseMin = responseTimesMs.length > 0
        ? Math.round(responseTimesMs.reduce((a, b) => a + b, 0) / responseTimesMs.length / 60)
        : 0;

      const totalUnreplied = allConvs.reduce((sum, c) => sum + c.unreplied_inbound_count, 0);
      const aboveSLAPct = allConvs.length > 0 ? Math.round((totalUnreplied / allConvs.length) * 100) : 0;

      const cooledLeads = all.filter((l) => l.risk_state === "COOLING" || l.risk_state === "AT_RISK").length;
      const objectionLeads = (objEvents || []).length;

      // Simple trends (placeholder - would need historical snapshots for accurate trends)
      return {
        hotIgnoredPct,
        aboveSLAPct,
        avgFirstResponseMin,
        cooledLeads,
        objectionLeads,
        hotIgnoredTrend: 0,
        aboveSLATrend: 0,
        avgFirstResponseTrend: 0,
        cooledLeadsTrend: 0,
      } as BottleneckMetrics;
    },
    enabled: !!user,
  });
};

// === MATURITY INDEX (0-100) ===
export interface MaturityIndex {
  total: number;
  responsiveness: number; // 30%
  hotUtilization: number; // 30%
  consistency: number;    // 20%
  riskReduction: number;  // 20%
}

export const useRevenueMaturityIndex = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["revenue-maturity-index", user?.id],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: leads } = await supabase
        .from("revenue_leads")
        .select("status_bucket, risk_state, last_activity_at");
      const all = (leads || []) as unknown as RevenueLead[];

      const { data: convs } = await supabase
        .from("revenue_conversations")
        .select("avg_response_time_seconds, unreplied_inbound_count");
      const allConvs = (convs || []) as unknown as RevenueConversation[];

      // Only consider leads with real interactions (score > 0)
      const interacted = all.filter((l) => l.score_total > 0);

      if (interacted.length === 0) {
        return { total: 0, responsiveness: 0, hotUtilization: 0, consistency: 0, riskReduction: 0 } as MaturityIndex;
      }

      // 1. Responsiveness (SLA) - 30%
      const responseTimesMs = allConvs.filter((c) => c.avg_response_time_seconds > 0).map((c) => c.avg_response_time_seconds);
      const avgResponse = responseTimesMs.length > 0 ? responseTimesMs.reduce((a, b) => a + b, 0) / responseTimesMs.length : 0;
      const responsiveness = responseTimesMs.length === 0 ? 0 : Math.max(0, Math.min(100, 100 - (avgResponse - 300) / 30));

      // 2. Hot utilization - 30%
      const hotLeads = interacted.filter((l) => l.status_bucket === "HOT" || l.status_bucket === "VERY_HOT");
      const hotOk = hotLeads.filter((l) => l.risk_state === "OK").length;
      const hotUtilization = hotLeads.length > 0 ? (hotOk / hotLeads.length) * 100 : 0;

      // 3. Consistency (7d activity) - 20% - only leads with real interactions
      const activeLeads = interacted.filter((l) => new Date(l.last_activity_at) >= sevenDaysAgo).length;
      const consistency = Math.min(100, (activeLeads / interacted.length) * 100);

      // 4. Risk reduction - 20%
      const atRiskLeads = interacted.filter((l) => l.risk_state !== "OK").length;
      const riskReduction = Math.max(0, 100 - (atRiskLeads / interacted.length) * 100);

      const total = Math.round(
        responsiveness * 0.30 +
        hotUtilization * 0.30 +
        consistency * 0.20 +
        riskReduction * 0.20
      );

      return {
        total: Math.max(0, Math.min(100, total)),
        responsiveness: Math.round(responsiveness),
        hotUtilization: Math.round(hotUtilization),
        consistency: Math.round(consistency),
        riskReduction: Math.round(riskReduction),
      } as MaturityIndex;
    },
    enabled: !!user,
  });
};

// === REVENUE ALERTS ===
export interface RevenueAlert {
  id: string;
  alert_type: string;
  alert_message: string;
  alert_severity: string;
  metric_name: string;
  current_value: number;
  previous_value: number;
  variation_pct: number;
  is_read: boolean;
  created_at: string;
}

export const useRevenueAlerts = (limit: number = 10) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["revenue-alerts", user?.id, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("revenue_alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data || []) as unknown as RevenueAlert[];
    },
    enabled: !!user,
  });
};

export const useRevenueOpportunityIndex = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["revenue-opportunity-index", user?.id],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: leads, error } = await supabase
        .from("revenue_leads")
        .select("status_bucket, risk_state, last_activity_at")
        .gte("last_activity_at", sevenDaysAgo.toISOString());

      if (error) throw error;
      const all = (leads || []) as unknown as RevenueLead[];

      const hotLeads = all.filter((l) => l.status_bucket === "HOT" || l.status_bucket === "VERY_HOT");
      const respondedInSLA = hotLeads.filter((l) => l.risk_state === "OK").length;
      const notResponded = hotLeads.filter((l) => l.risk_state !== "OK").length;

      const index = hotLeads.length > 0
        ? Math.round((respondedInSLA / hotLeads.length) * 100)
        : 0;

      return {
        index,
        totalHot: hotLeads.length,
        respondedInSLA,
        notResponded,
      };
    },
    enabled: !!user,
  });
};

// === ACTION ITEMS (leads needing immediate action) ===
export interface ActionItem {
  id: string;
  name: string | null;
  phone_e164: string;
  score_total: number;
  status_bucket: string;
  risk_state: string;
  risk_reason: string | null;
  last_activity_at: string;
  reason: string;
  urgency: "critical" | "high";
}

export const useRevenueActionItems = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["revenue-action-items", user?.id],
    queryFn: async () => {
      const { data: leads, error } = await supabase
        .from("revenue_leads")
        .select("id, name, phone_e164, score_total, status_bucket, risk_state, risk_reason, last_activity_at, estimated_ticket_value");
      if (error) throw error;

      const all = (leads || []) as unknown as RevenueLead[];
      const now = Date.now();
      const items: ActionItem[] = [];

      for (const lead of all) {
        const hoursInactive = (now - new Date(lead.last_activity_at).getTime()) / 3600000;

        // VERY_HOT with risk
        if (lead.status_bucket === "VERY_HOT" && lead.risk_state !== "OK") {
          items.push({
            ...lead,
            reason: "Lead quente em risco — responder agora",
            urgency: "critical",
          });
          continue;
        }

        // HOT with risk (SLA busted)
        if (lead.status_bucket === "HOT" && lead.risk_state === "AT_RISK") {
          items.push({
            ...lead,
            reason: "Lead engajado com SLA estourado",
            urgency: "critical",
          });
          continue;
        }

        // High score inactive > 24h
        if (lead.score_total >= 350 && hoursInactive > 24) {
          items.push({
            ...lead,
            reason: `Inativo há ${Math.round(hoursInactive)}h — score alto`,
            urgency: "high",
          });
          continue;
        }

        // COOLING leads with decent score
        if (lead.risk_state === "COOLING" && lead.score_total >= 200) {
          items.push({
            ...lead,
            reason: "Esfriando — reengajar antes que perca",
            urgency: "high",
          });
        }
      }

      // Sort: critical first, then by score
      items.sort((a, b) => {
        if (a.urgency !== b.urgency) return a.urgency === "critical" ? -1 : 1;
        return b.score_total - a.score_total;
      });

      return items.slice(0, 8);
    },
    enabled: !!user,
  });
};

// === RECEITA EM RISCO (detailed) ===
export const useRevenueAtRisk = () => {
  const { user } = useAuth();
  const { data: settings } = useRevenueSettings();

  return useQuery({
    queryKey: ["revenue-at-risk", user?.id, settings?.default_ticket_value],
    queryFn: async () => {
      const ticket = settings?.default_ticket_value || 3000;
      const rates = {
        COLD: settings?.default_close_rate_cold || 0.05,
        ENGAGED: settings?.default_close_rate_engaged || 0.15,
        HOT: settings?.default_close_rate_hot || 0.35,
        VERY_HOT: settings?.default_close_rate_very_hot || 0.55,
      };

      const { data: leads, error } = await supabase
        .from("revenue_leads")
        .select("id, status_bucket, risk_state, estimated_ticket_value, score_total");
      if (error) throw error;

      const all = (leads || []) as unknown as RevenueLead[];
      const atRisk = all.filter(
        (l) => (l.status_bucket === "HOT" || l.status_bucket === "VERY_HOT") && l.risk_state !== "OK"
      );

      const value = atRisk.reduce((sum, l) => {
        const rate = rates[l.status_bucket as keyof typeof rates] || 0;
        return sum + (l.estimated_ticket_value || ticket) * rate;
      }, 0);

      const hotTotal = all.filter(l => l.status_bucket === "HOT" || l.status_bucket === "VERY_HOT").length;

      return {
        value,
        count: atRisk.length,
        hotTotal,
        hasData: all.length > 0,
      };
    },
    enabled: !!user && !!settings,
  });
};

// === 7-DAY TRENDS (from snapshots) ===
export interface RevenueTrend {
  hotLeadsDelta: number | null;
  avgResponseDelta: number | null;
  revenueExpectedDelta: number | null;
  hasSufficientData: boolean;
}

export const useRevenueTrend7d = () => {
  const { user } = useAuth();
  const { data: settings } = useRevenueSettings();

  return useQuery({
    queryKey: ["revenue-trend-7d", user?.id],
    queryFn: async () => {
      const now = new Date();
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const fourteenDaysAgo = new Date(now);
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      const { data: snapshots, error } = await supabase
        .from("revenue_score_snapshots")
        .select("snapshot_date, status_bucket, score_value")
        .gte("snapshot_date", fourteenDaysAgo.toISOString().split("T")[0])
        .order("snapshot_date", { ascending: true });

      if (error) throw error;

      const all = (snapshots || []) as any[];
      if (all.length < 7) {
        return { hotLeadsDelta: null, avgResponseDelta: null, revenueExpectedDelta: null, hasSufficientData: false } as RevenueTrend;
      }

      const sevenStr = sevenDaysAgo.toISOString().split("T")[0];

      const current = all.filter(s => s.snapshot_date >= sevenStr);
      const previous = all.filter(s => s.snapshot_date < sevenStr);

      const countHot = (arr: any[]) => arr.filter(s => s.status_bucket === "HOT" || s.status_bucket === "VERY_HOT").length;

      const currentHot = countHot(current);
      const previousHot = countHot(previous);

      const hotDelta = previousHot > 0 ? Math.round(((currentHot - previousHot) / previousHot) * 100) : null;

      const ticket = settings?.default_ticket_value || 3000;
      const rates: Record<string, number> = {
        COLD: settings?.default_close_rate_cold || 0.05,
        ENGAGED: settings?.default_close_rate_engaged || 0.15,
        HOT: settings?.default_close_rate_hot || 0.35,
        VERY_HOT: settings?.default_close_rate_very_hot || 0.55,
      };

      const calcRevenue = (arr: any[]) => arr.reduce((sum: number, s: any) => sum + ticket * (rates[s.status_bucket] || 0), 0);
      const currentRev = calcRevenue(current);
      const previousRev = calcRevenue(previous);
      const revDelta = previousRev > 0 ? Math.round(((currentRev - previousRev) / previousRev) * 100) : null;

      return {
        hotLeadsDelta: hotDelta,
        avgResponseDelta: null, // Would need conversation snapshots
        revenueExpectedDelta: revDelta,
        hasSufficientData: previous.length >= 3,
      } as RevenueTrend;
    },
    enabled: !!user,
  });
};

// === FUNNEL PROGRESSION RATE ===
export const useRevenueFunnelProgression = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["revenue-funnel-progression", user?.id],
    queryFn: async () => {
      // Get score logs to track bucket transitions
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: logs, error } = await supabase
        .from("revenue_score_logs")
        .select("lead_id, score_before, score_after, created_at")
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: true });

      if (error) throw error;

      const all = (logs || []) as unknown as RevenueScoreLog[];

      // Count transitions
      const scoreToBucket = (s: number): string => {
        if (s >= 650) return "VERY_HOT";
        if (s >= 350) return "HOT";
        if (s >= 150) return "ENGAGED";
        return "COLD";
      };

      let engagedToHot = 0;
      let totalEngaged = 0;
      let coldToEngaged = 0;
      let totalCold = 0;

      for (const log of all) {
        const before = scoreToBucket(log.score_before);
        const after = scoreToBucket(log.score_after);

        if (before === "ENGAGED" && (after === "HOT" || after === "VERY_HOT")) {
          engagedToHot++;
        }
        if (before === "ENGAGED") totalEngaged++;
        if (before === "COLD" && (after === "ENGAGED" || after === "HOT" || after === "VERY_HOT")) {
          coldToEngaged++;
        }
        if (before === "COLD") totalCold++;
      }

      const engagedToHotRate = totalEngaged >= 5 ? Math.round((engagedToHot / totalEngaged) * 100) : null;
      const coldToEngagedRate = totalCold >= 5 ? Math.round((coldToEngaged / totalCold) * 100) : null;

      return {
        engagedToHotRate,
        coldToEngagedRate,
        hasSufficientData: totalEngaged >= 5 || totalCold >= 5,
      };
    },
    enabled: !!user,
  });
};
