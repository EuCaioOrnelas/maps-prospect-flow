/**
 * Plan access & grandfathering rules.
 *
 * Em 2026-05-18 o plano "start" foi renomeado para "Atendimento" e perdeu
 * o módulo de SDR IA (Captação / Diagnóstico / Geração de mensagens por IA)
 * e os Agentes IA. O plano "growth" virou "Growth IA".
 *
 * Usuários CRIADOS ANTES dessa data mantêm o acesso original ("Start" com
 * tudo incluso). Usuários novos no plano "start" passam a ser "Atendimento"
 * (sem SDR IA / Agentes / Oportunidades).
 *
 * Importante: a CHAVE no banco continua sendo "start" / "growth" — mudamos
 * apenas o rótulo e o conjunto de features liberadas para novos.
 */

import type { FeatureKey } from "@/lib/featurePermissions";

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
 */
export function hasSDRAccess(profile: ProfileLike): boolean {
  if (!profile) return true;
  if (isLegacyPlanUser(profile)) return true;
  const plan = (profile.plan || "").toLowerCase();
  return plan !== "start";
}

/**
 * Acesso ao módulo de Oportunidades (busca + gestão).
 * Mesma regra do SDR — novo Atendimento (start) não tem acesso.
 */
export function hasOpportunitiesAccess(profile: ProfileLike): boolean {
  return hasSDRAccess(profile);
}

/**
 * Acesso ao módulo de Agentes IA.
 * Novo Atendimento (start) não tem; legados e demais planos têm.
 */
export function hasAIAgentsAccess(profile: ProfileLike): boolean {
  return hasSDRAccess(profile);
}

/**
 * Limite TOTAL de contatos no CRM, baseado no plano.
 * - novo Atendimento (start) → 1.000
 * - Growth → 10.000
 * - Enterprise (scale) / legados / free / trial → Infinity (sem limite)
 */
export function getContactLimit(profile: ProfileLike): number {
  if (!profile) return Infinity;
  if (isLegacyPlanUser(profile)) return Infinity;
  const plan = (profile.plan || "").toLowerCase();
  if (plan === "start") return 1000;
  if (plan === "growth") return 10000;
  return Infinity;
}

/**
 * Bloqueios de feature por plano (não substitui featurePermissions de
 * assinaturas customizadas — é uma camada paralela). Retorna `false` se
 * o plano do usuário não pode acessar a feature.
 */
const NEW_START_BLOCKED: FeatureKey[] = ["oportunidades", "agents", "warming"];

export function planHasFeature(profile: ProfileLike, key: FeatureKey): boolean {
  if (!profile) return true;
  if (isLegacyPlanUser(profile)) return true;
  const plan = (profile.plan || "").toLowerCase();
  if (plan !== "start") return true;
  return !NEW_START_BLOCKED.includes(key);
}

/**
 * Rótulo correto do plano levando em conta grandfathering.
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
