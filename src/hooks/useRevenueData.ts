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

export const useRevenueDashboardStats = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["revenue-dashboard-stats", user?.id],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: leads, error } = await supabase
        .from("revenue_leads")
        .select("id, status_bucket, score_total, risk_state, last_activity_at, estimated_ticket_value");

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

      // Top opportunities: highest score + at risk
      const topOpportunities = [...all]
        .sort((a, b) => {
          if (a.risk_state !== "OK" && b.risk_state === "OK") return -1;
          if (a.risk_state === "OK" && b.risk_state !== "OK") return 1;
          return b.score_total - a.score_total;
        })
        .slice(0, 10);

      return {
        totalLeads: all.length,
        active7d,
        hotCount,
        atRiskCount,
        topOpportunities,
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
