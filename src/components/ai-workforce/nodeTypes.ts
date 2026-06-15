import {
  Bot, Target, Brain, BookOpen, Database, ClipboardList,
  ShieldCheck, GitBranch, Wrench, Zap, UserCheck, BarChart3
} from "lucide-react";

export type WorkforceNodeKind =
  | "core"
  | "goal"
  | "memory"
  | "knowledge"
  | "crm_data"
  | "data_collection"
  | "rules"
  | "decision"
  | "tools"
  | "actions"
  | "escalation"
  | "analysis";

export interface WorkforceNodeMeta {
  kind: WorkforceNodeKind;
  label: string;
  description: string;
  icon: typeof Bot;
  color: string; // tailwind utility
  required?: boolean;
  unique?: boolean;
}

export const WORKFORCE_NODE_META: Record<WorkforceNodeKind, WorkforceNodeMeta> = {
  core: {
    kind: "core",
    label: "Núcleo do Colaborador",
    description: "Identidade, persona e modelo de IA.",
    icon: Bot,
    color: "text-primary",
    required: true,
    unique: true,
  },
  goal: {
    kind: "goal",
    label: "Objetivo",
    description: "Objetivo principal e critérios de sucesso.",
    icon: Target,
    color: "text-emerald-500",
    required: true,
  },
  memory: {
    kind: "memory",
    label: "Memória",
    description: "Memória de conversa, lead e permanente.",
    icon: Brain,
    color: "text-violet-500",
  },
  knowledge: {
    kind: "knowledge",
    label: "Conhecimento",
    description: "PDFs, sites, FAQs e bases internas.",
    icon: BookOpen,
    color: "text-amber-500",
  },
  crm_data: {
    kind: "crm_data",
    label: "Dados do CRM",
    description: "Acesso a campos e histórico do lead.",
    icon: Database,
    color: "text-sky-500",
  },
  data_collection: {
    kind: "data_collection",
    label: "Coleta de Dados",
    description: "Campos obrigatórios para concluir o objetivo.",
    icon: ClipboardList,
    color: "text-cyan-500",
  },
  rules: {
    kind: "rules",
    label: "Regras",
    description: "Regras de negócio com prioridade.",
    icon: ShieldCheck,
    color: "text-rose-500",
  },
  decision: {
    kind: "decision",
    label: "Tomada de Decisão",
    description: "Árvore de decisão Se/Então/Senão.",
    icon: GitBranch,
    color: "text-fuchsia-500",
  },
  tools: {
    kind: "tools",
    label: "Ferramentas",
    description: "CRM, Agenda, WhatsApp, Webhooks, APIs.",
    icon: Wrench,
    color: "text-indigo-500",
  },
  actions: {
    kind: "actions",
    label: "Ações",
    description: "Tarefas, etapas, negócios, agendamentos.",
    icon: Zap,
    color: "text-orange-500",
  },
  escalation: {
    kind: "escalation",
    label: "Escalonamento",
    description: "Regras para transferir para humano.",
    icon: UserCheck,
    color: "text-yellow-500",
  },
  analysis: {
    kind: "analysis",
    label: "Análise Final",
    description: "Resumo, score e próxima ação ao final.",
    icon: BarChart3,
    color: "text-teal-500",
  },
};

export const WORKFORCE_NODE_LIST = Object.values(WORKFORCE_NODE_META);
