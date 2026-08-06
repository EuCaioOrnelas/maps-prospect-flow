import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Cache do ESTADO dos indicadores (vazio x com dados) — nunca dos valores.
 *
 * Objetivo: ao abrir a plataforma (em qualquer navegador/PC) o card já assume
 * o estado correto enquanto a query real carrega, evitando a sequência
 * "vazio → carregando → valor".
 *
 * Camadas:
 *  1. localStorage  → leitura síncrona, instantânea no mesmo dispositivo.
 *  2. user_metric_state (backend) → sincroniza o estado entre dispositivos.
 */

type MetricStateMap = Record<string, boolean>;

interface MetricStateCacheValue {
  /** true = tinha dados, false = estava vazio, undefined = desconhecido. */
  getCached: (key?: string) => boolean | undefined;
  /** Registra o estado real após o fetch (persiste local + backend se mudou). */
  report: (key: string | undefined, hasData: boolean) => void;
}

const MetricStateCacheContext = createContext<MetricStateCacheValue>({
  getCached: () => undefined,
  report: () => {},
});

const storageKey = (userId: string) => `wiize:metric-state:${userId}`;

function readLocal(userId: string): MetricStateMap {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    return raw ? (JSON.parse(raw) as MetricStateMap) : {};
  } catch {
    return {};
  }
}

function writeLocal(userId: string, map: MetricStateMap) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(map));
  } catch {
    /* quota/privacidade — cache é apenas otimização */
  }
}

export function MetricStateCacheProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [map, setMap] = useState<MetricStateMap>({});
  const mapRef = useRef<MetricStateMap>({});
  const pending = useRef<Map<string, boolean>>(new Map());
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1. Hidratação síncrona a partir do localStorage
  useEffect(() => {
    if (!userId) {
      mapRef.current = {};
      setMap({});
      return;
    }
    const local = readLocal(userId);
    mapRef.current = local;
    setMap(local);
  }, [userId]);

  // 2. Sincronização com o backend (cross-device)
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from("user_metric_state")
        .select("metric_key, has_data")
        .eq("user_id", userId);

      if (cancelled || error || !data) return;

      const remote: MetricStateMap = {};
      data.forEach((row: { metric_key: string; has_data: boolean }) => {
        remote[row.metric_key] = row.has_data;
      });

      // remoto complementa o local (local é mais recente nesta sessão)
      const merged = { ...remote, ...mapRef.current };
      mapRef.current = merged;
      setMap(merged);
      writeLocal(userId, merged);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const flush = useCallback(async () => {
    flushTimer.current = null;
    if (!userId || pending.current.size === 0) return;

    const rows = Array.from(pending.current.entries()).map(([metric_key, has_data]) => ({
      user_id: userId,
      metric_key,
      has_data,
      updated_at: new Date().toISOString(),
    }));
    pending.current.clear();

    await supabase
      .from("user_metric_state")
      .upsert(rows, { onConflict: "user_id,metric_key" });
  }, [userId]);

  const report = useCallback(
    (key: string | undefined, hasData: boolean) => {
      if (!key || !userId) return;
      if (mapRef.current[key] === hasData) return;

      const next = { ...mapRef.current, [key]: hasData };
      mapRef.current = next;
      setMap(next);
      writeLocal(userId, next);

      pending.current.set(key, hasData);
      if (!flushTimer.current) {
        flushTimer.current = setTimeout(() => void flush(), 1500);
      }
    },
    [userId, flush]
  );

  const getCached = useCallback(
    (key?: string) => (key ? map[key] : undefined),
    [map]
  );

  const value = useMemo(() => ({ getCached, report }), [getCached, report]);

  return (
    <MetricStateCacheContext.Provider value={value}>
      {children}
    </MetricStateCacheContext.Provider>
  );
}

export function useMetricStateCache() {
  return useContext(MetricStateCacheContext);
}
