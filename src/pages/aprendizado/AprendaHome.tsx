import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, GraduationCap, Play, Search } from "lucide-react";
import { AprendaLayout } from "@/components/aprendizado/AprendaLayout";
import { ModuleCard } from "@/components/aprendizado/ModuleCard";
import { AprendaEmpty, AprendaLoading } from "@/components/aprendizado/AprendaFeedback";
import { Input } from "@/components/ui/input";
import { useLearningModules } from "@/hooks/aprendizado/useLearningModules";
import { formatLessonDuration } from "@/services/aprendizado/format";

export default function AprendaHome() {
  const { modules, loading, error, reload } = useLearningModules();
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();

  const { visibleModules, lessonResults } = useMemo(() => {
    if (!normalized) return { visibleModules: modules, lessonResults: [] };
    const matches = (text: string | null | undefined) => (text ?? "").toLowerCase().includes(normalized);
    const results = modules.flatMap((module) =>
      module.lessons
        .filter((lesson) => matches(lesson.title) || matches(lesson.description))
        .map((lesson) => ({ lesson, module })),
    );
    const filtered = modules.filter(
      (module) =>
        matches(module.title) ||
        matches(module.description) ||
        module.lessons.some((lesson) => matches(lesson.title)),
    );
    return { visibleModules: filtered, lessonResults: results };
  }, [modules, normalized]);

  const nothingFound = normalized && visibleModules.length === 0 && lessonResults.length === 0;

  return (
    <AprendaLayout
      title="Domine a Wiize - Central de Aprendizado"
      description="Aprenda a utilizar todo o potencial da Wiize com tutoriais em video, sem precisar de cadastro."
    >
      <section className="mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-primary">
          <GraduationCap size={15} />
          Central de aprendizado
        </span>
        <h1 className="mt-5 font-display text-4xl font-bold sm:text-5xl">Domine a Wiize</h1>
        <p className="mt-4 text-base text-muted-foreground sm:text-lg">
          Aprenda a utilizar todo o potencial da Wiize.
        </p>
        <div className="relative mt-8">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar aulas ou modulos..."
            aria-label="Buscar aulas ou modulos"
            className="h-12 rounded-lg pl-11 pr-4"
          />
        </div>
      </section>

      {loading ? (
        <AprendaLoading label="Carregando modulos..." />
      ) : error ? (
        <div className="mt-12">
          <AprendaEmpty
            title="Nao foi possivel carregar os tutoriais"
            description="Verifique sua conexao e tente novamente."
            actionLabel="Tentar novamente"
            onAction={() => void reload()}
          />
        </div>
      ) : modules.length === 0 ? (
        <div className="mt-12">
          <AprendaEmpty
            title="Novos tutoriais em breve"
            description="Estamos preparando as primeiras aulas em video para voce dominar cada recurso da Wiize."
          />
        </div>
      ) : nothingFound ? (
        <div className="mt-12">
          <AprendaEmpty
            searching
            title="Nenhum resultado para essa busca"
            description="Tente outro termo, como o nome de uma funcionalidade da Wiize."
            actionLabel="Limpar busca"
            onAction={() => setQuery("")}
          />
        </div>
      ) : (
        <>
          {lessonResults.length > 0 && (
            <section className="mt-12">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Aulas encontradas</h2>
              <ul className="mt-4 space-y-2">
                {lessonResults.map(({ lesson, module }) => {
                  const duration = formatLessonDuration(lesson.duration_seconds);
                  return (
                    <li key={lesson.id}>
                      <Link
                        to={`/aprenda/${module.slug}/${lesson.slug}`}
                        className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/50"
                      >
                        <Play size={16} className="shrink-0 text-primary" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{lesson.title}</span>
                          <span className="block truncate text-xs text-muted-foreground">{module.title}</span>
                        </span>
                        {duration && (
                          <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                            <Clock size={12} />
                            {duration}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {visibleModules.length > 0 && (
            <section className="mt-12">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {visibleModules.map((module) => (
                  <ModuleCard key={module.id} module={module} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </AprendaLayout>
  );
}
