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
  { id: "reuniao", label: "Marcar reunião", hint: "Conduz até data e horário confirmados" },
  { id: "demonstracao", label: "Agendar demonstração", hint: "Gera curiosidade e agenda a demo" },
  { id: "proposta", label: "Enviar proposta", hint: "Levanta requisitos e envia a proposta" },
  { id: "venda_direta", label: "Fechar venda direta", hint: "Ideal para ticket até R$ 500/mês" },
  { id: "qualificar", label: "Qualificar oportunidades", hint: "Descobre dor, orçamento e decisor" },
  { id: "recuperar", label: "Recuperar oportunidades", hint: "Reativa leads parados ou frios" },
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

/** Playbook usado pelo cérebro: muda de verdade a forma de conduzir a conversa */
export const SDR_OBJECTIVE_PLAYBOOK: Record<SdrObjective, string> = {
  reuniao:
    "OBJETIVO MARCAR REUNIÃO: toda a conversa converge para uma agenda. Nunca resolva tudo pelo WhatsApp; use a reunião como o lugar onde a dúvida será respondida. Ofereça sempre DUAS janelas concretas (ex.: 'amanhã 10h ou 15h?') e confirme dia, horário e canal. Não fale preço fechado antes da agenda.",
  demonstracao:
    "OBJETIVO AGENDAR DEMONSTRAÇÃO: gere curiosidade mostrando UM resultado prático por vez e transforme cada dúvida em motivo para ver a ferramenta funcionando ('isso eu te mostro na tela em 15 minutos'). Feche com duas opções de horário e confirme quem participará.",
  proposta:
    "OBJETIVO ENVIAR PROPOSTA: antes de enviar qualquer coisa, levante escopo, volume, prazo e quem decide. Só então anuncie o envio, envie e peça confirmação explícita de recebimento, combinando o dia da resposta.",
  venda_direta:
    "OBJETIVO FECHAR VENDA DIRETA: conduza para a decisão na própria conversa. Apresente a oferta certa, trate a objeção e peça o fechamento de forma direta ('te envio o link de pagamento agora?'). Ticket baixo permite falar valor após a dor estar clara.",
  qualificar:
    "OBJETIVO QUALIFICAR: colete de forma natural (uma pergunta por vez) dor real, impacto/urgência, orçamento aproximado e se a pessoa decide. Não force venda nem agenda; encerre resumindo o diagnóstico e o próximo passo.",
  recuperar:
    "OBJETIVO RECUPERAR: retome o contexto anterior sem cobrar o lead ('vi que paramos em X'). Traga uma novidade ou um motivo novo para retomar, reduza o atrito do próximo passo e reagende. Nunca repita a mesma abordagem anterior.",
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
  {
    id: "inbound_all",
    label: "Toda mensagem recebida",
    hint: "O SDR responde qualquer contato que escrever no WhatsApp",
  },
  {
    id: "first_only",
    label: "Só o primeiro contato",
    hint: "Assume apenas a abertura e devolve a conversa depois",
  },
  {
    id: "after_flow",
    label: "Depois de um fluxo",
    hint: "Entra quando uma automação termina e o lead continua respondendo",
  },
];

/** Etapas fixas do raciocínio comercial da IA */
export const SDR_PIPELINE = [
  { id: "conexao", label: "Criar conexão", hint: "Quebrar o gelo e gerar confiança" },
  { id: "necessidade", label: "Descobrir necessidade", hint: "Entender a dor real do lead" },
  { id: "valor", label: "Gerar valor", hint: "Mostrar como a solução resolve a dor" },
  { id: "objecoes", label: "Resolver objeções", hint: "Tratar dúvidas e travas" },
  { id: "fechamento", label: "Fechar o objetivo", hint: "Conduzir para o próximo passo" },
];

export const SDR_PRIORITIES = SDR_PIPELINE;

export const SDR_INSISTENCE_OPTIONS = [
  { id: "pouco", label: "Pouco", hint: "Aceita o 'agora não' na primeira vez e recua" },
  { id: "medio", label: "Médio", hint: "Tenta contornar duas vezes antes de recuar" },
  { id: "muito", label: "Muito", hint: "Usa até três ângulos diferentes, mas para diante de recusa clara" },
];

export const SDR_RETURN_OPTIONS = [
  {
    id: "imediato",
    label: "Imediatamente",
    hint: "Responde a dúvida e já volta ao objetivo na mesma mensagem",
  },
  {
    id: "natural",
    label: "Naturalmente",
    hint: "Conversa um pouco e retoma o objetivo quando fizer sentido",
  },
  {
    id: "abertura",
    label: "Só com abertura",
    hint: "Espera um sinal de interesse antes de voltar ao objetivo",
  },
];

export const SDR_OBJECTION_OPTIONS = [
  { id: "contornar", label: "Contornar", hint: "Reformula o valor e segue para o próximo passo" },
  { id: "explorar", label: "Explorar", hint: "Pergunta o motivo real por trás da objeção" },
  { id: "validar", label: "Validar", hint: "Concorda, acolhe e depois apresenta a saída" },
  { id: "vendedor", label: "Chamar vendedor", hint: "Transfere para uma pessoa do time" },
];

export const SDR_REPLY_DELAY_OPTIONS = [
  { id: "smart", label: "Pausa inteligente", hint: "A IA calcula o tempo humano real de leitura e digitação" },
  { id: "immediate", label: "Imediatamente", hint: "Responde assim que a mensagem chega" },
  { id: "30s", label: "30 segundos", hint: "Pausa fixa curta antes de responder" },
  { id: "1min", label: "1 minuto", hint: "Pausa fixa média antes de responder" },
  { id: "custom", label: "Personalizado", hint: "Você define os segundos de espera" },
];

