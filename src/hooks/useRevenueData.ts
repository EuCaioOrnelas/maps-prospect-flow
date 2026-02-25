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

      // If no data exists, return zeros
      if (allLeads.length === 0 && allConvs.length === 0) return emptyResult;

      // 1. Avg response time (30% weight) - target < 5 min (300s)
      const avgResponseTimes = allConvs
        .filter((c) => c.avg_response_time_seconds > 0)
        .map((c) => c.avg_response_time_seconds);
      const avgResponseTime = avgResponseTimes.length > 0
        ? avgResponseTimes.reduce((a, b) => a + b, 0) / avgResponseTimes.length
        : 0;
      const responseScore = avgResponseTimes.length === 0 ? 0 : Math.max(0, Math.min(100, 100 - (avgResponseTime - 300) / 30));

      // 2. % hot leads responded (40% weight)
      const hotLeads = allLeads.filter((l) => l.status_bucket === "HOT" || l.status_bucket === "VERY_HOT");
      const hotResponded = hotLeads.filter((l) => l.risk_state === "OK").length;
      const hotResponseRate = hotLeads.length > 0 ? (hotResponded / hotLeads.length) * 100 : 0;

      // 3. % ignored leads (20% weight)
      const totalUnreplied = allConvs.reduce((sum, c) => sum + c.unreplied_inbound_count, 0);
      const totalConvs = allConvs.length || 1;
      const ignoredRate = Math.min(100, (totalUnreplied / totalConvs) * 100);
      const ignoredScore = allConvs.length === 0 ? 0 : Math.max(0, 100 - ignoredRate * 2);

      // 4. Activity consistency (10% weight)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const activeLeads = allLeads.filter((l) => new Date(l.last_activity_at) >= sevenDaysAgo).length;
      const consistencyScore = allLeads.length > 0 ? Math.min(100, (activeLeads / allLeads.length) * 100) : 0;

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
