import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, Plus, Trash2 } from "lucide-react";
import { useEquipeList, useDeleteEquipe } from "@/hooks/useEquipeIA";
import { toast } from "sonner";
import { EquipePageLayout } from "@/components/equipe-ia/EquipePageLayout";

export default function EquipeList() {
  const { data: workers = [], isLoading } = useEquipeList();
  const del = useDeleteEquipe();

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Excluir "${name}"? Esta ação não pode ser desfeita.`)) return;
    try { await del.mutateAsync(id); toast.success("Colaborador excluído."); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erro ao excluir"); }
  }

  return (
    <EquipePageLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Colaboradores Digitais</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie sua força de trabalho de IA.</p>
        </div>
        <Button asChild>
          <Link to="/equipe-ia/novo"><Plus className="size-4 mr-2" /> Novo</Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : workers.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <Bot className="size-10 mx-auto text-muted-foreground/50" />
            <p className="mt-3 font-medium">Sem colaboradores</p>
            <Button asChild className="mt-4"><Link to="/equipe-ia/novo">Criar o primeiro</Link></Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workers.map((w) => (
            <Card key={w.id} className="hover:border-primary/60 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <Link to={`/equipe-ia/colaboradores/${w.id}`} className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="rounded-lg bg-primary/10 p-2 text-primary"><Bot className="size-5" /></div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{w.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{w.role || "—"}</p>
                    </div>
                  </Link>
                  <button onClick={() => handleDelete(w.id, w.name)} className="text-muted-foreground hover:text-destructive ml-2 p-1" title="Excluir">
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <p className="text-sm text-muted-foreground mt-3 line-clamp-2 min-h-[40px]">
                  {w.description || "Sem descrição."}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </EquipePageLayout>
  );
}
