import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type SdrAgentRow = {
  id: string;
  owner_user_id: string;
  name: string;
  status: string;
  objective: string;
  objective_custom: string | null;
  whatsapp_number_ids: string[];
  schedule: any;
  triggers: any;
  personality: any;
  strategy: any;
  knowledge: any;
  closing: any;
  situations: any;
  created_at: string;
  updated_at: string;
};

export type SdrSessionRow = {
  id: string;
  agent_id: string;
  status: string;
  stage: string;
  messages_sent: number;
  replies_received: number;
  followups_sent: number;
};

export function useSDRAgents() {
  const { accountOwnerId } = useAuth();
  const qc = useQueryClient();

  const agents = useQuery({
    queryKey: ["sdr_agents", accountOwnerId],
    enabled: !!accountOwnerId,
    queryFn: async (): Promise<SdrAgentRow[]> => {
      const { data, error } = await supabase
        .from("sdr_agents" as any)
        .select("*")
        .eq("owner_user_id", accountOwnerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as SdrAgentRow[];
    },
  });

  const sessions = useQuery({
    queryKey: ["sdr_sessions", accountOwnerId],
    enabled: !!accountOwnerId,
    queryFn: async (): Promise<SdrSessionRow[]> => {
      const { data, error } = await supabase
        .from("sdr_sessions" as any)
        .select("id,agent_id,status,stage,messages_sent,replies_received,followups_sent")
        .eq("owner_user_id", accountOwnerId);
      if (error) throw error;
      return (data ?? []) as unknown as SdrSessionRow[];
    },
  });

  const rows = sessions.data ?? [];
  const total = rows.length;
  const inAttendance = rows.filter((s) => s.status === "active").length;
  const inFollowUp = rows.filter((s) => s.status === "follow_up").length;
  const won = rows.filter((s) => s.status === "won").length;
  const abandoned = rows.filter((s) => s.status === "abandoned").length;
  const answered = rows.filter((s) => (s.replies_received ?? 0) > 0).length;

  const analytics = {
    total,
    inAttendance,
    inFollowUp,
    conversionRate: total ? (won / total) * 100 : 0,
    replyRate: total ? (answered / total) * 100 : 0,
    abandonRate: total ? (abandoned / total) * 100 : 0,
    messagesSent: rows.reduce((a, s) => a + (s.messages_sent ?? 0), 0),
  };

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["sdr_agents"] });
    qc.invalidateQueries({ queryKey: ["sdr_sessions"] });
  };

  return {
    agents: agents.data ?? [],
    loading: agents.isLoading,
    sessions: rows,
    analytics,
    refresh,
  };
}
