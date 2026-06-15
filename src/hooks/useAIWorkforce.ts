import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CanvasState } from "@/components/ai-workforce/canvas/WorkforceCanvas";
import type { WorkforceNodeKind } from "@/components/ai-workforce/nodeTypes";

export interface Workforce {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  role: string | null;
  persona: string | null;
  model: string;
  temperature: number;
  channel: string;
  language: string;
  status: string;
  avatar_url: string | null;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export function useWorkforceList() {
  return useQuery({
    queryKey: ["ai-workforce", "list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_workforce" as never)
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Workforce[];
    },
  });
}

export function useWorkforce(id: string | undefined) {
  return useQuery({
    queryKey: ["ai-workforce", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_workforce" as never)
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as Workforce | null;
    },
  });
}

export function useWorkforceCanvas(workforceId: string | undefined) {
  return useQuery({
    queryKey: ["ai-workforce", workforceId, "canvas"],
    enabled: !!workforceId,
    queryFn: async (): Promise<CanvasState> => {
      const { data, error } = await supabase
        .from("ai_workforce_canvas" as never)
        .select("nodes,edges")
        .eq("workforce_id", workforceId!)
        .maybeSingle();
      if (error) throw error;
      const row = data as { nodes?: unknown; edges?: unknown } | null;
      const nodes = Array.isArray(row?.nodes) ? (row!.nodes as CanvasState["nodes"]) : [];
      const edges = Array.isArray(row?.edges) ? (row!.edges as CanvasState["edges"]) : [];
      if (nodes.length === 0) {
        // bootstrap with Core node
        return {
          nodes: [
            {
              id: "core",
              type: "workforce",
              position: { x: 600, y: 280 },
              data: {
                kind: "core" as WorkforceNodeKind,
                title: "Núcleo do Colaborador",
                summary: "Defina identidade, persona e modelo de IA.",
              },
            },
          ],
          edges: [],
        };
      }
      return { nodes, edges };
    },
  });
}

export function useCreateWorkforce() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; role?: string; description?: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Não autenticado");
      const { data, error } = await supabase
        .from("ai_workforce" as never)
        .insert({
          user_id: uid,
          name: input.name,
          role: input.role,
          description: input.description,
        } as never)
        .select("*")
        .single();
      if (error) throw error;
      return data as unknown as Workforce;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-workforce", "list"] }),
  });
}

export function useSaveCanvas() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { workforceId: string; state: CanvasState }) => {
      await supabase
        .from("ai_workforce_canvas" as never)
        .delete()
        .eq("workforce_id", input.workforceId);
      const { error } = await supabase.from("ai_workforce_canvas" as never).insert({
        workforce_id: input.workforceId,
        nodes: input.state.nodes,
        edges: input.state.edges,
      } as never);
      if (error) throw error;
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: ["ai-workforce", v.workforceId, "canvas"] }),
  });
}

export function useDeleteWorkforce() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ai_workforce" as never).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-workforce", "list"] }),
  });
}
