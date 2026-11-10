import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLearningImage } from "@/hooks/aprendizado/useLearningImage";

interface LearningImageProps {
  path: string | null | undefined;
  alt: string;
  className?: string;
}

/** Capa ou thumbnail da central, carregada sob demanda do armazenamento privado. */
export function LearningImage({ path, alt, className }: LearningImageProps) {
  const url = useLearningImage(path);

  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      {url ? (
        <img src={url} alt={alt} loading="lazy" decoding="async" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-muted-foreground/60">
          <GraduationCap className="h-8 w-8" aria-hidden />
        </div>
      )}
    </div>
  );
}
