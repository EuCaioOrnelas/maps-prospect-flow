import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { History, RotateCcw, Trash2, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Version {
  id: string;
  name: string;
  notes: string | null;
  nodes: unknown;
  edges: unknown;
  created_at: string;
}

interface Props { workforceId: string }

export function WorkforceVersions({ workforceId }: Props) {
  const qc = useQueryClient();

  const versionsQ = useQuery({
    queryKey: ["equipe-ia", workforceId, "versions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_workforce_versions" as never)
        .select("id,name,notes,nodes,edges,created_at")
        .eq("workforce_id", workforceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Version[];
    },
  });

  const restore = useMutation({
    mutationFn: async (v: Version) => {
      await supabase.from("ai_workforce_canvas" as never).delete().eq("workforce_id", workforceId);
      const { error } = await supabase.from("ai_workforce_canvas" as never).insert({
        workforce_id: workforceId,
        nodes: v.nodes,
        edges: v.edges,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Versão restaurada. Recarregando…");
      qc.invalidateQueries({ queryKey: ["equipe-ia", workforceId, "canvas"] });
      setTimeout(() => window.location.reload(), 600);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao restaurar"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ai_workforce_versions" as never).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["equipe-ia", workforceId, "versions"] });
      toast.success("Versão excluída.");
    },
  });

  const versions = versionsQ.data ?? [];

  return (
    <div className="h-full overflow-y-auto p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-primary/15 ring-1 ring-primary/20 flex items-center justify-center text-primary">
          <History className="size-5" />
        </div>
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Histórico de versões</h2>
          <p className="text-sm text-muted-foreground">
            Cada vez que você salva, uma versão nomeada é criada. Você pode restaurar a qualquer momento.
          </p>
        </div>
      </div>

      {versionsQ.isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : versions.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhuma versão salva ainda. Use o botão <span className="font-semibold text-foreground">Salvar</span> no canvas para criar a primeira.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {versions.map((v) => (
            <li key={v.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{v.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {formatDistanceToNow(new Date(v.created_at), { addSuffix: true, locale: ptBR })}
                  {v.notes ? ` · ${v.notes}` : ""}
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={restore.isPending}>
                    <RotateCcw className="size-3.5 mr-1.5" /> Restaurar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Restaurar esta versão?</AlertDialogTitle>
                    <AlertDialogDescription>
                      O canvas atual será substituído por <span className="font-semibold text-foreground">{v.name}</span>. Salve uma nova versão antes se quiser preservar o estado atual.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => restore.mutate(v)}>Restaurar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button
                variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive"
                onClick={() => remove.mutate(v.id)}
                disabled={remove.isPending}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
