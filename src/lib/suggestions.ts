/**
 * Wiize Evolui — camada de domínio compartilhada (cliente + admin).
 *
 * Evolução da antiga Central de Sugestões: mantém compatibilidade com os
 * registros históricos (categorias e status antigos continuam válidos) e
 * adiciona votação, status do ciclo de vida, análise de IA e planejamento.
 */

// Categorias atuais do formulário (novas sugestões)
export const SUGGESTION_CATEGORIES = [
  "Prospecção",
  "Inteligência comercial",
  "CRM",
  "WhatsApp",
  "Automações",
  "Inteligência artificial",
  "Gestão de clientes",
  "Gestão de tarefas",
  "Gestão de projetos",
  "Financeiro",
  "Pagamentos",
  "Relatórios e indicadores",
  "Integrações",
  "Experiência do usuário",
  "Segurança",
  "Outros",
] as const;

// Categorias históricas (existem no banco; usadas apenas para filtros/exibição)
export const SUGGESTION_LEGACY_CATEGORIES = [
  "Prospecção com IA",
  "WhatsApp Oficial",
  "Pipeline",
  "Fluxos Automáticos",
  "IA de Engajamento",
  "Dashboard",
  "Configurações",
  "Outro",
] as const;

export const SUGGESTION_ALL_CATEGORIES: string[] = [
  ...SUGGESTION_CATEGORIES,
  ...SUGGESTION_LEGACY_CATEGORIES.filter(
    (c) => !(SUGGESTION_CATEGORIES as readonly string[]).includes(c)
  ),
];

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

// Status do ciclo de vida (novos) + legados (registros antigos)
export type SuggestionStatus =
  | "recebida"
  | "em_analise"
  | "em_avaliacao_comunidade"
  | "planejada"
  | "em_desenvolvimento"
  | "implementada"
  | "nao_planejada"
  // legados
  | "lida"
  | "entregue"
  | "arquivada";

export const SUGGESTION_STATUS_LABEL: Record<SuggestionStatus, string> = {
  recebida: "Recebida",
  em_analise: "Em análise",
  em_avaliacao_comunidade: "Em avaliação da comunidade",
  planejada: "Planejada",
  em_desenvolvimento: "Em desenvolvimento",
  implementada: "Implementada",
  nao_planejada: "Não planejada",
  lida: "Lida",
  entregue: "Entregue",
  arquivada: "Arquivada",
};

// Status exibidos publicamente na listagem da comunidade
export const SUGGESTION_PUBLIC_STATUSES: SuggestionStatus[] = [
  "recebida",
  "em_analise",
  "em_avaliacao_comunidade",
  "planejada",
  "em_desenvolvimento",
  "implementada",
];

export const SUGGESTION_STATUS_BADGE_CLASS: Record<string, string> = {
  recebida: "bg-muted text-muted-foreground border-border",
  em_analise: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  em_avaliacao_comunidade: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
  planejada: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  em_desenvolvimento: "bg-primary/10 text-primary border-primary/20",
  implementada: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  nao_planejada: "bg-muted text-muted-foreground border-border",
  lida: "bg-muted text-muted-foreground border-border",
  entregue: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  arquivada: "bg-muted text-muted-foreground border-border",
};

export type SuggestionAiStatus = "pendente" | "processando" | "analisada" | "falha" | "revisao";

export const SUGGESTION_AI_STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  processando: "Processando",
  analisada: "Analisada",
  falha: "Falha",
  revisao: "Revisão necessária",
};

export const SUGGESTION_TITLE_MAX = 100;
export const SUGGESTION_DESCRIPTION_MAX = 1000;
export const SUGGESTION_FIELD_MAX = 600;

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
  // Wiize Evolui
  is_public: boolean;
  problem: string | null;
  expected_behavior: string | null;
  expected_benefit: string | null;
  vote_count: number;
  ai_status: string;
  ai_summary: string | null;
  ai_category: string | null;
  ai_priority_score: number | null;
  ai_priority_reason: string | null;
  ai_group_id: string | null;
  ai_analyzed_at: string | null;
  implemented_at: string | null;
  implementation_notes: string | null;
  admin_notes: string | null;
}

export interface SuggestionGroupRow {
  id: string;
  name: string;
  description: string | null;
  problem: string | null;
  solution: string | null;
  category: string | null;
  suggestions_count: number;
  users_count: number;
  companies_count: number;
  votes_total: number;
  priority_score: number | null;
  priority_reason: string | null;
  confidence: string | null;
  status: string;
  admin_locked: boolean;
  first_occurrence: string | null;
  last_occurrence: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SuggestionCycleRow {
  id: string;
  title: string;
  month_label: string;
  status: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SuggestionCycleItemRow {
  id: string;
  cycle_id: string;
  group_id: string | null;
  title: string;
  status: string;
  justification: string | null;
  responsible: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface SuggestionReleaseRow {
  id: string;
  cycle_item_id: string | null;
  title: string;
  description: string | null;
  problem: string | null;
  benefit: string | null;
  category: string | null;
  image_url: string | null;
  doc_url: string | null;
  status: string;
  expected_date: string | null;
  released_at: string | null;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export const CYCLE_STATUS_LABEL: Record<string, string> = {
  em_avaliacao: "Em avaliação",
  selecionada: "Selecionada para o mês",
  planejamento_tecnico: "Em planejamento técnico",
  em_desenvolvimento: "Em desenvolvimento",
  em_testes: "Em testes",
  implementada: "Implementada",
  adiada: "Adiada",
  cancelada: "Cancelada",
};

export const CYCLE_ITEM_STATUSES = [
  "em_avaliacao",
  "selecionada",
  "planejamento_tecnico",
  "em_desenvolvimento",
  "em_testes",
  "implementada",
  "adiada",
  "cancelada",
] as const;

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

export function formatSuggestionDateShort(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

// ===== Ideias de votação (grupos unificados pela IA) =====
export type IdeaStatus = "em_votacao" | "em_desenvolvimento" | "lancada" | "publicada";
export const IDEA_STATUS_OPTIONS: IdeaStatus[] = ["em_votacao", "em_desenvolvimento", "lancada", "publicada"];
export const IDEA_STATUS_LABEL: Record<IdeaStatus, string> = {
  em_votacao: "Em análise e votação",
  em_desenvolvimento: "Em desenvolvimento",
  lancada: "Lançada",
  publicada: "Publicada",
};
export const IDEA_STATUS_CLASS: Record<IdeaStatus, string> = {
  em_votacao: "bg-muted text-muted-foreground border-border",
  em_desenvolvimento: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  lancada: "bg-primary/10 text-primary border-primary/20",
  publicada: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
};
export type IdeaPeriod = "month" | "year" | "all";
