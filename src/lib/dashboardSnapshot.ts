/**
 * Cache de snapshots de dashboards.
 *
 * Objetivo: evitar que os indicadores "pisquem"/recarreguem toda vez que o
 * usuário sai e volta para a página, e que atualizações periódicas em segundo
 * plano provoquem re-render quando os valores não mudaram.
 *
 * - Guarda em memória (instantâneo) e em sessionStorage (sobrevive ao reload).
 * - `hasChanged` compara o payload serializado para decidir se vale atualizar.
 */

const memory = new Map<string, unknown>();
const STORAGE_PREFIX = "wiize:dash-snap:";

export function getSnapshot<T>(key: string): T | null {
  if (memory.has(key)) return memory.get(key) as T;
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as T;
    memory.set(key, parsed);
    return parsed;
  } catch {
    return null;
  }
}

export function setSnapshot<T>(key: string, value: T): void {
  memory.set(key, value);
  try {
    sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch {
    /* quota / modo privado — cache em memória continua valendo */
  }
}

/** Retorna true se o novo valor for diferente do snapshot atual. */
export function hasChanged<T>(key: string, next: T): boolean {
  const current = memory.has(key) ? memory.get(key) : getSnapshot<T>(key);
  if (current === undefined || current === null) return true;
  try {
    return JSON.stringify(current) !== JSON.stringify(next);
  } catch {
    return true;
  }
}

/**
 * Grava o snapshot apenas se houve mudança real.
 * Retorna true quando o consumidor deve atualizar o estado.
 */
export function commitSnapshot<T>(key: string, next: T): boolean {
  if (!hasChanged(key, next)) return false;
  setSnapshot(key, next);
  return true;
}

/** True quando a aba está visível — usamos para pausar refresh em background. */
export function isTabVisible(): boolean {
  return typeof document === "undefined" || document.visibilityState !== "hidden";
}
