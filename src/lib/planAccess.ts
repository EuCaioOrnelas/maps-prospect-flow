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

/**
 * Segundo corte (v3) — 2026-09-03.
 * A partir dele:
 *  - Growth IA: R$ 396/mês, 1.000 oportunidades, 2 números, 3 assentos (dono + 2)
 *  - Atendimento: R$ 196/mês, 1 número, 2 assentos (dono + 1)
 *  - Sem planos anuais para novas assinaturas.
 * Clientes criados ANTES mantêm o padrão anterior (R$ 696 / 3.000 / 5 / 5).
 */
export const PLAN_V3_CUTOFF = "2026-09-03T00:00:00Z";

type ProfileLike = {
  plan?: string | null;
  created_at?: string | null;
  extra_numbers?: number | null;
  extra_opportunities_packs?: number | null;
  extra_contacts_packs?: number | null;
} | null | undefined;

/** Usuário do novo padrão (v3): criado a partir do corte de 2026-09-03. */
export function isV3PlanUser(profile: ProfileLike): boolean {
  if (!profile?.created_at) return false;
  return new Date(profile.created_at).getTime() >= new Date(PLAN_V3_CUTOFF).getTime();
}


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
 * SDR Inteligente (agente SDR autônomo) — EXCLUSIVO Growth IA.
 * Não vale grandfathering: nem Free, nem Start/Atendimento (mesmo legado) têm acesso.
 * Enterprise (scale) herda tudo do Growth, então também tem.
 */
export function hasSDRInteligenteAccess(profile: ProfileLike): boolean {
  const plan = (profile?.plan || "").toLowerCase();
  return plan === "growth" || plan === "scale";
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
const NEW_START_BLOCKED: FeatureKey[] = ["oportunidades", "agents", "sdr_inteligente"];

export function planHasFeature(profile: ProfileLike, key: FeatureKey): boolean {
  if (!profile) return true;
  // SDR Inteligente é exclusivo do Growth IA (e Enterprise) — sem grandfathering.
  if (key === "sdr_inteligente") return hasSDRInteligenteAccess(profile);
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

/**
 * Oportunidades incluídas no plano (sem add-ons e sem bônus).
 * Growth: 3.000 (legado) / 1.000 (v3). Atendimento novo: 0.
 */
export function getIncludedOpportunities(profile: ProfileLike): number {
  const plan = (profile?.plan || "free").toLowerCase();
  // Enquanto `created_at` ainda não carregou, assumimos o padrão novo (1.000)
  // para nunca exibir um limite maior do que o contratado.
  if (plan === "growth") return !profile?.created_at || isV3PlanUser(profile) ? 1000 : 3000;
  if (plan === "scale") return 10000;
  if (plan === "start") return isLegacyPlanUser(profile) ? 1000 : 0;
  return 10;
}

/** Números WhatsApp incluídos no plano (sem add-ons). */
export function getBaseNumbersLimit(profile: ProfileLike): number {
  const plan = (profile?.plan || "free").toLowerCase();
  if (plan === "start") return isV3PlanUser(profile) ? 1 : 2;
  if (plan === "growth") return isV3PlanUser(profile) ? 2 : 5;
  if (plan === "scale") return Infinity;
  return 1;
}

/** Números WhatsApp totais = plano + add-ons (`extra_numbers`). */
export function getNumbersLimit(profile: ProfileLike): number {
  const base = getBaseNumbersLimit(profile);
  if (!Number.isFinite(base)) return base;
  return base + (Number(profile?.extra_numbers) || 0);
}

/**
 * Assentos (dono + sub usuários) incluídos no plano.
 * Cada add-on de número inclui +1 usuário.
 */
export function getBaseSeatLimit(profile: ProfileLike): number {
  const plan = (profile?.plan || "free").toLowerCase();
  if (plan === "start") return isV3PlanUser(profile) ? 2 : 3;
  if (plan === "growth") return isV3PlanUser(profile) ? 3 : 6;
  return Infinity;
}

export function getSeatLimit(profile: ProfileLike): number {
  const base = getBaseSeatLimit(profile);
  if (!Number.isFinite(base)) return base;
  return base + (Number(profile?.extra_numbers) || 0);
}
