import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LearningImage } from "./LearningImage";
import { lessonCountLabel } from "@/services/aprendizado/format";
import type { LearningModuleWithLessons } from "@/types/aprendizado";

export function ModuleCard({ module }: { module: LearningModuleWithLessons }) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-md">
      <LearningImage path={module.cover_path} alt={`Capa do modulo ${module.title}`} className="aspect-video w-full" />
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-semibold leading-snug">{module.title}</h3>
        {module.description && (
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed line-clamp-3">{module.description}</p>
        )}
        <div className="mt-5 flex items-center justify-between gap-3 pt-1">
          <span className="text-xs font-medium text-muted-foreground">{lessonCountLabel(module.lessons.length)}</span>
          <Button asChild size="sm" className="gap-1.5">
            <Link to={`/aprenda/${module.slug}`}>
              Acessar modulo
              <ArrowRight size={15} />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
