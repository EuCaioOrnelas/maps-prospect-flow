// Configuração e tipos do SDR Inteligente
// Cada número de WhatsApp (plano + order-bumps) libera 1 SDR.

export const SDR_PLAN_NUMBERS: Record<string, number> = {
  free: 1,
  trial: 1,
  start: 2,
  atendimento: 2,
  growth: 5,
  scale: 10,
};

export function getSdrLimit(profile: any): number {
  const plan = String(profile?.plan || "free").toLowerCase();
  const base = SDR_PLAN_NUMBERS[plan] ?? 1;
  const extra = Number(profile?.extra_numbers ?? 0) || 0;
  return base + extra;
}

export type SdrObjective =
  | "reuniao"
  | "demonstracao"
  | "proposta"
  | "venda_direta"
  | "qualificar"
  | "recuperar"
  | "outro";

export const SDR_OBJECTIVES: { id: SdrObjective; label: string; hint?: string }[] = [
  { id: "reuniao", label: "Marcar reunião" },
  { id: "demonstracao", label: "Agendar demonstração" },
  { id: "proposta", label: "Enviar proposta" },
  { id: "venda_direta", label: "Fechar venda direta", hint: "Recomendado para produtos simples até R$ 500/mês" },
  { id: "qualificar", label: "Qualificar oportunidades" },
  { id: "recuperar", label: "Recuperar oportunidades" },
  { id: "outro", label: "Outro" },
];

export const SDR_WEEKDAYS = [
  { id: 1, label: "Seg" },
  { id: 2, label: "Ter" },
  { id: 3, label: "Qua" },
  { id: 4, label: "Qui" },
  { id: 5, label: "Sex" },
  { id: 6, label: "Sáb" },
  { id: 0, label: "Dom" },
];

export const SDR_SITUATIONS: {
  id: string;
  label: string;
  options: { id: string; label: string }[];
}[] = [
  {
    id: "ocupado",
    label: "Cliente diz que está ocupado",
    options: [
      { id: "aguardar", label: "Aguardar outro momento" },
      { id: "uma_pergunta", label: "Fazer apenas uma pergunta" },
      { id: "outro_horario", label: "Tentar marcar outro horário" },
    ],
  },
  {
    id: "sem_resposta",
    label: "Cliente ficou sem responder",
    options: [
      { id: "followup", label: "Fazer follow-up" },
      { id: "encerrar", label: "Encerrar" },
      { id: "avisar", label: "Avisar vendedor" },
    ],
  },
  {
    id: "concorrente",
    label: "Cliente já usa concorrente",
    options: [
      { id: "descobrir", label: "Descobrir problemas" },
      { id: "comparar", label: "Comparar soluções" },
      { id: "reuniao", label: "Agendar reunião" },
    ],
  },
  {
    id: "preco",
    label: "Cliente pediu preço",
    options: [
      { id: "contexto", label: "Descobrir contexto antes" },
      { id: "enviar", label: "Enviar imediatamente" },
    ],
  },
  {
    id: "recusou",
    label: "Cliente recusou",
    options: [
      { id: "encerrar", label: "Encerrar" },
      { id: "recuperar", label: "Tentar recuperar" },
      { id: "followup", label: "Agendar follow-up" },
    ],
  },
  {
    id: "interesse",
    label: "Cliente demonstrou muito interesse",
    options: [
      { id: "acelerar", label: "Acelerar negociação" },
      { id: "reuniao", label: "Marcar reunião" },
      { id: "vendedor", label: "Chamar vendedor" },
    ],
  },
];

export const SDR_PRIORITIES = [
  { id: "conexao", label: "Criar conexão" },
  { id: "necessidade", label: "Descobrir necessidade" },
  { id: "objecoes", label: "Resolver objeções" },
  { id: "valor", label: "Gerar valor" },
  { id: "reuniao", label: "Marcar reunião" },
];

export type SdrDraft = {
  name: string;
  objective: SdrObjective;
  objective_custom: string;
  whatsapp_number_ids: string[];
  schedule: {
    mode: "always" | "custom";
    days: number[];
    start: string;
    end: string;
    queue_outside_hours: boolean;
  };
  triggers: {
    inbound: "always" | "first_only" | "after_flow" | "after_transfer" | "off";
    outbound_prospect: boolean;
    outbound_followup: boolean;
    outbound_reactivate: boolean;
    reply_delay: "immediate" | "30s" | "1min" | "custom";
    reply_delay_custom_seconds: number;
    templates: string[];
  };
  personality: {
    tone: "consultivo" | "profissional" | "descontraido" | "objetivo";
    formality: "baixo" | "medio" | "alto";
    length: "curtas" | "medias" | "longas";
    emojis: "nunca" | "pouco" | "normal";
    questions: "sempre" | "quando_necessario" | "evitar";
    leads_conversation: boolean;
    never_wait_lead: boolean;
  };
  strategy: {
    priorities: string[];
    insistence: "pouco" | "medio" | "muito";
    return_to_goal: "imediato" | "natural" | "abertura";
    on_objection: "contornar" | "explorar" | "validar" | "vendedor";
  };
  knowledge: {
    company: string;
    products: string;
    faq: string;
    policies: string;
    cases: string;
    differentials: string;
    competitors: string;
    site: string;
    instagram: string;
    links: string;
  };
  closing: {
    success_criteria: string[];
    stop_criteria: string[];
    followup_max: number;
    followup_mode: "inteligente" | "manual";
    followup_interval_hours: number;
    after_limit: "arquivar" | "mover_pipeline" | "criar_tarefa" | "avisar_vendedor";
  };
  situations: Record<string, string>;
};

export const SDR_DEFAULT_DRAFT: SdrDraft = {
  name: "",
  objective: "reuniao",
  objective_custom: "",
  whatsapp_number_ids: [],
  schedule: {
    mode: "custom",
    days: [1, 2, 3, 4, 5],
    start: "08:30",
    end: "18:00",
    queue_outside_hours: true,
  },
  triggers: {
    inbound: "always",
    outbound_prospect: true,
    outbound_followup: true,
    outbound_reactivate: false,
    reply_delay: "30s",
    reply_delay_custom_seconds: 60,
    templates: [],
  },
  personality: {
    tone: "consultivo",
    formality: "medio",
    length: "curtas",
    emojis: "pouco",
    questions: "quando_necessario",
    leads_conversation: true,
    never_wait_lead: true,
  },
  strategy: {
    priorities: ["conexao", "necessidade", "valor", "objecoes", "reuniao"],
    insistence: "medio",
    return_to_goal: "natural",
    on_objection: "explorar",
  },
  knowledge: {
    company: "",
    products: "",
    faq: "",
    policies: "",
    cases: "",
    differentials: "",
    competitors: "",
    site: "",
    instagram: "",
    links: "",
  },
  closing: {
    success_criteria: ["reuniao"],
    stop_criteria: ["recusou", "sem_resposta", "pediu_parar"],
    followup_max: 4,
    followup_mode: "inteligente",
    followup_interval_hours: 24,
    after_limit: "avisar_vendedor",
  },
  situations: {
    ocupado: "uma_pergunta",
    sem_resposta: "followup",
    concorrente: "descobrir",
    preco: "contexto",
    recusou: "followup",
    interesse: "reuniao",
  },
};

export const SDR_OBJECTIVE_LABEL = (id: string) =>
  SDR_OBJECTIVES.find((o) => o.id === id)?.label ?? id;
