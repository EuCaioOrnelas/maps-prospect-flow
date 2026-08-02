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
  | "recuperar";

export const SDR_OBJECTIVES: { id: SdrObjective; label: string; hint?: string }[] = [
  { id: "reuniao", label: "Marcar reunião" },
  { id: "demonstracao", label: "Agendar demonstração" },
  { id: "proposta", label: "Enviar proposta" },
  { id: "venda_direta", label: "Fechar venda direta", hint: "Ideal para ticket até R$ 500/mês" },
  { id: "qualificar", label: "Qualificar oportunidades" },
  { id: "recuperar", label: "Recuperar oportunidades" },
];

/** Critério de sucesso derivado do objetivo (não editável pelo usuário) */
export const SDR_SUCCESS_BY_OBJECTIVE: Record<SdrObjective, string> = {
  reuniao: "Reunião marcada com data e horário confirmados",
  demonstracao: "Demonstração agendada com data e horário confirmados",
  proposta: "Proposta enviada e confirmada como recebida pelo lead",
  venda_direta: "Venda fechada e pagamento encaminhado",
  qualificar: "Lead qualificado com dor, orçamento e decisor identificados",
  recuperar: "Oportunidade reativada e próximo passo agendado",
};

export const SDR_WEEKDAYS = [
  { id: 1, label: "Seg" },
  { id: 2, label: "Ter" },
  { id: 3, label: "Qua" },
  { id: 4, label: "Qui" },
  { id: 5, label: "Sex" },
  { id: 6, label: "Sáb" },
  { id: 0, label: "Dom" },
];

/** Gatilhos de ativação (multi-seleção) */
export const SDR_ACTIVATION_TRIGGERS: { id: string; label: string; hint: string }[] = [
  { id: "inbound_all", label: "Toda mensagem recebida", hint: "O SDR responde qualquer contato no WhatsApp" },
  { id: "first_only", label: "Só o primeiro contato", hint: "Assume apenas a abertura da conversa" },
  { id: "after_flow", label: "Depois de um fluxo", hint: "Entra quando um fluxo termina" },
  { id: "after_transfer", label: "Após transferência", hint: "Assume quando o time transferir" },
  { id: "manual_call", label: "Quando eu chamar", hint: "Ativado manualmente no chat ou no CRM" },
  { id: "new_opportunity", label: "Nova oportunidade", hint: "Inicia a conversa em novos leads prospectados" },
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
      { id: "nunca_sem_reuniao", label: "Nunca falar preço sem marcar reunião" },
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
];

export const SDR_PRIORITIES = [
  { id: "conexao", label: "Criar conexão", hint: "Quebrar o gelo e gerar confiança" },
  { id: "necessidade", label: "Descobrir necessidade", hint: "Entender a dor real do lead" },
  { id: "valor", label: "Gerar valor", hint: "Mostrar como a solução resolve a dor" },
  { id: "objecoes", label: "Resolver objeções", hint: "Tratar dúvidas e travas" },
  { id: "reuniao", label: "Fechar o objetivo", hint: "Conduzir para o próximo passo" },
];

export type SdrProduct = {
  name: string;
  description: string;
  when_to_offer: string;
  price: string;
};

export type SdrLink = {
  url: string;
  when_to_use: string;
};

export type SdrDraft = {
  name: string;
  objective: SdrObjective;
  objective_custom: string;
  whatsapp_number_ids: string[];
  ai: {
    provider: "openai";
    model: string;
    api_key: string;
  };
  schedule: {
    mode: "always" | "custom";
    days: number[];
    start: string;
    end: string;
    queue_outside_hours: boolean;
  };
  triggers: {
    activation: string[];
    inbound: "always" | "first_only" | "after_flow" | "after_transfer" | "off";
    outbound_prospect: boolean;
    outbound_followup: boolean;
    outbound_reactivate: boolean;
    reply_delay: "immediate" | "30s" | "1min" | "smart" | "custom";
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
    niche: string;
    audience: string;
    products: string;
    products_list: SdrProduct[];
    faq: string;
    policies: string;
    cases: string;
    differentials: string;
    competitors: string;
    site: string;
    instagram: string;
    links: string;
    links_list: SdrLink[];
  };
  closing: {
    success_criteria: string[];
    stop_criteria: string[];
    stop_no_reply_hours: number;
    followup_max: number;
    followup_mode: "inteligente" | "manual";
    followup_interval_hours: number;
    followup_min_hours: number;
    followup_max_hours: number;
    followup_templates: string[];
    notify_seller: boolean;
    notify_seller_email: string;
    after_limit: "arquivar" | "mover_pipeline" | "criar_tarefa" | "avisar_vendedor";
    after_limit_actions: string[];
    after_limit_stage_id: string;
  };
  situations: Record<string, string>;
};

export const SDR_DEFAULT_DRAFT: SdrDraft = {
  name: "",
  objective: "reuniao",
  objective_custom: "",
  whatsapp_number_ids: [],
  ai: {
    provider: "openai",
    model: "gpt-4o-mini",
    api_key: "",
  },
  schedule: {
    mode: "custom",
    days: [1, 2, 3, 4, 5],
    start: "08:30",
    end: "18:00",
    queue_outside_hours: true,
  },
  triggers: {
    activation: ["inbound_all"],
    inbound: "always",
    outbound_prospect: true,
    outbound_followup: true,
    outbound_reactivate: false,
    reply_delay: "smart",
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
    niche: "",
    audience: "",
    products: "",
    products_list: [{ name: "", description: "", when_to_offer: "", price: "" }],
    faq: "",
    policies: "",
    cases: "",
    differentials: "",
    competitors: "",
    site: "",
    instagram: "",
    links: "",
    links_list: [],
  },
  closing: {
    success_criteria: ["reuniao"],
    stop_criteria: ["recusou", "sem_resposta", "pediu_parar"],
    stop_no_reply_hours: 48,
    followup_max: 4,
    followup_mode: "inteligente",
    followup_interval_hours: 24,
    followup_min_hours: 12,
    followup_max_hours: 48,
    followup_templates: [],
    notify_seller: true,
    notify_seller_email: "",
    after_limit: "avisar_vendedor",
    after_limit_actions: ["arquivar"],
    after_limit_stage_id: "",
  },
  situations: {
    ocupado: "uma_pergunta",
    concorrente: "descobrir",
    preco: "nunca_sem_reuniao",
    recusou: "followup",
  },
};

export const SDR_OBJECTIVE_LABEL = (id: string) =>
  SDR_OBJECTIVES.find((o) => o.id === id)?.label ?? id;
