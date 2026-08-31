// Canais de aquisição capturados no onboarding ("Como você conheceu o Wiize?")
// Mantido em um único lugar para que Onboarding e Admin usem os mesmos códigos.

export const ACQUISITION_SOURCES = [
  { id: "youtube", label: "YouTube" },
  { id: "google", label: "Google" },
  { id: "instagram_tiktok", label: "Instagram / TikTok" },
  { id: "indicacao", label: "Indicação" },
  { id: "influenciador_parceiro", label: "Influenciador / Parceiro" },
  { id: "other", label: "Outro" },
] as const;

export type AcquisitionSourceId = (typeof ACQUISITION_SOURCES)[number]["id"];

export const ACQUISITION_SOURCE_LABELS: Record<string, string> =
  ACQUISITION_SOURCES.reduce((acc, s) => {
    acc[s.id] = s.label;
    return acc;
  }, {} as Record<string, string>);

export function acquisitionLabel(value?: string | null): string {
  if (!value) return "—";
  return ACQUISITION_SOURCE_LABELS[value] || value;
}
