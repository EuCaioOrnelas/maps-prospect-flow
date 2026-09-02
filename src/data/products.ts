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
    shortDescription: "Encontre oportunidades com diagnóstico de IA",
    cardTagline: "Encontre oportunidades com diagnóstico de IA",
    cardDescription:
      "A IA analisa concorrência regional, demanda, redes sociais e sites das empresas, diagnostica dores e necessidades, monta a oferta certa e cria uma abordagem personalizada para cada lead.",
    icon: Search,
    heroTitle: "Encontre oportunidades",
    heroHighlight: "com diagnóstico de IA",
    heroDescription:
      "A IA da Wiize analisa concorrência regional, demanda do mercado, redes sociais e sites das empresas, identifica dores e necessidades reais, sugere soluções, monta a oferta e escreve uma abordagem personalizada para cada lead.",
    seoTitle: "Prospecção com IA: oportunidades com diagnóstico pronto",
    seoDescription:
      "A IA analisa concorrência regional, demanda, redes sociais e sites, diagnostica dores e necessidades, monta a oferta e cria a abordagem personalizada para cada lead.",
    keywords:
      "prospecção com IA, diagnóstico comercial, análise de concorrência, oportunidades B2B, ICP, abordagem personalizada",
    howItWorksTitle: "De uma busca manual a um diagnóstico comercial inteligente",
    howItWorksHighlight: "diagnóstico comercial inteligente",
    howItWorks: [
      {
        title: "Defina quem você quer encontrar",
        description:
          "Escolha nicho, região, porte e os critérios do seu cliente ideal. A Wiize passa a procurar empresas com esse perfil sempre que a operação precisar.",
        preview: ["Nicho: agências de marketing", "Região: São Paulo, SP", "Porte: 5 a 50 colaboradores"],
      },
      {
        title: "A IA analisa cada empresa",
        description:
          "Site, redes sociais, presença digital, demanda da região e concorrência local entram na análise para revelar o que está funcionando e o que está faltando naquele negócio.",
        preview: ["Site e redes analisados", "Concorrência regional mapeada", "Demanda da região avaliada"],
      },
      {
        title: "Receba o diagnóstico e a abordagem",
        description:
          "Cada oportunidade chega com dores identificadas, soluções sugeridas, oferta montada e uma primeira mensagem escrita para aquele lead específico.",
        preview: ["Dores e necessidades", "Oferta sugerida", "Abordagem personalizada pronta"],
      },
    ],
    features: [
      {
        eyebrow: "Pipeline",
        title: "Pare de gastar horas procurando quem pode comprar de você",
        titleHighlight: "quem pode comprar de você",
        description:
          "Prospectar deixa de ser uma tarefa manual e passa a ser um processo que se repete toda semana. Sua equipe começa o dia com oportunidades analisadas, não com uma planilha em branco.",
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
        eyebrow: "Diagnóstico",
        title: "A IA entende o negócio antes de você falar com ele",
        titleHighlight: "antes de você falar com ele",
        description:
          "A inteligência cruza presença digital, concorrência da região e sinais de demanda para apontar as dores mais prováveis de cada empresa e as soluções que fazem sentido oferecer.",
        bullets: [
          "Análise de site, redes sociais e reputação local",
          "Comparação com a concorrência da mesma região",
          "Dores, necessidades e soluções sugeridas",
        ],
        reverse: true,
      },
      {
        eyebrow: "Abordagem",
        title: "Comece a conversa com uma oferta feita para aquele lead",
        titleHighlight: "uma oferta feita para aquele lead",
        description:
          "Com o diagnóstico pronto, a IA monta a oferta e escreve a primeira mensagem no tom da sua empresa. A abordagem deixa de ser template e passa a ser conversa.",
        bullets: [
          "Oferta montada a partir do diagnóstico",
          "Mensagem personalizada por lead",
          "Oportunidades organizadas direto no CRM",
        ],
      },
    ],
    proof: [
      { label: "Análise por empresa", value: "com IA", hint: "site, redes, demanda e concorrência" },
      { label: "Diagnóstico", value: "automático", hint: "dores, necessidades e soluções" },
      { label: "Abordagem", value: "personalizada", hint: "uma mensagem para cada lead" },
    ],
  },
  {
    slug: "sdr-inteligente",
    key: "sdr",
    category: "Converta",
    stage: "Converta",
    name: "SDR Inteligente",
    shortDescription: "Um SDR autônomo que conversa, qualifica e agenda",
    cardTagline: "Um SDR autônomo que conversa, qualifica e agenda",
    cardDescription:
      "Um SDR autônomo de verdade: atende, conversa, compreende o contexto, diagnostica a necessidade, qualifica, vende e agenda reuniões pela Agenda Inteligente — sozinho, o dia inteiro.",
    icon: Bot,
    heroTitle: "Um SDR autônomo que",
    heroHighlight: "atende, qualifica e agenda",
    heroDescription:
      "O SDR Inteligente conversa como gente: compreende o que o lead diz, entende o momento dele, diagnostica a necessidade, apresenta a solução, contorna objeções e agenda a reunião pela Agenda Inteligente — sem precisar de alguém disponível.",
    seoTitle: "SDR Inteligente: SDR autônomo que atende, qualifica e agenda",
    seoDescription:
      "Um SDR autônomo que conversa, compreende, diagnostica, qualifica, vende e agenda reuniões automaticamente pela Agenda Inteligente, com histórico completo no CRM.",
    keywords:
      "SDR autônomo, SDR com IA, qualificação de leads, pré-vendas B2B, agendamento automático, atendimento no WhatsApp",
    howItWorksTitle: "Da primeira mensagem à reunião agendada sozinho",
    howItWorksHighlight: "reunião agendada sozinho",
    howItWorks: [
      {
        title: "Atende e conversa",
        description:
          "O lead chega pelo WhatsApp e é atendido na hora, com linguagem natural e o tom da sua empresa — de dia, de madrugada ou em pico de mensagens.",
        preview: ["Resposta imediata", "Conversa natural", "Nome e empresa identificados"],
      },
      {
        title: "Compreende e diagnostica",
        description:
          "Interpreta o que foi dito, faz as perguntas certas, entende a dor, o orçamento e a urgência, e qualifica o lead pelos critérios do seu funil.",
        preview: ["Necessidade diagnosticada", "Decisor identificado", "Lead qualificado no CRM"],
      },
      {
        title: "Vende e agenda a reunião",
        description:
          "Apresenta a solução, responde objeções e, quando o lead está pronto, agenda a reunião pela Agenda Inteligente respeitando a disponibilidade real do time.",
        preview: ["Proposta apresentada", "Objeções respondidas", "Reunião agendada na agenda"],
      },
    ],
    features: [
      {
        eyebrow: "Autonomia",
        title: "Ele conduz a conversa do início ao fim",
        titleHighlight: "do início ao fim",
        description:
          "Não é um robô de respostas prontas. O SDR entende o contexto, sustenta a conversa, apresenta a oferta, contorna objeções e leva o lead até o próximo passo sozinho.",
        bullets: [
          "Atendimento contínuo no WhatsApp oficial",
          "Diagnóstico e qualificação em conversa natural",
          "Vende, atende e responde dúvidas do seu produto",
        ],
        metrics: [
          { label: "Conversas simultâneas", value: "sem fila" },
          { label: "Disponibilidade", value: "contínua" },
        ],
      },
      {
        eyebrow: "Agendamento",
        title: "Reuniões marcadas direto na Agenda Inteligente",
        titleHighlight: "direto na Agenda Inteligente",
        description:
          "Quando o lead está pronto, o SDR consulta a disponibilidade real do time, oferece horários e confirma o compromisso — sem troca de mensagens com o vendedor.",
        bullets: [
          "Horários com base na agenda de cada pessoa",
          "Confirmação com data e hora completas",
          "Lembretes automáticos para você e para o lead",
        ],
        reverse: true,
      },
      {
        eyebrow: "Controle",
        title: "A equipe continua no comando",
        titleHighlight: "no comando",
        description:
          "O SDR trabalha sozinho, mas você acompanha cada conversa, assume o teclado quando quiser e mantém todo o histórico registrado no CRM.",
        bullets: [
          "Status do atendimento visível em cada lead",
          "Pausa manual imediata",
          "Notas internas nunca chegam ao cliente",
        ],
      },
    ],
    proof: [
      { label: "Atendimento", value: "autônomo", hint: "conversa, diagnostica e qualifica" },
      { label: "Reuniões", value: "agendadas", hint: "direto na Agenda Inteligente" },
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
        titleHighlight: "na negociação de horário",
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
        titleHighlight: "entre marcar e realizar",
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
        titleHighlight: "não aparece em uma planilha",
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
        titleHighlight: "sem parecer disparo em massa",
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
      "automação comercial, fluxos de vendas, follow-up automático, processos comerciais, WhatsApp oficial",
    howItWorksTitle: "Como um processo repetitivo vira um fluxo que trabalha por você",
    howItWorksHighlight: "fluxo que trabalha por você",
    howItWorks: [
      {
        title: "Defina o processo",
        description:
          "Escolha o momento e as condições que iniciam uma ação: uma mensagem recebida, uma mudança de etapa no CRM ou um horário programado.",
        preview: ["Gatilho definido", "Canal: WhatsApp oficial", "Condições configuradas"],
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
        titleHighlight: "tirar tarefas desnecessárias das pessoas",
        description:
          "Sua equipe não precisa lembrar de cada follow-up, atualizar cada card e repetir a mesma mensagem dezenas de vezes. Isso é trabalho de processo, não de vendedor.",
        bullets: [
          "Tarefas repetitivas fora da rotina do time",
          "Menos dependência da memória do vendedor",
          "Mais tempo para conversas que exigem gente",
        ],
        metrics: [
          { label: "Canais", value: "WhatsApp oficial" },
          { label: "Operação", value: "contínua" },
        ],
      },
      {
        eyebrow: "Conexão",
        title: "Integrado ao resto da sua operação",
        titleHighlight: "ao resto da sua operação",
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
    howItWorksHighlight: "renovação",
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
        titleHighlight: "antes que vença",
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
        titleHighlight: "processo, não sorte",
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
