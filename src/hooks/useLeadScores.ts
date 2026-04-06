import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface LeadScoreData {
  phone_e164: string;
  score_total: number;
  status_bucket: string;
}

export function useLeadScores() {
  const { user } = useAuth();

  const { data: scoreMap = new Map<string, LeadScoreData>() } = useQuery({
    queryKey: ["lead-scores-map", user?.id],
    queryFn: async () => {
      if (!user) return new Map<string, LeadScoreData>();
      const { data, error } = await supabase
        .from("revenue_leads")
        .select("phone_e164, score_total, status_bucket")
        .eq("user_id", user.id);
      if (error) throw error;

      const map = new Map<string, LeadScoreData>();
      for (const row of data || []) {
        // Store by last 8 digits for flexible matching
        const key = row.phone_e164.replace(/\D/g, "").slice(-8);
        map.set(key, row as LeadScoreData);
      }
      return map;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const getScoreForPhone = (phone: string): LeadScoreData | undefined => {
    const key = phone.replace(/\D/g, "").slice(-8);
    return scoreMap.get(key);
  };

  return { scoreMap, getScoreForPhone };
}
