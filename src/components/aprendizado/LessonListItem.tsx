import { Link } from "react-router-dom";
import { Clock, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LearningImage } from "./LearningImage";
import { formatLessonDuration } from "@/services/aprendizado/format";
import type { LearningLesson } from "@/types/aprendizado";

interface LessonListItemProps {
  lesson: LearningLesson;
  moduleSlug: string;
  index: number;
}

export function LessonListItem({ lesson, moduleSlug, index }: LessonListItemProps) {
  const duration = formatLessonDuration(lesson.duration_seconds);

  return (
    <article className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center">
      <div className="relative w-full shrink-0 sm:w-44">
        <LearningImage path={lesson.thumbnail_path} alt={`Aula ${lesson.title}`} className="aspect-video w-full rounded-md" />
        <span className="absolute left-2 top-2 rounded-md bg-background/90 px-2 py-0.5 text-xs font-semibold text-foreground">
          {index + 1}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-primary">Aula {index + 1}</span>
          {duration && (
            <span className="inline-flex items-center gap-1">
              <Clock size={12} />
              {duration}
            </span>
          )}
        </div>
        <h3 className="mt-1.5 font-semibold leading-snug">{lesson.title}</h3>
        {lesson.description && <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">{lesson.description}</p>}
      </div>
      <Button asChild size="sm" className="gap-1.5 self-start sm:self-center">
        <Link to={`/aprenda/${moduleSlug}/${lesson.slug}`}>
          <Play size={14} />
          Assistir
        </Link>
      </Button>
    </article>
  );
}
