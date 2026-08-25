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

/** Status internos que não são escolhidos manualmente, mas precisam de rótulo. */
export const EXTRA_STATUS_LABELS: Record<string, string> = {
  aguardando_analise: "Aguardando análise",
  contatos_identificados: "Contatos identificados",
  pronto_abordagem: "Pronto para abordagem",
  sem_contato: "Sem contato",
  email_enviado: "E-mail enviado",
};

export const statusLabel = (v: string) =>
  PROSPECT_STATUSES.find((s) => s.value === v)?.label ?? EXTRA_STATUS_LABELS[v] ?? v;


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

export const IG_PROGRESS_STEPS = [
  "Interpretando ICP",
  "Gerando consultas de busca",
  "Descobrindo perfis no Instagram",
  "Eliminando duplicados",
  "Coletando dados dos perfis",
  "Analisando conteúdo com IA",
  "Calculando Fit Score",
  "Organizando resultados",
  "Concluído",
];

export const fmtPct = (n: number | null | undefined) =>
  n === null || n === undefined ? "Não informado" : `${Number(n).toFixed(2).replace(".", ",")}%`;

/**
 * Classifica a qualidade do engajamento levando em conta o tamanho do perfil
 * (perfis grandes naturalmente têm taxa menor).
 */
export type EngagementQuality = {
  label: string;
  tone: "excellent" | "good" | "ok" | "low" | "unknown";
  variant: "default" | "secondary" | "outline" | "destructive";
  hint: string;
};

export function engagementQuality(
  rate: number | null | undefined,
  followers: number | null | undefined,
): EngagementQuality {
  if (rate === null || rate === undefined || !Number.isFinite(Number(rate)) || Number(rate) <= 0) {
    return {
      label: "Sem dados",
      tone: "unknown",
      variant: "outline",
      hint: "Não foi possível medir o engajamento (perfil privado ou sem posts públicos recentes).",
    };
  }
  const r = Number(rate);
  const f = Number(followers ?? 0);
  // Faixas de referência por tamanho de audiência (curtidas + comentários / seguidores)
  const t =
    f >= 500_000 ? { exc: 2, good: 1, ok: 0.5 } :
    f >= 100_000 ? { exc: 3, good: 1.5, ok: 0.8 } :
    f >= 10_000 ? { exc: 4, good: 2, ok: 1 } :
    { exc: 6, good: 3, ok: 1.5 };

  const bench = `Referência para ${fmtNum(f)} seguidores: bom acima de ${String(t.good).replace(".", ",")}%.`;
  if (r >= t.exc) return { label: "Engajamento excelente", tone: "excellent", variant: "default", hint: `Audiência muito ativa. ${bench}` };
  if (r >= t.good) return { label: "Engajamento bom", tone: "good", variant: "default", hint: `Acima da média do porte. ${bench}` };
  if (r >= t.ok) return { label: "Engajamento mediano", tone: "ok", variant: "secondary", hint: `Dentro do esperado, sem destaque. ${bench}` };
  return { label: "Engajamento baixo", tone: "low", variant: "destructive", hint: `Abaixo do esperado — audiência pouco ativa. ${bench}` };
}

export const engagementDotClass = (tone: EngagementQuality["tone"]) =>
  tone === "excellent" ? "bg-emerald-500" :
  tone === "good" ? "bg-lime-500" :
  tone === "ok" ? "bg-amber-500" :
  tone === "low" ? "bg-rose-500" : "bg-muted-foreground/40";
