import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CanvasState } from "@/components/equipe-ia/canvas/EquipeCanvas";
import type { EquipeNodeKind } from "@/components/equipe-ia/nodeTypes";

export interface Equipe {
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

const TABLE = "ai_workforce" as const; // DB tables remain ai_workforce*
const CANVAS_TABLE = "ai_workforce_canvas" as const;

export function useEquipeList() {
  return useQuery({
    queryKey: ["equipe-ia", "list"],
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLE as never)
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Equipe[];
    },
  });
}

export function useEquipe(id: string | undefined) {
  return useQuery({
    queryKey: ["equipe-ia", id],
    enabled: !!id,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLE as never)
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as Equipe | null;
    },
  });
}

export function useEquipeCanvas(equipeId: string | undefined) {
  return useQuery({
    queryKey: ["equipe-ia", equipeId, "canvas"],
    enabled: !!equipeId,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
    queryFn: async (): Promise<CanvasState> => {
      const { data, error } = await supabase
        .from(CANVAS_TABLE as never)
        .select("nodes,edges")
        .eq("workforce_id", equipeId!)
        .maybeSingle();
      if (error) throw error;
      const row = data as { nodes?: unknown; edges?: unknown } | null;
      const nodes = Array.isArray(row?.nodes) ? (row!.nodes as CanvasState["nodes"]) : [];
      const edges = Array.isArray(row?.edges) ? (row!.edges as CanvasState["edges"]) : [];
      if (nodes.length === 0) {
        return {
          nodes: [
            {
              id: "core",
              type: "equipe",
              position: { x: 600, y: 280 },
              data: {
                kind: "core" as EquipeNodeKind,
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

export function useCreateEquipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; role?: string; description?: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Não autenticado");
      const { data, error } = await supabase
        .from(TABLE as never)
        .insert({
          user_id: uid,
          name: input.name,
          role: input.role,
          description: input.description,
        } as never)
        .select("*")
        .single();
      if (error) throw error;
      return data as unknown as Equipe;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["equipe-ia", "list"] }),
  });
}

export function useSaveCanvas() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { equipeId: string; state: CanvasState }) => {
      await supabase
        .from(CANVAS_TABLE as never)
        .delete()
        .eq("workforce_id", input.equipeId);
      const { error } = await supabase.from(CANVAS_TABLE as never).insert({
        workforce_id: input.equipeId,
        nodes: input.state.nodes,
        edges: input.state.edges,
      } as never);
      if (error) throw error;
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: ["equipe-ia", v.equipeId, "canvas"] }),
  });
}

export function useDeleteEquipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLE as never).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["equipe-ia", "list"] }),
  });
}
