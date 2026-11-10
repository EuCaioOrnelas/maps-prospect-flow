import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { AprendaLayout } from "@/components/aprendizado/AprendaLayout";
import { YouTubePlayer } from "@/components/aprendizado/YouTubePlayer";
import { AprendaEmpty, AprendaLoading } from "@/components/aprendizado/AprendaFeedback";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLearningModule } from "@/hooks/aprendizado/useLearningModule";
import { formatLessonDuration } from "@/services/aprendizado/format";

export default function AprendaLesson() {
  const { moduleSlug, lessonSlug } = useParams<{ moduleSlug: string; lessonSlug: string }>();
  const navigate = useNavigate();
  const { module, loading, error, reload } = useLearningModule(moduleSlug);

  const lessons = module?.lessons ?? [];
  const index = lessons.findIndex((lesson) => lesson.slug === lessonSlug);
  const lesson = index >= 0 ? lessons[index] : null;
  const previous = index > 0 ? lessons[index - 1] : null;
  const next = index >= 0 && index < lessons.length - 1 ? lessons[index + 1] : null;
  const duration = formatLessonDuration(lesson?.duration_seconds);

  return (
    <AprendaLayout
      title={lesson ? `${lesson.title} - ${module?.title ?? "Domine a Wiize"}` : "Aula - Domine a Wiize"}
      description={lesson?.description || "Assista as aulas da central de aprendizado Domine a Wiize."}
    >
      <Button
        variant="ghost"
        asChild
        className="mb-8 gap-2 px-0 text-sm text-muted-foreground hover:text-foreground"
      >
        <Link to={`/aprenda/${moduleSlug}`}>
          <ArrowLeft size={16} />
          Voltar ao modulo
        </Link>
      </Button>

      {loading ? (
        <AprendaLoading label="Carregando aula..." />
      ) : error ? (
        <AprendaEmpty
          title="Nao foi possivel carregar a aula"
          description="Verifique sua conexao e tente novamente."
          actionLabel="Tentar novamente"
          onAction={() => void reload()}
        />
      ) : !module || !lesson ? (
        <AprendaEmpty
          title="Aula nao encontrada"
          description="Esta aula nao existe, foi removida ou ainda nao foi publicada."
          actionLabel="Voltar para a central"
          onAction={() => navigate("/aprenda")}
        />
      ) : (
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            <YouTubePlayer videoId={lesson.youtube_video_id} title={lesson.title} />

            <header className="mt-6">
              <Link to={`/aprenda/${module.slug}`} className="text-sm font-medium text-primary hover:underline">
                {module.title}
              </Link>
              <h1 className="mt-2 font-display text-2xl font-bold sm:text-3xl">{lesson.title}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span>
                  Aula {index + 1} de {lessons.length}
                </span>
                {duration && (
                  <span className="inline-flex items-center gap-1.5">
                    <Clock size={14} />
                    {duration}
                  </span>
                )}
              </div>
            </header>

            {lesson.description && (
              <p className="mt-5 whitespace-pre-line leading-relaxed text-muted-foreground">{lesson.description}</p>
            )}

            <nav className="mt-10 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:justify-between">
              {previous ? (
                <Button variant="outline" asChild className="gap-2">
                  <Link to={`/aprenda/${module.slug}/${previous.slug}`}>
                    <ArrowLeft size={16} />
                    Aula anterior
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" disabled className="gap-2">
                  <ArrowLeft size={16} />
                  Aula anterior
                </Button>
              )}
              {next ? (
                <Button asChild className="gap-2">
                  <Link to={`/aprenda/${module.slug}/${next.slug}`}>
                    Proxima aula
                    <ArrowRight size={16} />
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" asChild className="gap-2">
                  <Link to={`/aprenda/${module.slug}`}>
                    Concluir e voltar ao modulo
                    <ArrowRight size={16} />
                  </Link>
                </Button>
              )}
            </nav>
          </div>

          <aside className="min-w-0">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Aulas deste modulo</h2>
            <ol className="mt-4 space-y-2">
              {lessons.map((item, itemIndex) => {
                const itemDuration = formatLessonDuration(item.duration_seconds);
                const current = item.id === lesson.id;
                return (
                  <li key={item.id}>
                    <Link
                      to={`/aprenda/${module.slug}/${item.slug}`}
                      aria-current={current ? "page" : undefined}
                      className={cn(
                        "flex gap-3 rounded-lg border p-3 transition-colors",
                        current ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/50",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-semibold",
                          current ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                        )}
                      >
                        {itemIndex + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium leading-snug">{item.title}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {current ? "Assistindo agora" : (itemDuration ?? "")}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </aside>
        </div>
      )}
    </AprendaLayout>
  );
}
