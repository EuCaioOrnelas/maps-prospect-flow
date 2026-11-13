import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { AprendaLayout } from "@/components/aprendizado/AprendaLayout";
import { LessonListItem } from "@/components/aprendizado/LessonListItem";
import { AprendaEmpty, AprendaLoading } from "@/components/aprendizado/AprendaFeedback";
import { Button } from "@/components/ui/button";
import { useLearningModule } from "@/hooks/aprendizado/useLearningModule";
import { lessonCountLabel } from "@/services/aprendizado/format";

export default function AprendaModule() {
  const { moduleSlug } = useParams<{ moduleSlug: string }>();
  const navigate = useNavigate();
  const { module, loading, error, reload } = useLearningModule(moduleSlug);

  return (
    <AprendaLayout
      title={module ? `${module.title} - Domine a Wiize` : "Modulo - Domine a Wiize"}
      description={module?.description || "Tutoriais em video da central de aprendizado Domine a Wiize."}
    >
      <Button variant="ghost" asChild className="mb-8 gap-2 px-0 text-sm text-muted-foreground hover:text-foreground">
        <Link to="/aprenda">
          <ArrowLeft size={16} />
          Todos os modulos
        </Link>
      </Button>

      {loading ? (
        <AprendaLoading label="Carregando modulo..." />
      ) : error ? (
        <AprendaEmpty
          title="Nao foi possivel carregar o modulo"
          description="Verifique sua conexao e tente novamente."
          actionLabel="Tentar novamente"
          onAction={() => void reload()}
        />
      ) : !module ? (
        <AprendaEmpty
          title="Modulo nao encontrado"
          description="Este modulo nao existe ou ainda nao foi publicado."
          actionLabel="Ver todos os modulos"
          onAction={() => navigate("/aprenda")}
        />
      ) : (
        <>
          <header>
            <p className="text-xs font-medium uppercase tracking-wide text-primary sm:text-sm">
              {lessonCountLabel(module.lessons.length)}
            </p>
            <h1 className="mt-2 font-display text-2xl font-bold leading-tight sm:text-3xl">{module.title}</h1>
            {module.description && (
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                {module.description}
              </p>
            )}
          </header>

          <section className="mt-8">
            <h2 className="text-lg font-semibold">Aulas deste modulo</h2>
            {module.lessons.length === 0 ? (
              <div className="mt-6">
                <AprendaEmpty
                  title="Nenhuma aula publicada ainda"
                  description="As aulas deste modulo estao sendo preparadas e ficarao disponiveis em breve."
                />
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                {module.lessons.map((lesson, index) => (
                  <LessonListItem key={lesson.id} lesson={lesson} moduleSlug={module.slug} index={index} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </AprendaLayout>
  );
}
