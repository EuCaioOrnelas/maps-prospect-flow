/**
 * Wiize Central Intelligence — camada unica de leitura da pontuacao.
 *
 * A Inteligencia e o sistema de analise. A pontuacao 0-100 e o RESULTADO dela.
 * O motor de pontuacao existente (revenue_score_*) continua sendo a fonte dos
 * sinais; aqui apenas normalizamos a escala interna (0-1000) para a escala
 * comercial 0-100 e centralizamos rotulos/cores. Nenhum calculo novo e feito.
 */

export const INTEL_MAX = 100;

/** Normaliza a escala interna 0-1000 para 0-100, sempre limitada. */
export const toIntel100 = (raw: number | null | undefined): number => {
  const n = Number(raw || 0) / 10;
  return Math.max(0, Math.min(INTEL_MAX, Math.round(n)));
};

/** Normaliza sub-dimensoes (engajamento, intencao, urgencia, risco). */
export const toIntelDimension = (raw: number | null | undefined): number => {
  const n = Number(raw || 0) / 10;
  return Math.round(n * 10) / 10;
};

export type IntelBand = "VERY_HIGH" | "HIGH" | "MEDIUM" | "LOW" | "VERY_LOW";

export const intelBand = (score: number): IntelBand => {
  if (score >= 81) return "VERY_HIGH";
  if (score >= 61) return "HIGH";
  if (score >= 41) return "MEDIUM";
  if (score >= 21) return "LOW";
  return "VERY_LOW";
};

export const INTEL_BAND_LABELS: Record<IntelBand, string> = {
  VERY_HIGH: "Oportunidade muito alta",
  HIGH: "Oportunidade alta",
  MEDIUM: "Oportunidade média",
  LOW: "Oportunidade baixa",
  VERY_LOW: "Oportunidade muito baixa",
};

export const INTEL_BAND_SHORT: Record<IntelBand, string> = {
  VERY_HIGH: "Muito alta",
  HIGH: "Alta",
  MEDIUM: "Média",
  LOW: "Baixa",
  VERY_LOW: "Muito baixa",
};

export const intelLabel = (score: number) => INTEL_BAND_LABELS[intelBand(score)];
export const intelShortLabel = (score: number) => INTEL_BAND_SHORT[intelBand(score)];

export const intelTextColor = (score: number) => {
  const b = intelBand(score);
  if (b === "VERY_HIGH") return "text-emerald-500";
  if (b === "HIGH") return "text-emerald-600";
  if (b === "MEDIUM") return "text-blue-500";
  if (b === "LOW") return "text-yellow-500";
  return "text-muted-foreground";
};

export const intelBadgeClass = (score: number) => {
  const b = intelBand(score);
  if (b === "VERY_HIGH") return "bg-emerald-500/15 text-emerald-600 border-emerald-500/30";
  if (b === "HIGH") return "bg-emerald-500/10 text-emerald-600 border-emerald-500/25";
  if (b === "MEDIUM") return "bg-blue-500/10 text-blue-600 border-blue-500/25";
  if (b === "LOW") return "bg-yellow-500/10 text-yellow-600 border-yellow-500/25";
  return "bg-muted text-muted-foreground border-border";
};

/** Ultimos 8 digitos — chave de casamento de telefone usada em todo o produto. */
export const phoneKey8 = (phone?: string | null) => (phone || "").replace(/\D/g, "").slice(-8);
