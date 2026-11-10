import { useCallback, useEffect, useState } from "react";
import { listPublishedModules } from "@/services/aprendizado/learningService";
import type { LearningModuleWithLessons } from "@/types/aprendizado";

export function useLearningModules() {
  const [modules, setModules] = useState<LearningModuleWithLessons[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setModules(await listPublishedModules());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel carregar os modulos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { modules, loading, error, reload };
}
