/**
 * Central de Sugestões — camada de domínio compartilhada (cliente + admin).
 *
 * Mantida isolada para permitir evoluções futuras (envio de e-mail por
 * categoria, roadmap interno, agrupamento automático, classificação por IA)
 * sem tocar nas telas.
 */

export const SUGGESTION_CATEGORIES = [
  "CRM",
  "Prospecção com IA",
  "WhatsApp Oficial",
  "Pipeline",
  "Fluxos Automáticos",
  "IA de Engajamento",
  "Dashboard",
  "Integrações",
  "Configurações",
  "Outro",
] as const;

export type SuggestionCategory = (typeof SUGGESTION_CATEGORIES)[number];

export type SuggestionImportance = "comodidade" | "melhoraria" | "bloqueio";

export const SUGGESTION_IMPORTANCE: {
  value: SuggestionImportance;
  label: string;
  emoji: string;
  badgeClass: string;
}[] = [
  {
    value: "comodidade",
    label: "Seria apenas uma comodidade",
    emoji: "🔵",
    badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  {
    value: "melhoraria",
    label: "Melhoraria bastante meu dia a dia",
    emoji: "🟡",
    badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  {
    value: "bloqueio",
    label: "Impede meu trabalho atualmente",
    emoji: "🔴",
    badgeClass: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  },
];

export const IMPORTANCE_MAP = Object.fromEntries(
  SUGGESTION_IMPORTANCE.map((i) => [i.value, i])
) as Record<SuggestionImportance, (typeof SUGGESTION_IMPORTANCE)[number]>;

export type SuggestionStatus =
  | "recebida"
  | "lida"
  | "em_desenvolvimento"
  | "entregue"
  | "arquivada";

export const SUGGESTION_STATUS_LABEL: Record<SuggestionStatus, string> = {
  recebida: "Recebida",
  lida: "Lida",
  em_desenvolvimento: "Em desenvolvimento",
  entregue: "Entregue",
  arquivada: "Arquivada",
};

export const SUGGESTION_TITLE_MAX = 100;
export const SUGGESTION_DESCRIPTION_MAX = 1000;

export interface SuggestionRow {
  id: string;
  user_id: string;
  account_owner_id: string | null;
  company_name: string | null;
  user_name: string | null;
  user_email: string | null;
  category: string;
  title: string;
  description: string;
  importance: string;
  status: string;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export type SuggestionPeriod = "7d" | "30d" | "90d" | "year" | "custom";

export const SUGGESTION_PERIODS: { value: SuggestionPeriod; label: string }[] = [
  { value: "7d", label: "Últimos 7 dias" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "90d", label: "Últimos 90 dias" },
  { value: "year", label: "Este ano" },
  { value: "custom", label: "Personalizado" },
];

export function periodToRange(
  period: SuggestionPeriod,
  customFrom?: string,
  customTo?: string
): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date();
  switch (period) {
    case "7d":
      from.setDate(to.getDate() - 7);
      break;
    case "30d":
      from.setDate(to.getDate() - 30);
      break;
    case "90d":
      from.setDate(to.getDate() - 90);
      break;
    case "year":
      from.setMonth(0, 1);
      from.setHours(0, 0, 0, 0);
      break;
    case "custom":
      return {
        from: customFrom ? new Date(`${customFrom}T00:00:00`) : new Date(0),
        to: customTo ? new Date(`${customTo}T23:59:59`) : to,
      };
  }
  return { from, to };
}

export function formatSuggestionDate(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}
