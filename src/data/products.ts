import {
  Search,
  Bot,
  CalendarClock,
  Sparkles,
  Workflow,
  FileSignature,
  type LucideIcon,
} from "lucide-react";

export type ProductVisualKey =
  | "prospeccao"
  | "sdr"
  | "agenda"
  | "engajamento"
  | "automacao"
  | "contratos";

/** Etapa da operação comercial na arquitetura Wiize */
export type ProductStage = "Capte" | "Converta" | "Gerencie" | "Otimize";

export interface ProductStep {
  title: string;
  description: string;
  /** Linhas curtas exibidas no mockup do passo */
  preview: string[];
}

export interface ProductFeature {
  eyebrow: string;
  title: string;
  /** Trecho do título que recebe destaque visual (deve estar contido em title) */
  titleHighlight?: string;
  description: string;
  bullets: string[];
  /** inverte o lado do mockup */
  reverse?: boolean;
  metrics?: { label: string; value: string }[];
}

export interface ProductConfig {
  slug: string;
  key: ProductVisualKey;
  /** Eyebrow do hero: etapa da operação (CAPTE, CONVERTA, GERENCIE, OTIMIZE) */
  category: string;
  stage: ProductStage;
  name: string;
  shortDescription: string;
  /** Frase curta usada nos cards de produtos relacionados */
  cardTagline: string;
  /** Descrição mais completa usada nos cards de outros produtos */
  cardDescription?: string;
  icon: LucideIcon;
  heroTitle: string;
  heroHighlight: string;
  heroDescription: string;
  seoTitle: string;
  seoDescription: string;
  keywords: string;
  howItWorksTitle: string;
  /** Trecho do título "Como funciona" que recebe destaque visual (deve estar contido em howItWorksTitle) */
  howItWorksHighlight?: string;
  howItWorks: ProductStep[];
  features: ProductFeature[];
  proof: { label: string; value: string; hint: string }[];
}

