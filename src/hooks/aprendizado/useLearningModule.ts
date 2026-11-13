import { useCallback, useEffect, useState } from "react";
import { getPublishedModule } from "@/services/aprendizado/learningService";
import type { LearningModuleWithLessons } from "@/types/aprendizado";

export function useLearningModule(slug: string | undefined) {
  const [module, setModule] = useState<LearningModuleWithLessons | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!slug) {
      setModule(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setModule(await getPublishedModule(slug));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel carregar o modulo.");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { module, loading, error, reload };
}
