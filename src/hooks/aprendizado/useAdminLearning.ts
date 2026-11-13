import { useCallback, useEffect, useState } from "react";
import { adminListModules } from "@/services/aprendizado/learningService";
import type { LearningModuleWithLessons } from "@/types/aprendizado";

/** Lista completa (publicados e rascunhos) para o painel Gerenciar Aprendizado. */
export function useAdminLearning() {
  const [modules, setModules] = useState<LearningModuleWithLessons[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setError(null);
    try {
      const data = await adminListModules();
      setModules(data);
      setSelectedId((current) =>
        current && data.some((item) => item.id === current) ? current : (data[0]?.id ?? null),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel carregar o conteudo.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const selectedModule = modules.find((item) => item.id === selectedId) ?? null;

  return { modules, loading, error, reload, selectedId, setSelectedId, selectedModule };
}
