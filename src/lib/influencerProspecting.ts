export const PROSPECT_STATUSES = [
  { value: "novo", label: "Novo" },
  { value: "qualificado", label: "Qualificado" },
  { value: "contato_encontrado", label: "Contato encontrado" },
  { value: "abordado", label: "Abordado" },
  { value: "respondeu", label: "Respondeu" },
  { value: "negociacao", label: "Negociação" },
  { value: "parceria_ativa", label: "Parceria ativa" },
  { value: "sem_interesse", label: "Sem interesse" },
  { value: "descartado", label: "Descartado" },
];

export const statusLabel = (v: string) => PROSPECT_STATUSES.find((s) => s.value === v)?.label ?? v;

export function fitCategory(score: number | null | undefined) {
  const s = score ?? 0;
  if (s >= 90) return "EXCELENTE FIT";
  if (s >= 80) return "ALTO FIT";
  if (s >= 70) return "BOM FIT";
  if (s >= 60) return "FIT MODERADO";
  return "BAIXO FIT";
}

export function fitBadgeVariant(score: number | null | undefined): "default" | "secondary" | "outline" | "destructive" {
  const s = score ?? 0;
  if (s >= 80) return "default";
  if (s >= 60) return "secondary";
  return "outline";
}

export const fmtNum = (n: number | null | undefined) =>
  n === null || n === undefined ? "Não informado" : new Intl.NumberFormat("pt-BR").format(Number(n));

export const PROGRESS_STEPS = [
  "Interpretando ICP",
  "Gerando pesquisas",
  "Pesquisando YouTube",
  "Encontrando canais",
  "Eliminando duplicados",
  "Coletando dados",
  "Analisando conteúdo com IA",
  "Calculando Fit Score",
  "Organizando resultados",
  "Concluído",
];
