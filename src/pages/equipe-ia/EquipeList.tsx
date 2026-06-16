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
      <div className="flex items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-primary/15 ring-1 ring-primary/20 flex items-center justify-center text-primary shrink-0">
            <Bot className="size-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">Colaboradores Digitais</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Gerencie sua força de trabalho de IA.</p>
          </div>
        </div>
        <Button asChild>
          <Link to="/equipe-ia/novo"><Plus className="size-4 mr-2" /> Novo colaborador</Link>
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
            <Card
              key={w.id}
              className="group relative hover:border-primary/60 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              <Link
                to={`/equipe-ia/colaboradores/${w.id}`}
                className="absolute inset-0 z-0"
                aria-label={`Abrir ${w.name}`}
              />
              <CardContent className="p-5 relative z-10 pointer-events-none">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{w.name}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{w.role || "Sem função"}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 pointer-events-auto">
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(w.id, w.name); }}
                      className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                      title="Excluir"
                    >
                      <Trash2 className="size-4" />
                    </button>
                    <div className="w-10 h-10 rounded-xl bg-primary/15 ring-1 ring-primary/20 flex items-center justify-center text-primary">
                      <Bot className="size-5" />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <span className={`size-1.5 rounded-full ${w.status === "active" ? "bg-primary" : "bg-muted-foreground/40"}`} />
                    <span className="capitalize">{w.status ?? "—"}</span>
                  </span>
                  {w.channel && (<><span className="text-border">•</span><span className="truncate">{w.channel}</span></>)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </EquipePageLayout>
  );
}
