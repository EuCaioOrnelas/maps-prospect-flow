/**
 * Preferência de geração automática de abordagem com IA.
 * Marcada no card de busca (Dashboard) e consumida na Gestão de Oportunidades,
 * logo após a etapa de diagnóstico/qualificação dos leads.
 */
export type AutoApproachPrefs = {
  manual: boolean; // mensagem para envio manual (1º contato)
  meta: boolean; // mensagem para campanhas Meta (follow-up após template)
};

const STORAGE_KEY = "wiize:auto-approach-prefs";

export const EMPTY_AUTO_APPROACH: AutoApproachPrefs = { manual: false, meta: false };

export function saveAutoApproachPrefs(prefs: AutoApproachPrefs) {
  try {
    if (!prefs.manual && !prefs.meta) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* storage indisponível — a busca segue normalmente */
  }
}

export function readAutoApproachPrefs(): AutoApproachPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY_AUTO_APPROACH };
    const parsed = JSON.parse(raw);
    return { manual: !!parsed?.manual, meta: !!parsed?.meta };
  } catch {
    return { ...EMPTY_AUTO_APPROACH };
  }
}

export function clearAutoApproachPrefs() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
}
