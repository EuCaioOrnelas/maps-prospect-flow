import { useState } from "react";
import { ArrowDown, ArrowUp, Clock, Pencil, Plus, Trash2, Video } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ConfirmDeleteDialog } from "./ConfirmDeleteDialog";
import { LessonFormDialog } from "./LessonFormDialog";
import { deleteLesson, moveLesson, updateLesson } from "@/services/aprendizado/learningService";
import { deleteLearningImage } from "@/services/aprendizado/learningMedia";
import { formatLessonDuration, lessonCountLabel } from "@/services/aprendizado/format";
import type { LearningLesson, LearningModuleWithLessons } from "@/types/aprendizado";

interface ModuleLessonsPanelProps {
  module: LearningModuleWithLessons;
  onChanged: () => void;
}

export function ModuleLessonsPanel({ module, onChanged }: ModuleLessonsPanelProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LearningLesson | null>(null);
  const [deleting, setDeleting] = useState<LearningLesson | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (work: () => Promise<void>, success?: string) => {
    setBusy(true);
    try {
      await work();
      if (success) toast.success(success);
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel concluir a acao.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-lg border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Aulas de {module.title}</h2>
          <p className="text-xs text-muted-foreground">
            {lessonCountLabel(module.lessons.length)} · /aprenda/{module.slug}
          </p>
        </div>
        <Button
          size="sm"
          className="gap-2"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus size={15} />
          Nova aula
        </Button>
      </div>

      {module.lessons.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-lg border border-dashed border-border px-4 py-10 text-center">
          <Video className="h-7 w-7 text-muted-foreground/60" />
          <p className="mt-3 text-sm font-medium">Nenhuma aula cadastrada</p>
          <p className="mt-1 text-xs text-muted-foreground">Adicione a primeira aula com um link do YouTube.</p>
        </div>
      ) : (
        <ul className="mt-5 space-y-2">
          {module.lessons.map((lesson, index) => {
            const duration = formatLessonDuration(lesson.duration_seconds);
            return (
              <li key={lesson.id} className="rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{lesson.title}</span>
                  <Badge variant={lesson.is_published ? "default" : "secondary"} className="text-[10px]">
                    {lesson.is_published ? "Publicada" : "Rascunho"}
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="mr-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock size={12} />
                    {duration ?? "Sem duracao"}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label="Mover aula para cima"
                      disabled={busy || index === 0}
                      onClick={() => void run(() => moveLesson(module.lessons, lesson.id, -1))}
                    >
                      <ArrowUp size={15} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label="Mover aula para baixo"
                      disabled={busy || index === module.lessons.length - 1}
                      onClick={() => void run(() => moveLesson(module.lessons, lesson.id, 1))}
                    >
                      <ArrowDown size={15} />
                    </Button>
                  </div>
                  <Switch
                    checked={lesson.is_published}
                    disabled={busy}
                    aria-label={`Publicar aula ${lesson.title}`}
                    onCheckedChange={(checked) =>
                      void run(
                        () => updateLesson(lesson.id, { is_published: checked }),
                        checked ? "Aula publicada" : "Aula despublicada",
                      )
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label={`Editar aula ${lesson.title}`}
                    onClick={() => {
                      setEditing(lesson);
                      setFormOpen(true);
                    }}
                  >
                    <Pencil size={15} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    aria-label={`Excluir aula ${lesson.title}`}
                    onClick={() => setDeleting(lesson)}
                  >
                    <Trash2 size={15} />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <LessonFormDialog
        open={formOpen}
        moduleId={module.id}
        lesson={editing}
        nextOrder={module.lessons.length}
        onOpenChange={setFormOpen}
        onSaved={onChanged}
      />
      <ConfirmDeleteDialog
        open={Boolean(deleting)}
        title="Excluir esta aula?"
        description="A aula sai da central imediatamente. Essa acao nao pode ser desfeita."
        confirmLabel="Excluir aula"
        loading={busy}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        onConfirm={() => {
          const lesson = deleting;
          if (!lesson) return;
          void run(async () => {
            await deleteLesson(lesson.id);
            await deleteLearningImage(lesson.thumbnail_path).catch(() => {});
            setDeleting(null);
          }, "Aula excluida");
        }}
      />
    </section>
  );
}
