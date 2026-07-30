/**
 * Constantes e helpers compartilhados das métricas do Admin.
 */

/**
 * Reembolsos anteriores a esta data são ignorados em TODAS as métricas do admin
 * (histórico antigo — junho/2026 para trás foi limpo das métricas).
 */
export const REFUND_METRICS_SINCE = new Date("2026-07-01T00:00:00Z");

/**
 * Data em que o NOVO onboarding entrou no ar. Somente usuários que
 * responderam ou pularam o novo onboarding entram no cálculo de ativação.
 */
export const NEW_ONBOARDING_SINCE = new Date("2026-04-24T16:00:00Z");

/** Linhas sintéticas do backfill antigo (não representam onboarding real). */
const BACKFILL_ROLE = "Usuário ativo";

export type OnboardingRow = {
  user_id: string;
  skipped: boolean | null;
  completed_at: string | null;
  created_at: string;
  role: string | null;
};

/** Considera apenas quem realmente passou pelo novo onboarding (respondeu ou pulou). */
export function isNewOnboarding(row: OnboardingRow): boolean {
  if (row.role === BACKFILL_ROLE) return false;
  if (!row.completed_at && !row.skipped) return false;
  const ref = new Date(row.completed_at || row.created_at);
  return ref >= NEW_ONBOARDING_SINCE;
}

/** Um reembolso só conta nas métricas se ocorreu a partir do cutoff. */
export function isRefundCountable(date: string | Date): boolean {
  return new Date(date) >= REFUND_METRICS_SINCE;
}

/** month = "YYYY-MM" — true se o mês é >= mês do cutoff. */
export function isRefundMonthCountable(month: string): boolean {
  const cutoff = `${REFUND_METRICS_SINCE.getUTCFullYear()}-${String(
    REFUND_METRICS_SINCE.getUTCMonth() + 1
  ).padStart(2, "0")}`;
  return month >= cutoff;
}

/**
 * Trial "de verdade": usuário iniciou trial E já saiu dele
 * (fim do trial no passado, cobrança já disparada, ou virou pagante).
 */
export function hasCompletedTrial(p: {
  plan: string | null;
  trial_start_at: string | null;
  trial_end_at?: string | null;
  trial_will_charge_at?: string | null;
}): boolean {
  if (!p.trial_start_at) return false;
  const now = Date.now();
  const stillInTrial =
    (p.trial_end_at && new Date(p.trial_end_at).getTime() > now) ||
    (p.trial_will_charge_at && new Date(p.trial_will_charge_at).getTime() > now);
  if (stillInTrial) return false;
  return true;
}

/** Converteu = passou pelo trial e hoje tem plano pago. */
export function hasConvertedFromTrial(p: {
  plan: string | null;
  trial_start_at: string | null;
  trial_end_at?: string | null;
  trial_will_charge_at?: string | null;
}): boolean {
  return hasCompletedTrial(p) && !!p.plan && p.plan !== "free";
}
