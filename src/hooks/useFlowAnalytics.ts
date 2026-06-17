import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type VariantStats = {
  picked: number;
  share: number;
  responded: number;
  clicked: number;
  converted: number;
  handoff: number;
  // Taxas (%)
  response_rate: number;
  click_rate: number;
  conversion: number;
  handoff_rate: number;
};

export type NodeStats = {
  variants: Record<string, VariantStats>;
  total: number;
};

export type FlowStats = Record<string, NodeStats>;

/**
 * Agrega execuções para A/B test e Random Split.
 * Markers persistidos pelo runner em collected_data:
 *   __ab_<nodeId>            → variante escolhida
 *   __ab_<nodeId>_responded  → "1" se usuário respondeu após escolha
 *   __ab_<nodeId>_clicked    → "1" se usuário clicou em botão/list
 *   __ab_<nodeId>_converted  → "1" se execução chegou em end positivo
 *   __ab_<nodeId>_handoff    → "1" se foi para humano
 *   __rs_<nodeId>            → output escolhido (random split)
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
      const ensureVar = (s: NodeStats, vid: string): VariantStats => {
        if (!s.variants[vid]) {
          s.variants[vid] = {
            picked: 0, share: 0,
            responded: 0, clicked: 0, converted: 0, handoff: 0,
            response_rate: 0, click_rate: 0, conversion: 0, handoff_rate: 0,
          };
        }
        return s.variants[vid];
      };

      for (const exec of data || []) {
        const cd = (exec.collected_data || {}) as Record<string, any>;
        const completed = exec.status === "completed";
        for (const [k, v] of Object.entries(cd)) {
          let nodeId = "";
          let prefix: "ab" | "rs" | null = null;
          if (k.startsWith("__ab_") && !k.includes("_responded") && !k.endsWith("_clicked")
            && !k.endsWith("_converted") && !k.endsWith("_handoff") && !k.endsWith("_at")) {
            nodeId = k.slice(5); prefix = "ab";
          } else if (k.startsWith("__rs_")) {
            nodeId = k.slice(5); prefix = "rs";
          } else continue;

          const vid = String(v);
          const s = ensure(nodeId);
          const vs = ensureVar(s, vid);
          vs.picked += 1;
          s.total += 1;

          if (prefix === "ab") {
            if (cd[`__ab_${nodeId}_responded`] === "1") vs.responded += 1;
            if (cd[`__ab_${nodeId}_clicked`] === "1") vs.clicked += 1;
            if (cd[`__ab_${nodeId}_converted`] === "1" || completed) vs.converted += 1;
            if (cd[`__ab_${nodeId}_handoff`] === "1") vs.handoff += 1;
          } else {
            // Random split: usamos status da execução como proxy de "concluído".
            if (completed) vs.converted += 1;
          }
        }
      }

      for (const s of Object.values(stats)) {
        for (const vs of Object.values(s.variants)) {
          vs.share = s.total > 0 ? (vs.picked / s.total) * 100 : 0;
          if (vs.picked > 0) {
            vs.response_rate = (vs.responded / vs.picked) * 100;
            vs.click_rate = (vs.clicked / vs.picked) * 100;
            vs.conversion = (vs.converted / vs.picked) * 100;
            vs.handoff_rate = (vs.handoff / vs.picked) * 100;
          }
        }
      }
      return stats;
    },
  });
}
