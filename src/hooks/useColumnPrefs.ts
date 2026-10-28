import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface Prefs { order: string[]; hidden: string[] }

/**
 * Ordem e visibilidade das colunas de uma tabela, salvas por usuário neste navegador.
 * Colunas novas aparecem no fim; colunas que deixaram de existir são ignoradas.
 */
export function useColumnPrefs(tableKey: string, allKeys: string[], locked: string[] = []) {
  const { user } = useAuth();
  const storageKey = `wiize:cols:${tableKey}:${user?.id ?? "anon"}`;
  const read = useCallback((): Prefs => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) return JSON.parse(raw) as Prefs;
    } catch { /* ignora */ }
    return { order: allKeys, hidden: [] };
  }, [storageKey, allKeys]);

  const [prefs, setPrefs] = useState<Prefs>(read);
  useEffect(() => setPrefs(read()), [read]);

  const save = (next: Prefs) => {
    setPrefs(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* ignora */ }
  };

  const order = useMemo(() => {
    const known = prefs.order.filter((k) => allKeys.includes(k));
    return [...known, ...allKeys.filter((k) => !known.includes(k))];
  }, [prefs.order, allKeys]);

  const visible = order.filter((k) => locked.includes(k) || !prefs.hidden.includes(k));

  const move = (key: string, dir: -1 | 1) => {
    const i = order.indexOf(key);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    save({ ...prefs, order: next });
  };

  const toggle = (key: string) => {
    if (locked.includes(key)) return;
    const hidden = prefs.hidden.includes(key) ? prefs.hidden.filter((k) => k !== key) : [...prefs.hidden, key];
    save({ ...prefs, hidden });
  };

  const reset = () => save({ order: allKeys, hidden: [] });

  return { order, visible, hidden: prefs.hidden, move, toggle, reset, locked };
}
