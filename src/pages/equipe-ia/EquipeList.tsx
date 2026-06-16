import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, Plus, Trash2 } from "lucide-react";
import { useEquipeList, useDeleteEquipe } from "@/hooks/useEquipeIA";
import { toast } from "sonner";
import { EquipePageLayout } from "@/components/equipe-ia/EquipePageLayout";
import { CreateEquipeDialog } from "@/components/equipe-ia/CreateEquipeDialog";
import { getProviderByModel } from "@/lib/aiProviders";

export default function EquipeList() {
  const { data: workers = [], isLoading } = useEquipeList();
  const del = useDeleteEquipe();
  const [createOpen, setCreateOpen] = useState(false);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Excluir "${name}"? Esta ação não pode ser desfeita.`)) return;
    try { await del.mutateAsync(id); toast.success("Colaborador excluído."); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erro ao excluir"); }
  }

  return (
    <EquipePageLayout>
      <div className="flex items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-primary/15 ring-1 ring-primary/20 flex items-center justify-center text-primary shrink-0">
            <Bot className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight leading-tight">Colaboradores Digitais</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Gerencie sua força de trabalho de IA.</p>
          </div>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4 mr-2" /> Novo colaborador
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
            <Button className="mt-4" onClick={() => setCreateOpen(true)}>Criar o primeiro</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workers.map((w) => {
            const s = (w.status ?? "").toLowerCase();
            const st =
              s === "active"
                ? { label: "Ativo", cls: "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20" }
                : s === "draft" || s === "rascunho"
                ? { label: "Rascunho", cls: "bg-amber-500/10 text-amber-600 ring-amber-500/20" }
                : { label: "Inativo", cls: "bg-muted text-muted-foreground ring-border" };
            const providerInfo = getProviderByModel(w.model);
            return (
              <Card
                key={w.id}
                className="group relative hover:border-primary/60 hover:shadow-md transition-all"
              >
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/15 ring-1 ring-primary/20 flex items-center justify-center text-primary shrink-0">
                      <Bot className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate leading-tight">{w.name}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{w.role || "Sem função"}</p>
                    </div>
                    <button
                      onClick={() => handleDelete(w.id, w.name)}
                      className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                      title="Excluir"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-4">
                    <div className="flex items-center gap-2 min-w-0">
                      {providerInfo ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/60 ring-1 ring-border px-2 py-1 rounded-md">
                          <img src={providerInfo.logo} alt={providerInfo.name} className="size-3.5 object-contain" />
                          {providerInfo.shortName}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/60 ring-1 ring-border px-2 py-1 rounded-md">
                          IA não configurada
                        </span>
                      )}
                    </div>
                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-md ring-1 ${st.cls}`}>
                      <span className="size-1.5 rounded-full bg-current" />
                      {st.label}
                    </span>
                  </div>
                </CardContent>
                <Link to={`/equipe-ia/colaboradores/${w.id}`} className="absolute inset-0" aria-label="Abrir colaborador" />
              </Card>
            );
          })}
        </div>
      )}

      <CreateEquipeDialog open={createOpen} onOpenChange={setCreateOpen} />
    </EquipePageLayout>
  );
}
