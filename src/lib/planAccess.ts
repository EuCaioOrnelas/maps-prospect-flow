/**
 * Plan access & grandfathering rules.
 *
 * Em 2026-05-18 o plano "start" foi renomeado para "Atendimento" e perdeu
 * o módulo de SDR IA (Captação / Diagnóstico / Geração de mensagens por IA).
 * O plano "growth" virou "Growth IA".
 *
 * Usuários CRIADOS ANTES dessa data mantêm o acesso original ("Start" com
 * tudo incluso). Usuários novos no plano "start" passam a ser "Atendimento"
 * (sem SDR IA).
 *
 * Importante: a CHAVE no banco continua sendo "start" / "growth" — mudamos
 * apenas o rótulo e o conjunto de features liberadas para novos.
 */

export const NEW_PLAN_CUTOFF = "2026-05-18T00:00:00Z";

type ProfileLike = {
  plan?: string | null;
  created_at?: string | null;
} | null | undefined;

/**
 * Usuário é "legado" (mantém regras antigas) se foi criado antes do cutoff.
 * Quando não temos created_at, assumimos legado (não bloquear por engano).
 */
export function isLegacyPlanUser(profile: ProfileLike): boolean {
  if (!profile) return true;
  if (!profile.created_at) return true;
  return new Date(profile.created_at).getTime() < new Date(NEW_PLAN_CUTOFF).getTime();
}

/**
 * Tem acesso ao SDR IA (Captação / Diagnóstico / Geração de mensagem com IA)?
 * - Legados em qualquer plano pago → sim
 * - Novos no plano "start" (Atendimento) → NÃO
 * - Novos em "growth" / "scale" / "free" (trial) → sim
 */
export function hasSDRAccess(profile: ProfileLike): boolean {
  if (!profile) return true;
  if (isLegacyPlanUser(profile)) return true;
  const plan = (profile.plan || "").toLowerCase();
  return plan !== "start";
}

/**
 * Rótulo correto do plano levando em conta grandfathering.
 * Legados em "start" → "Start". Novos em "start" → "Atendimento".
 * Legados/novos em "growth" → "Growth IA" (rebranding puro).
 */
export function getPlanDisplayName(profile: ProfileLike): string {
  if (!profile?.plan) return "—";
  const plan = profile.plan.toLowerCase();
  if (plan === "start") return isLegacyPlanUser(profile) ? "Start" : "Atendimento";
  if (plan === "growth") return "Growth IA";
  if (plan === "scale") return "Enterprise";
  if (plan === "free") return "Free";
  return profile.plan;
}
