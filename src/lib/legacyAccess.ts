/**
 * Legacy feature access — Evolution (Prospecção / Campanhas WhatsApp não-oficial)
 *
 * Estratégia: a Wiize está migrando 100% para a Meta Cloud API (oficial).
 * Usuários CRIADOS ATÉ a data de corte continuam tendo acesso à seção
 * "Campanha → Prospecção" (Evolution). Novos cadastros (criados depois) só veem
 * a seção Meta. Quando o módulo Evolution for descontinuado, basta retornar
 * `false` aqui que tudo some do menu sem migration.
 */
export const EVOLUTION_LEGACY_CUTOFF_ISO = "2026-05-17T19:41:00Z";

export function isLegacyEvolutionUser(profile: { created_at?: string | null } | null | undefined): boolean {
  if (!profile?.created_at) return false;
  const created = new Date(profile.created_at).getTime();
  const cutoff = new Date(EVOLUTION_LEGACY_CUTOFF_ISO).getTime();
  if (Number.isNaN(created) || Number.isNaN(cutoff)) return false;
  return created < cutoff;
}