export const PRODUCTS: ProductConfig[] = [
  {
    slug: "prospeccao-inteligente",
    key: "prospeccao",
    category: "Capte",
    stage: "Capte",
    name: "Prospecção Inteligente",
    shortDescription: "Encontre empresas prontas para vender",
    cardTagline: "Encontre empresas prontas para vender",
    cardDescription:
      "Construa um pipeline contínuo: encontre empresas com o perfil do seu cliente ideal, organize as oportunidades e concentre o esforço do time em quem realmente merece atenção.",
    icon: Search,
    heroTitle: "Encontre as empresas",
    heroHighlight: "certas para vender",
    heroDescription:
      "Transforme a busca por novos clientes em um processo comercial inteligente. Encontre empresas com potencial, organize oportunidades e dê à sua equipe uma lista de leads pronta para trabalhar.",
    seoTitle: "Prospecção B2B: encontre as empresas certas",
    seoDescription:
      "Transforme a busca por clientes em um processo comercial. Encontre empresas com o perfil do seu ICP, organize oportunidades e priorize onde vale investir tempo.",
    keywords:
      "prospecção B2B, pipeline comercial, ICP, geração de oportunidades, inteligência comercial, dados de empresas",
    howItWorksTitle: "De uma busca manual a um processo comercial inteligente",
    howItWorksHighlight: "processo comercial inteligente",
    howItWorks: [
      {
        title: "Defina quem você quer encontrar",
        description:
          "Encontre empresas com o perfil que faz sentido para sua operação comercial: nicho, região, porte e os critérios que definem o seu cliente ideal.",
        preview: ["Nicho: agências de marketing", "Região: São Paulo, SP", "Porte: 5 a 50 colaboradores"],
      },
      {
        title: "Descubra novas oportunidades",
        description:
          "A Wiize transforma dados de empresas em oportunidades organizadas para sua equipe, com contexto suficiente para iniciar uma conversa relevante.",
        preview: ["Contexto do negócio mapeado", "Contato do responsável", "Oportunidade organizada"],
      },
      {
        title: "Priorize onde vale investir tempo",
        description:
          "Use inteligência e dados para concentrar o esforço comercial nas oportunidades mais relevantes — e deixar de tratar todos os leads como iguais.",
        preview: ["Prioridade: alta", "Fit com seu ICP", "Pronto para abordar"],
      },
    ],
    features: [
      {
        eyebrow: "Pipeline",
        title: "Pare de gastar horas procurando quem pode comprar de você",
        description:
          "Prospectar deixa de ser uma tarefa manual e passa a ser um processo que se repete toda semana. Sua equipe começa o dia com oportunidades para trabalhar, não com uma planilha em branco.",
        bullets: [
          "Novas oportunidades sempre que a operação precisar",
          "Menos tempo pesquisando, mais tempo conversando",
          "Um pipeline que não depende da iniciativa de cada vendedor",
        ],
        metrics: [
          { label: "Origem das oportunidades", value: "processo" },
          { label: "Trabalho manual", value: "reduzido" },
        ],
      },
      {
        eyebrow: "Priorização",
        title: "Saiba onde a sua equipe deve começar",
        description:
          "Nem toda empresa encontrada merece o mesmo esforço. A inteligência da Wiize organiza a fila por aderência ao seu perfil de cliente e por sinais observados no mercado.",
        bullets: [
          "Ordenação por potencial e fit com o seu ICP",
          "Aprendizado com os negócios que você já ganhou",
          "Oportunidades relevantes em destaque no cockpit",
        ],
        reverse: true,
      },
      {
        eyebrow: "Contexto",
        title: "Comece a conversa sabendo com quem está falando",
        description:
          "Cada oportunidade chega com contexto do negócio e uma sugestão de abordagem específica. A primeira mensagem deixa de ser um template e passa a ser uma conversa.",
        bullets: [
          "Contexto do negócio antes do primeiro contato",
          "Sugestão de abordagem no tom da sua empresa",
          "Oportunidades organizadas direto no CRM",
        ],
      },
    ],
    proof: [
      { label: "Construção do pipeline", value: "contínua", hint: "sem depender de listas compradas" },
      { label: "Foco da equipe", value: "priorizado", hint: "esforço onde há mais potencial" },
      { label: "Da busca ao CRM", value: "um processo", hint: "sem planilhas paralelas" },
    ],
  },
  {
    slug: "sdr-inteligente",
    key: "sdr",
    category: "Converta",
    stage: "Converta",
    name: "SDR Inteligente",
    shortDescription: "Transforme conversas em oportunidades",
    cardTagline: "Transforme conversas em oportunidades",
    cardDescription:
      "Um SDR digital integrado ao seu processo comercial: conduz a conversa, entende o contexto do lead, qualifica o interesse e ajuda a equipe a avançar até a reunião.",
    icon: Bot,
    heroTitle: "Transforme conversas",
    heroHighlight: "em oportunidades comerciais",
    heroDescription:
      "O SDR Inteligente conduz conversas, entende o contexto de cada lead, identifica oportunidades e ajuda sua equipe a avançar até a reunião — sem transformar o processo comercial em uma sequência de mensagens genéricas.",
    seoTitle: "SDR Inteligente: conversas que viram oportunidades",
    seoDescription:
      "Um SDR digital integrado ao processo comercial: conduz conversas, entende o contexto do lead, qualifica o interesse e apoia a equipe até a reunião.",
    keywords:
      "SDR digital, qualificação de leads, pré-vendas B2B, atendimento comercial, conversas comerciais",
    howItWorksTitle: "Da primeira conversa à oportunidade qualificada",
    howItWorksHighlight: "oportunidade qualificada",
    howItWorks: [
      {
        title: "Inicie a conversa",
        description:
          "O lead entra em contato ou é abordado dentro do processo comercial, e a conversa começa sem depender de alguém estar disponível naquele momento.",
        preview: ["Nova conversa recebida", "Resposta em segundos", "Nome e empresa identificados"],
      },
      {
        title: "Entenda o contexto",
        description:
          "O SDR utiliza inteligência para interpretar a conversa e identificar intenção, necessidades e momento de compra — falando com quem realmente decide.",
        preview: ["Necessidade identificada", "Responsável pela decisão", "Etapa do funil atualizada"],
      },
      {
        title: "Avance a oportunidade",
        description:
          "Quando existe potencial real, a conversa pode evoluir para qualificação, follow-up e agendamento. Quando o caso pede atenção humana, o time assume.",
        preview: ["Oportunidade qualificada", "Follow-up programado", "Reunião sugerida"],
      },
    ],
    features: [
      {
        eyebrow: "Continuidade",
        title: "Nenhuma conversa fica sem resposta",
        description:
          "Leads que chegam à noite, no fim de semana ou em um pico de mensagens continuam sendo atendidos. A equipe deixa de perder oportunidades por indisponibilidade.",
        bullets: [
          "Atendimento contínuo no WhatsApp oficial",
          "Objetivo comercial definido por você",
          "Passagem para uma pessoa no momento certo",
        ],
        metrics: [
          { label: "Conversas simultâneas", value: "sem fila" },
          { label: "Disponibilidade", value: "contínua" },
        ],
      },
      {
        eyebrow: "Follow-up",
        title: "Oportunidades não esfriam por esquecimento",
        description:
          "O acompanhamento deixa de depender da memória do vendedor. Quem parou de responder volta para a conversa com contexto, no tempo certo e sem repetição.",
        bullets: [
          "Retomada programada dentro do processo",
          "Mensagens sempre ligadas ao histórico",
          "Respeito total ao opt-out do contato",
        ],
        reverse: true,
      },
      {
        eyebrow: "Controle",
        title: "A equipe continua no comando",
        description:
          "O SDR apoia o time comercial, não substitui vendedores. Você acompanha cada conversa, assume o teclado quando quiser e mantém o histórico completo no CRM.",
        bullets: [
          "Status do atendimento visível em cada lead",
          "Pausa manual imediata",
          "Notas internas nunca chegam ao cliente",
        ],
      },
    ],
    proof: [
      { label: "Tempo de resposta", value: "imediato", hint: "sem depender de disponibilidade" },
      { label: "Qualificação", value: "com contexto", hint: "critérios do seu funil" },
      { label: "Histórico", value: "no CRM", hint: "tudo registrado automaticamente" },
    ],
  },
  {
    slug: "agenda-inteligente",
    key: "agenda",
    category: "Converta",
    stage: "Converta",
    name: "Agenda Inteligente",
    shortDescription: "Converta interesse em reuniões",
    cardTagline: "Converta interesse em reuniões",
    cardDescription:
      "Reduza o atrito entre interesse e reunião: horários sugeridos com base na disponibilidade real, confirmação clara e acompanhamento até o compromisso acontecer.",
    icon: CalendarClock,
    heroTitle: "Transforme interesse",
    heroHighlight: "em reuniões",
    heroDescription:
      "Quando um lead está pronto para conversar, não deixe o próximo passo depender de trocas intermináveis de mensagens. A Agenda Inteligente facilita o agendamento e conecta o interesse à reunião.",
    seoTitle: "Agenda Inteligente: do interesse à reunião",
    seoDescription:
      "Reduza o atrito entre interesse e reunião: sugestão de horários com disponibilidade real, confirmação clara de data e hora e acompanhamento até o compromisso.",
    keywords:
      "agendamento comercial, reuniões B2B, agenda de vendas, confirmação de reunião, Google Agenda",
    howItWorksTitle: "Do interesse ao compromisso confirmado",
    howItWorksHighlight: "compromisso confirmado",
    howItWorks: [
      {
        title: "Identifique o momento certo",
        description:
          "Reconheça quando a conversa chegou ao ponto de avançar, em vez de empurrar uma reunião antes de existir interesse real.",
        preview: ["Interesse confirmado", "Responsável definido", "Pronto para avançar"],
      },
      {
        title: "Encontre um horário",
        description:
          "Apresente possibilidades de agenda sem depender de troca manual de mensagens, considerando a disponibilidade real de cada pessoa do time.",
        preview: ["Terça às 11:30h", "Quinta às 14:30h", "Sem conflitos de agenda"],
      },
      {
        title: "Marque a reunião",
        description:
          "Transforme uma oportunidade qualificada em uma reunião confirmada, com data e hora claras e acompanhamento até o dia do encontro.",
        preview: ["Compromisso confirmado", "Lembrete automático", "Sincronizado com Google Agenda"],
      },
    ],
    features: [
      {
        eyebrow: "Menos atrito",
        title: "Reuniões deixam de se perder na negociação de horário",
        description:
          "O intervalo entre 'tenho interesse' e 'reunião marcada' é onde mais oportunidades esfriam. A Wiize encurta esse caminho com opções claras e disponibilidade real.",
        bullets: [
          "Sugestões em períodos e dias diferentes",
          "Confirmação sempre com data e hora completas",
          "Bloqueio automático de sobreposição",
        ],
        metrics: [
          { label: "Conflitos de agenda", value: "evitados" },
          { label: "Sincronização", value: "Google Agenda" },
        ],
      },
      {
        eyebrow: "Acompanhamento",
        title: "Nada se perde entre marcar e realizar",
        description:
          "Lembretes, status de atraso e reagendamento simples mantêm o compromisso vivo — e a operação sabe exatamente o que aconteceu com cada reunião.",
        bullets: [
          "Lembretes por e-mail com a sua identidade",
          "Status visual de atrasado e concluído",
          "Reagendamento sem perder o histórico",
        ],
        reverse: true,
      },
    ],
    proof: [
      { label: "Troca de mensagens", value: "reduzida", hint: "para marcar um horário" },
      { label: "Lembretes", value: "automáticos", hint: "antes de cada compromisso" },
      { label: "Integração", value: "Google Agenda", hint: "sincronização contínua" },
    ],
  },
  {
    slug: "ia-de-engajamento",
    key: "engajamento",
    category: "Otimize",
    stage: "Otimize",
    name: "IA de Engajamento",
    shortDescription: "Recupere oportunidades esquecidas",
    cardTagline: "Recupere oportunidades esquecidas",
    cardDescription:
      "Você já tem oportunidades — talvez só não esteja enxergando. Analise o histórico das conversas, identifique sinais de interesse e saiba quais merecem uma nova abordagem.",
    icon: Sparkles,
    heroTitle: "Descubra quais conversas",
    heroHighlight: "ainda podem virar negócio",
    heroDescription:
      "Nem todo lead que parou de responder está perdido. Analise o histórico das conversas, identifique sinais de interesse e descubra quais oportunidades merecem uma nova abordagem.",
    seoTitle: "IA de Engajamento: oportunidades que ainda podem virar negócio",
    seoDescription:
      "Analise o histórico das conversas comerciais, identifique sinais de interesse e priorize as oportunidades que merecem uma nova abordagem.",
    keywords:
      "reativação de oportunidades, engajamento comercial, follow-up inteligente, análise de conversas, base de leads",
    howItWorksTitle: "Você já tem oportunidades. Talvez só não esteja enxergando.",
    howItWorksHighlight: "oportunidades",
    howItWorks: [
      {
        title: "Analise suas conversas",
        description:
          "A inteligência interpreta o contexto das interações comerciais: o que foi dito, qual objeção apareceu e há quanto tempo a conversa parou.",
        preview: ["Conversas analisadas", "Objeções mapeadas", "Contexto recuperado"],
      },
      {
        title: "Identifique sinais de oportunidade",
        description:
          "Encontre padrões de interesse, intenção e engajamento que passam despercebidos no dia a dia de uma operação comercial cheia de conversas.",
        preview: ["Sinais de interesse", "Motivo da parada", "Melhor canal de retomada"],
      },
      {
        title: "Saiba onde agir",
        description:
          "Priorize as conversas que apresentam maior potencial de reativação, em vez de disparar a mesma mensagem para toda a base.",
        preview: ["Prioridade definida", "Abordagem contextual", "Oportunidade de volta ao funil"],
      },
    ],
    features: [
      {
        eyebrow: "Inteligência",
        title: "Interesse que não aparece em uma planilha",
        description:
          "Boa parte da receita possível de uma empresa já passou pelo seu WhatsApp. A Wiize organiza esse histórico por temperatura, motivo de parada e potencial de retomada.",
        bullets: [
          "Classificação das conversas por intenção",
          "Motivos de perda identificados",
          "Base revisitada de forma contínua",
        ],
        metrics: [
          { label: "Base analisada", value: "completa" },
          { label: "Retomada", value: "priorizada" },
        ],
      },
      {
        eyebrow: "Relacionamento",
        title: "Reativar sem parecer disparo em massa",
        description:
          "Cada retomada parte do contexto real da última conversa, com variação de abordagem, ritmo respeitoso e saída fácil para quem não quer mais ser contatado.",
        bullets: [
          "Mensagens ligadas ao histórico do lead",
          "Descadastro em um clique",
          "Conformidade com a LGPD",
        ],
        reverse: true,
      },
    ],
    proof: [
      { label: "Base trabalhada", value: "por inteiro", hint: "nenhuma conversa esquecida" },
      { label: "Retomadas", value: "contextuais", hint: "sem disparo em massa" },
      { label: "Opt-out", value: "respeitado", hint: "confirmação em duas etapas" },
    ],
  },
  {
    slug: "automacao-comercial",
    key: "automacao",
    category: "Otimize",
    stage: "Otimize",
    name: "Automação Comercial",
    shortDescription: "Automatize processos comerciais",
    cardTagline: "Automatize processos comerciais",
    cardDescription:
      "Automatizar não é tirar pessoas do processo. É tirar tarefas desnecessárias das pessoas — follow-ups, mensagens e etapas repetitivas rodando sem perder o contexto.",
    icon: Workflow,
    heroTitle: "Automatize o trabalho",
    heroHighlight: "que não precisa ser manual",
    heroDescription:
      "Transforme processos comerciais repetitivos em fluxos que trabalham continuamente. Automatize follow-ups, tarefas e interações em diferentes canais sem perder o contexto da operação.",
    seoTitle: "Automação Comercial: menos trabalho manual, mais processo",
    seoDescription:
      "Transforme tarefas comerciais repetitivas em fluxos contínuos: follow-ups, mensagens e etapas automatizadas em diferentes canais, sem perder o contexto.",
    keywords:
      "automação comercial, fluxos de vendas, follow-up automático, processos comerciais, WhatsApp e Instagram",
    howItWorksTitle: "Como um processo repetitivo vira um fluxo que trabalha por você",
    howItWorks: [
      {
        title: "Defina o processo",
        description:
          "Escolha o momento e as condições que iniciam uma ação: uma mensagem recebida, uma mudança de etapa no CRM ou um horário programado.",
        preview: ["Gatilho definido", "Canal: WhatsApp ou Instagram", "Condições configuradas"],
      },
      {
        title: "Deixe o fluxo trabalhar",
        description:
          "Automatize tarefas, mensagens e etapas repetitivas da operação, mantendo o contexto de cada conversa e o registro no CRM.",
        preview: ["Etapas conectadas", "Mensagens no tempo certo", "CRM atualizado"],
      },
      {
        title: "Mantenha o controle",
        description:
          "Acompanhe o que está acontecendo, veja o que está funcionando e intervenha quando a equipe precisar assumir a conversa.",
        preview: ["Resultados por etapa", "Taxa de resposta", "Intervenção humana quando necessário"],
      },
    ],
    features: [
      {
        eyebrow: "Eficiência",
        title: "Automatizar é tirar tarefas desnecessárias das pessoas",
        description:
          "Sua equipe não precisa lembrar de cada follow-up, atualizar cada card e repetir a mesma mensagem dezenas de vezes. Isso é trabalho de processo, não de vendedor.",
        bullets: [
          "Tarefas repetitivas fora da rotina do time",
          "Menos dependência da memória do vendedor",
          "Mais tempo para conversas que exigem gente",
        ],
        metrics: [
          { label: "Canais", value: "WhatsApp + Instagram" },
          { label: "Operação", value: "contínua" },
        ],
      },
      {
        eyebrow: "Conexão",
        title: "Integrado ao resto da sua operação",
        description:
          "Os fluxos conversam com o CRM, a agenda, o e-mail e as planilhas que sua empresa já usa. A automação faz parte da operação, não é um sistema à parte.",
        bullets: [
          "Ações no CRM e transferência para humano",
          "Google Sheets, Calendar e Gmail",
          "APIs oficiais da Meta e limites de segurança",
        ],
        reverse: true,
      },
    ],
    proof: [
      { label: "Trabalho repetitivo", value: "reduzido", hint: "sem tirar pessoas do processo" },
      { label: "Comparação de abordagens", value: "nativa", hint: "teste variações no mesmo fluxo" },
      { label: "Conformidade", value: "canais oficiais", hint: "sem automações não autorizadas" },
    ],
  },
  {
    slug: "gestao-de-contratos",
    key: "contratos",
    category: "Gerencie",
    stage: "Gerencie",
    name: "Gestão de Contratos",
    shortDescription: "Proteja renovações e receitas",
    cardTagline: "Proteja renovações e receitas",
    cardDescription:
      "Contratos organizados, vencimentos visíveis e renovações acompanhadas como processo — para que nenhuma receita dependa da memória de alguém do time.",
    icon: FileSignature,
    heroTitle: "Não deixe contratos e receitas",
    heroHighlight: "dependerem da memória",
    heroDescription:
      "Organize contratos, acompanhe vencimentos e renovações e mantenha sua operação comercial preparada para agir antes que uma oportunidade de receita seja perdida.",
    seoTitle: "Gestão de Contratos: renovações e receita sob controle",
    seoDescription:
      "Centralize contratos, antecipe vencimentos e transforme renovação em processo acompanhável, protegendo a receita já conquistada.",
    keywords:
      "gestão de contratos, renovação de contratos, receita recorrente, retenção B2B, previsibilidade comercial",
    howItWorksTitle: "Do fechamento à renovação, sem depender de lembrete",
    howItWorks: [
      {
        title: "Centralize seus contratos",
        description:
          "Tenha informações importantes organizadas em um único lugar: valor, vigência, responsável e histórico do cliente — sem planilha paralela.",
        preview: ["Contrato registrado", "Vigência definida", "Responsável atribuído"],
      },
      {
        title: "Antecipe vencimentos",
        description:
          "Saiba quais contratos precisam de atenção antes que o prazo chegue e organize a conversa de renovação com tempo para agir.",
        preview: ["Status: vencendo", "Aviso ao responsável", "Conversa programada"],
      },
      {
        title: "Proteja oportunidades de receita",
        description:
          "Transforme renovação e relacionamento em processos acompanháveis, com visibilidade do que está em risco em cada período.",
        preview: ["Renovação registrada", "Histórico preservado", "Previsão de receita atualizada"],
      },
    ],
    features: [
      {
        eyebrow: "Visibilidade",
        title: "Saiba o que vence antes que vença",
        description:
          "Perder um cliente por falta de acompanhamento custa mais caro do que conquistar um novo. A Wiize mostra contratos ativos, vencendo e vencidos e o valor em risco em cada mês.",
        bullets: [
          "Status ativo, vencendo e vencido",
          "Valor em risco por período",
          "Filtro por responsável e cliente",
        ],
        metrics: [
          { label: "Aviso antecipado", value: "configurável" },
          { label: "Visão de receita", value: "por período" },
        ],
      },
      {
        eyebrow: "Retenção",
        title: "Renovar vira processo, não sorte",
        description:
          "Avisos, comunicação padronizada e renovação em poucos cliques transformam retenção em rotina previsível — e mantêm a previsão de receita confiável.",
        bullets: [
          "E-mails de renovação com a sua identidade",
          "Renovação direto no card do contrato",
          "Histórico completo de cada renovação",
        ],
        reverse: true,
      },
    ],
    proof: [
      { label: "Renovação", value: "acompanhada", hint: "sem depender de lembrete pessoal" },
      { label: "Receita em risco", value: "visível", hint: "antes do vencimento" },
      { label: "Previsão de receita", value: "atualizada", hint: "no cockpit de crescimento" },
    ],
  },
];

export const getProductBySlug = (slug?: string) =>
  PRODUCTS.find((p) => p.slug === slug);

export const getRelatedProducts = (slug: string) =>
  PRODUCTS.filter((p) => p.slug !== slug);