export const SDR_STOP_OPTIONS = [
  { id: "recusou", label: "Recusou o serviço", hint: "Disse claramente que não quer avançar" },
  { id: "sem_resposta", label: "Ficou sem resposta", hint: "Silêncio pelo tempo que você definir" },
  { id: "pediu_parar", label: "Pediu para parar", hint: "Solicitou não receber mais contato" },
];

export const SDR_FOLLOWUP_MODES = [
  {
    id: "inteligente",
    label: "Inteligente",
    hint: "A IA escreve cada follow-up e escolhe o melhor momento dentro da faixa",
  },
  {
    id: "manual",
    label: "Manual",
    hint: "Você define o intervalo fixo e os templates aprovados da Meta",
  },
];

export const SDR_SITUATIONS: {
  id: string;
  label: string;
  hint?: string;
  options: { id: string; label: string; hint?: string }[];
}[] = [
  {
    id: "ocupado",
    label: "Cliente diz que está ocupado",
    hint: "Como reagir quando ele não pode falar agora.",
    options: [
      { id: "aguardar", label: "Aguardar outro momento", hint: "Encerra educadamente e volta depois" },
      { id: "uma_pergunta", label: "Fazer apenas uma pergunta", hint: "Ganha contexto em 10 segundos" },
      { id: "outro_horario", label: "Tentar marcar outro horário", hint: "Já propõe uma janela concreta" },
    ],
  },
  {
    id: "concorrente",
    label: "Cliente já usa concorrente",
    hint: "Como se posicionar sem atacar quem ele já usa.",
    options: [
      { id: "descobrir", label: "Descobrir problemas", hint: "Pergunta o que falta na solução atual" },
      { id: "comparar", label: "Comparar soluções", hint: "Mostra diferenças objetivas" },
      { id: "reuniao", label: "Agendar reunião", hint: "Leva a comparação para uma conversa" },
    ],
  },
  {
    id: "preco",
    label: "Cliente pediu preço",
    hint: "O momento mais delicado da conversa.",
    options: [
      {
        id: "nunca_sem_reuniao",
        label: "Nunca falar preço sem marcar reunião",
        hint: "Só informa valores após a agenda confirmada",
      },
      { id: "contexto", label: "Descobrir contexto antes", hint: "Entende o cenário e depois responde" },
      { id: "enviar", label: "Enviar imediatamente", hint: "Responde o valor de forma transparente" },
    ],
  },
  {
    id: "recusou",
    label: "Cliente recusou",
    hint: "O que fazer diante de um não.",
    options: [
      { id: "encerrar", label: "Encerrar", hint: "Agradece e finaliza a conversa na hora" },
      {
        id: "recuperar",
        label: "Tentar recuperar",
        hint: "Ainda nessa conversa, tenta um novo ângulo antes de aceitar o não",
      },
      {
        id: "followup",
        label: "Agendar follow-up",
        hint: "Aceita o não agora e volta a falar dias depois",
      },
    ],
  },
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

export type SdrFaqItem = {
  question: string;
  answer: string;
};

export type SdrSeller = {
  user_id: string | null;
  name: string;
  email: string;
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
    inbound: "always" | "first_only" | "after_flow" | "off";
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
    handoff_sellers: SdrSeller[];
  };
  knowledge: {
    company: string;
    niche: string;
    audience: string;
    products: string;
    products_list: SdrProduct[];
    faq: string;
    faq_list: SdrFaqItem[];
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
    notify_sellers: SdrSeller[];
    after_limit: "arquivar" | "mover_pipeline" | "criar_tarefa" | "avisar_vendedor";
    after_limit_actions: string[];
    after_limit_stage_id: string;
    meeting_duration_minutes: number;
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
    priorities: ["conexao", "necessidade", "valor", "objecoes", "fechamento"],
    insistence: "medio",
    return_to_goal: "natural",
    on_objection: "explorar",
    handoff_sellers: [],
  },
  knowledge: {
    company: "",
    niche: "",
    audience: "",
    products: "",
    products_list: [{ name: "", description: "", when_to_offer: "", price: "" }],
    faq: "",
    faq_list: [{ question: "", answer: "" }],
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
    notify_sellers: [],
    after_limit: "avisar_vendedor",
    after_limit_actions: ["arquivar"],
    after_limit_stage_id: "",
    meeting_duration_minutes: 60,
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

/** Rascunho local (retomado no card da lista) */
export const SDR_DRAFT_STORAGE_KEY = "wiize_sdr_draft_v1";

export type SdrStoredDraft = {
  draft: SdrDraft;
  step: number;
  updated_at: string;
};

export function loadSdrDraft(): SdrStoredDraft | null {
  try {
    const raw = localStorage.getItem(SDR_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.draft) return null;
    return parsed as SdrStoredDraft;
  } catch {
    return null;
  }
}

export function saveSdrDraft(draft: SdrDraft, step: number) {
  try {
    localStorage.setItem(
      SDR_DRAFT_STORAGE_KEY,
      JSON.stringify({ draft, step, updated_at: new Date().toISOString() })
    );
  } catch {
    /* storage indisponível */
  }
}

export function clearSdrDraft() {
  try {
    localStorage.removeItem(SDR_DRAFT_STORAGE_KEY);
  } catch {
    /* storage indisponível */
  }
}
