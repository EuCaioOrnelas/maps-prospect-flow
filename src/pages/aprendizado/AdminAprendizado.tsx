import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowUp, ExternalLink, GraduationCap, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { AprendaEmpty, AprendaLoading } from "@/components/aprendizado/AprendaFeedback";
import { ConfirmDeleteDialog } from "@/components/aprendizado/admin/ConfirmDeleteDialog";
import { ModuleFormDialog } from "@/components/aprendizado/admin/ModuleFormDialog";
import { ModuleLessonsPanel } from "@/components/aprendizado/admin/ModuleLessonsPanel";
import { useAdminLearning } from "@/hooks/aprendizado/useAdminLearning";
import { deleteModule, moveModule, updateModule } from "@/services/aprendizado/learningService";
import { deleteLearningImage } from "@/services/aprendizado/learningMedia";
import { lessonCountLabel } from "@/services/aprendizado/format";
import { cn } from "@/lib/utils";
import type { LearningModuleWithLessons } from "@/types/aprendizado";

export default function AdminAprendizado() {
  const { modules, loading, error, reload, selectedId, setSelectedId, selectedModule } = useAdminLearning();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LearningModuleWithLessons | null>(null);
  const [deleting, setDeleting] = useState<LearningModuleWithLessons | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (work: () => Promise<void>, success?: string) => {
    setBusy(true);
    try {
      await work();
      if (success) toast.success(success);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nao foi possivel concluir a acao.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <GraduationCap className="h-6 w-6 text-primary" />
            Gerenciar Aprendizado
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Crie modulos e aulas em video para a central publica Domine a Wiize. Visitantes veem apenas o que estiver
            publicado, sem precisar de login.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild className="gap-2">
            <Link to="/aprenda" target="_blank" rel="noopener noreferrer">
              <ExternalLink size={15} />
              Ver central
            </Link>
          </Button>
          <Button
            className="gap-2"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus size={15} />
            Novo modulo
          </Button>
        </div>
      </header>

      {loading ? (
        <AprendaLoading label="Carregando conteudo..." />
      ) : error ? (
        <AprendaEmpty
          title="Nao foi possivel carregar os modulos"
          description={error}
          actionLabel="Tentar novamente"
          onAction={() => void reload()}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <section className="rounded-lg border border-border bg-card p-4 sm:p-5 lg:col-span-2">
            <h2 className="font-semibold">Modulos</h2>
            <p className="text-xs text-muted-foreground">Selecione um modulo para gerenciar as aulas.</p>

            {modules.length === 0 ? (
              <div className="mt-6">
                <AprendaEmpty
                  title="Nenhum modulo criado"
                  description="Comece criando o primeiro modulo de tutoriais da central."
                />
              </div>
            ) : (
              <ul className="mt-4 space-y-2">
                {modules.map((module, index) => (
                  <li
                    key={module.id}
                    className={cn(
                      "cursor-pointer rounded-lg border p-3 transition-colors",
                      module.id === selectedId ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
                    )}
                    onClick={() => setSelectedId(module.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{module.title}</p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {lessonCountLabel(module.lessons.length)} · /{module.slug}
                        </p>
                      </div>
                      <Badge variant={module.is_published ? "default" : "secondary"} className="shrink-0 text-[10px]">
                        {module.is_published ? "Publicado" : "Rascunho"}
                      </Badge>
                    </div>
                    <div className="mt-3 flex items-center gap-1" onClick={(event) => event.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label="Mover modulo para cima"
                        disabled={busy || index === 0}
                        onClick={() => void run(() => moveModule(modules, module.id, -1))}
                      >
                        <ArrowUp size={15} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label="Mover modulo para baixo"
                        disabled={busy || index === modules.length - 1}
                        onClick={() => void run(() => moveModule(modules, module.id, 1))}
                      >
                        <ArrowDown size={15} />
                      </Button>
                      <Switch
                        checked={module.is_published}
                        disabled={busy}
                        aria-label={`Publicar modulo ${module.title}`}
                        onCheckedChange={(checked) =>
                          void run(
                            () => updateModule(module.id, { is_published: checked }),
                            checked ? "Modulo publicado" : "Modulo despublicado",
                          )
                        }
                      />
                      <span className="flex-1" />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label={`Editar modulo ${module.title}`}
                        onClick={() => {
                          setEditing(module);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil size={15} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        aria-label={`Excluir modulo ${module.title}`}
                        onClick={() => setDeleting(module)}
                      >
                        <Trash2 size={15} />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="lg:col-span-3">
            {selectedModule ? (
              <ModuleLessonsPanel key={selectedModule.id} module={selectedModule} onChanged={() => void reload()} />
            ) : (
              <AprendaEmpty
                title="Selecione um modulo"
                description="Escolha um modulo na lista ao lado para cadastrar e ordenar as aulas."
              />
            )}
          </div>
        </div>
      )}

      <ModuleFormDialog
        open={formOpen}
        module={editing}
        nextOrder={modules.length}
        onOpenChange={setFormOpen}
        onSaved={() => void reload()}
      />
      <ConfirmDeleteDialog
        open={Boolean(deleting)}
        title="Excluir este modulo?"
        description="Todas as aulas do modulo tambem serao excluidas. Essa acao nao pode ser desfeita."
        confirmLabel="Excluir modulo"
        loading={busy}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        onConfirm={() => {
          const module = deleting;
          if (!module) return;
          void run(async () => {
            await deleteModule(module.id);
            await Promise.all(
              [module.cover_path, ...module.lessons.map((lesson) => lesson.thumbnail_path)].map((path) =>
                deleteLearningImage(path).catch(() => {}),
              ),
            );
            setDeleting(null);
          }, "Modulo excluido");
        }}
      />
    </div>
  );
}
