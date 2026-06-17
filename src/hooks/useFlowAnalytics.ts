import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type NodeStats = {
  variants: Record<string, { picked: number; success: number; rate: number; share: number }>;
  total: number;
};

export type FlowStats = Record<string, NodeStats>;

/**
 * Aggregates execution data per A/B test and Random Split node.
 * - For A/B test: chosen variant is stored in collected_data["__ab_<nodeId>"].
 *   Success = execution.status === 'completed' (chat did NOT abort/encerrar).
 * - For Random Split: chosen output stored in collected_data["__rs_<nodeId>"].
 */
export function useFlowAnalytics(flowId: string | undefined) {
  return useQuery<FlowStats>({
    queryKey: ["wa-flow-analytics", flowId],
    enabled: !!flowId,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wa_flow_executions")
        .select("status, collected_data")
        .eq("flow_id", flowId!)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;

      const stats: FlowStats = {};
      const ensure = (nodeId: string) => {
        if (!stats[nodeId]) stats[nodeId] = { variants: {}, total: 0 };
        return stats[nodeId];
      };
      const ensureVar = (s: NodeStats, vid: string) => {
        if (!s.variants[vid]) s.variants[vid] = { picked: 0, success: 0, rate: 0, share: 0 };
        return s.variants[vid];
      };

      for (const exec of data || []) {
        const cd = (exec.collected_data || {}) as Record<string, any>;
        const succeeded = exec.status === "completed";
        for (const [k, v] of Object.entries(cd)) {
          let nodeId = "";
          if (k.startsWith("__ab_")) nodeId = k.slice(5);
          else if (k.startsWith("__rs_")) nodeId = k.slice(5);
          else continue;
          const vid = String(v);
          const s = ensure(nodeId);
          const vs = ensureVar(s, vid);
          vs.picked += 1;
          if (succeeded) vs.success += 1;
          s.total += 1;
        }
      }

      for (const s of Object.values(stats)) {
        for (const vs of Object.values(s.variants)) {
          vs.rate = vs.picked > 0 ? (vs.success / vs.picked) * 100 : 0;
          vs.share = s.total > 0 ? (vs.picked / s.total) * 100 : 0;
        }
      }
      return stats;
    },
  });
}
