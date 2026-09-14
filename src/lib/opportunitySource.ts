/**
 * Origem da oportunidade (Prospecção Completa = maps, Prospecção Web = web)
 * e regra única de disponibilidade da mensagem de abordagem.
 * A mesma regra é aplicada no backend (approach-lead / approach-lead-manual).
 */

export type OpportunitySource = "maps" | "web";

export function sourceLabel(source?: string | null): "IA" | "Web" {
  return source === "web" ? "Web" : "IA";
}

export function sourceTitle(source?: string | null): string {
  return source === "web" ? "Prospecção Web" : "Prospecção Completa";
}

/** Telefone brasileiro válido (fixo ou celular), com ou sem DDI 55. */
export function isValidBRPhone(raw: unknown): boolean {
  let d = String(raw ?? "").replace(/\D/g, "");
  if (!d) return false;
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) d = d.slice(2);
  if (d.length !== 10 && d.length !== 11) return false;
  const ddd = Number(d.slice(0, 2));
  if (ddd < 11 || ddd > 99) return false;
  const rest = d.slice(2);
  if (/^(\d)\1+$/.test(rest)) return false;
  if (d.length === 11 && rest[0] !== "9") return false;
  return true;
}

export interface OpportunityLike {
  phone?: string | null;
  phone_numbers?: unknown;
  source?: string | null;
}

/** Só é possível gerar mensagem quando existe telefone/WhatsApp real. */
export function canGenerateMessage(opportunity: OpportunityLike | null | undefined): boolean {
  if (!opportunity) return false;
  if (opportunity.source === "web") return false;
  if (isValidBRPhone(opportunity.phone)) return true;
  const list = opportunity.phone_numbers;
  if (Array.isArray(list)) {
    return list.some((p: any) =>
      isValidBRPhone(typeof p === "string" ? p : p?.number ?? p?.phone),
    );
  }
  return false;
}

export const NO_NUMBER_MESSAGE = "Número não encontrado";

/**
 * Avaliação exibida (0 a 5).
 * Maps: nota real do Google. Web: derivada da análise de IA (score 0-100 → 0-5).
 */
export function displayRating(
  lead: { rating?: number | null; ai_score?: number | null; source?: string | null } | null | undefined,
): number | null {
  if (!lead) return null;
  if (lead.rating != null && lead.rating > 0) return lead.rating;
  if (lead.ai_score != null && lead.ai_score > 0) {
    return Math.round((lead.ai_score / 20) * 10) / 10;
  }
  return null;
}

/** true quando a avaliação vem da análise de IA (Web), não do Google. */
export function isDerivedRating(
  lead: { rating?: number | null; ai_score?: number | null } | null | undefined,
): boolean {
  return !!lead && !(lead.rating != null && lead.rating > 0) && (lead.ai_score ?? 0) > 0;
}
