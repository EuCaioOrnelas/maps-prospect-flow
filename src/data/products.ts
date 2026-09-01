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

export interface ProductStep {
  title: string;
  description: string;
  /** Linhas curtas exibidas no mockup do passo */
  preview: string[];
}

export interface ProductFeature {
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
  /** inverte o lado do mockup */
  reverse?: boolean;
  metrics?: { label: string; value: string }[];
}

export interface ProductConfig {
  slug: string;
  key: ProductVisualKey;
  category: string;
  name: string;
  shortDescription: string;
  icon: LucideIcon;
  heroTitle: string;
  heroHighlight: string;
  heroDescription: string;
  seoTitle: string;
  seoDescription: string;
  keywords: string;
  howItWorksTitle: string;
  howItWorks: ProductStep[];
  features: ProductFeature[];
  proof: { label: string; value: string; hint: string }[];
}

export const PRODUCTS: ProductConfig[] = [
  {
    slug: "prospeccao-inteligente",
    key: "prospeccao",
    category: "Prospecção",
    name: "Prospecção Inteligente",
    shortDescription: "Encontre empresas prontas para comprar",
    icon: Search,
    heroTitle: "Pare de garimpar listas.",
    heroHighlight: "Encontre quem já quer comprar.",
    heroDescription:
      "A Wiize pesquisa empresas do seu nicho, cruza sinais públicos de intenção e entrega uma fila de oportunidades qualificadas — com dados de contato validados e abordagem pronta para enviar.",
    seoTitle: "Prospecção Inteligente B2B com IA",
    seoDescription:
      "Encontre empresas prontas para comprar: busca por nicho e região, score de 0 a 1000 com inteligência comercial e abordagem personalizada gerada por IA.",
    keywords:
      "prospecção B2B, geração de leads, inteligência comercial, dados de empresas, ICP, lead scoring",
    howItWorksTitle: "Da busca à primeira conversa",
    howItWorks: [
      {
        title: "Defina seu perfil de cliente ideal",
        description:
          "Escolha nicho, região e critérios do seu mercado. A Wiize entende o seu ICP e passa a procurar apenas empresas com esse perfil.",
        preview: ["Nicho: clínicas odontológicas", "Região: São Paulo, SP", "Porte: 5 a 50 colaboradores"],
      },
      {
        title: "A IA pesquisa e qualifica",
        description:
          "Coletamos sinais públicos — presença digital, avaliações, site, redes e canais de contato — e transformamos tudo em um diagnóstico comparável.",
        preview: ["Presença digital: forte", "Decisor identificado: sim", "Score: 847/1000"],
      },
      {
        title: "Você recebe oportunidades prontas",
        description:
          "Cada empresa chega com telefone validado, diagnóstico e uma abordagem personalizada — pronta para virar conversa no mesmo dia.",
        preview: ["3 empresas prontas para abordar", "Abordagem gerada por IA", "Importação direta no CRM"],
      },
    ],
    features: [
      {
        eyebrow: "Descoberta",
        title: "Encontre empresas com potencial real",
        description:
          "Em vez de comprar listas frias, a Wiize descobre empresas ativas no seu mercado e organiza tudo o que você precisa para iniciar uma abordagem comercial.",
        bullets: [
          "Busca automática por nicho, região e porte",
          "Telefones validados com DDI e DDD",
          "Deduplicação contra o que já existe no seu CRM",
        ],
        metrics: [
          { label: "Empresas por busca", value: "até 60" },
          { label: "Dados validados", value: "100%" },
        ],
      },
      {
        eyebrow: "Priorização",
        title: "Saiba quem merece sua atenção primeiro",
        description:
          "O score de 0 a 1000 combina sinais de intenção, fit com o seu ICP e histórico de negócios ganhos para ordenar a fila do time comercial.",
        bullets: [
          "Score adaptado ao seu nicho",
          "Aprendizado com negócios já fechados",
          "Radar de oportunidades quentes no cockpit",
        ],
        reverse: true,
      },
      {
        eyebrow: "Abordagem",
        title: "A primeira mensagem já sai personalizada",
        description:
          "A IA lê o diagnóstico da empresa e escreve uma abordagem específica — sem template genérico, sem copiar e colar.",
        bullets: [
          "Abordagem gerada automaticamente ao buscar",
          "Tom de voz da sua empresa",
          "Envio direto pelo WhatsApp conectado",
        ],
      },
    ],
    proof: [
      { label: "Tempo por lista", value: "minutos", hint: "no lugar de dias de pesquisa manual" },
      { label: "Critérios avaliados", value: "20+", hint: "sinais comerciais por empresa" },
      { label: "Pronto para o CRM", value: "1 clique", hint: "oportunidades já organizadas" },
    ],
  },
  {
    slug: "sdr-inteligente",
    key: "sdr",
    category: "SDR com IA",
    name: "SDR Inteligente",
    shortDescription: "IA que qualifica e agenda no WhatsApp",
    icon: Bot,
    heroTitle: "Um SDR que responde sempre.",
    heroHighlight: "Qualifica e agenda por você.",
    heroDescription:
      "O SDR Inteligente atende no WhatsApp em segundos, entende o contexto do lead, qualifica com as perguntas certas e marca a reunião direto na sua agenda — 24 horas por dia.",
    seoTitle: "SDR Inteligente: IA que qualifica no WhatsApp",
    seoDescription:
      "IA comercial que atende no WhatsApp, qualifica leads, faz follow-up e agenda reuniões automaticamente, com transferência para humano no momento certo.",
    keywords: "SDR com IA, qualificação de leads, WhatsApp automação, agente de IA comercial",
    howItWorksTitle: "Do primeiro oi à reunião marcada",
    howItWorks: [
      {
        title: "O lead chama no WhatsApp",
        description:
          "A IA responde em segundos, coleta o nome e busca falar com o dono ou responsável pela decisão.",
        preview: ["Lead: quero saber mais", "IA respondendo em 4s", "Nome e empresa coletados"],
      },
      {
        title: "A IA qualifica com contexto",
        description:
          "Ela consulta o diagnóstico do lead, entende dor, urgência e orçamento e move o card no CRM conforme a conversa evolui.",
        preview: ["Dor identificada", "Estágio CRM: qualificado", "Follow-up programado"],
      },
      {
        title: "A reunião entra na agenda",
        description:
          "A IA sugere horários reais, confirma data e hora de forma clara e cria o compromisso já sincronizado.",
        preview: ["Terça, 12/03 às 14:30h", "Compromisso criado", "Lembrete automático"],
      },
    ],
    features: [
      {
        eyebrow: "Atendimento",
        title: "Resposta imediata, todos os dias",
        description:
          "Nenhum lead fica sem resposta à noite, no fim de semana ou durante um pico de mensagens. A IA assume e mantém o tom da sua empresa.",
        bullets: [
          "Atendimento 24/7 no WhatsApp oficial",
          "Objetivos configuráveis por agente",
          "Transferência para humano no momento certo",
        ],
        metrics: [
          { label: "Tempo de resposta", value: "< 10s" },
          { label: "Disponibilidade", value: "24/7" },
        ],
      },
      {
        eyebrow: "Follow-up",
        title: "Ninguém esfria por esquecimento",
        description:
          "Ciclos de follow-up inteligentes reativam quem parou de responder, com mensagens sempre contextuais e respeitando opt-out.",
        bullets: [
          "Cadência automática de retomada",
          "Mensagens nunca repetidas",
          "Pausa automática em campanhas ativas",
        ],
        reverse: true,
      },
      {
        eyebrow: "Governança",
        title: "Você continua no controle",
        description:
          "Acompanhe cada conversa, veja quando a IA está atendendo, assuma o teclado quando quiser e mantenha o histórico completo no CRM.",
        bullets: [
          "Indicador de status do SDR em cada lead",
          "Pausa manual instantânea",
          "Notas internas nunca vão para o cliente",
        ],
      },
    ],
    proof: [
      { label: "Conversas simultâneas", value: "ilimitadas", hint: "sem fila de espera" },
      { label: "Qualificação", value: "automática", hint: "com critérios do seu funil" },
      { label: "Agendamento", value: "nativo", hint: "direto na Agenda Wiize" },
    ],
  },
  {
    slug: "agenda-inteligente",
    key: "agenda",
    category: "Agenda",
    name: "Agenda Inteligente",
    shortDescription: "Reuniões marcadas sem esforço manual",
    icon: CalendarClock,
    heroTitle: "Menos idas e vindas.",
    heroHighlight: "Mais reuniões confirmadas.",
    heroDescription:
      "Horários sugeridos com inteligência, confirmação clara de data e hora, lembretes automáticos e sincronização com o Google Agenda — o interesse do lead vira compromisso sem trabalho manual.",
    seoTitle: "Agenda Inteligente para times comerciais",
    seoDescription:
      "Agende reuniões automaticamente: sugestão de horários por período, lembretes, status de atraso e sincronização com o Google Agenda.",
    keywords: "agendamento automático, agenda comercial, reuniões B2B, Google Agenda integração",
    howItWorksTitle: "Do interesse ao compromisso confirmado",
    howItWorks: [
      {
        title: "A disponibilidade é lida em tempo real",
        description:
          "A Wiize considera a agenda de cada responsável, períodos preferidos e conflitos antes de sugerir qualquer horário.",
        preview: ["Manhã: 2 janelas livres", "Tarde: 3 janelas livres", "Sem conflitos"],
      },
      {
        title: "Opções claras para o lead",
        description:
          "Em vez de perguntar 'qual seu melhor horário?', a IA oferece opções em períodos diferentes e confirma dia e hora por extenso.",
        preview: ["Terça às 11:30h", "Quinta às 14:30h", "Confirmação com data completa"],
      },
      {
        title: "Compromisso criado e lembrado",
        description:
          "O evento entra na agenda com lembretes por e-mail, status de atraso e opção de reagendar sem retrabalho.",
        preview: ["Evento criado", "Lembrete 24h antes", "Sincronizado com Google Agenda"],
      },
    ],
    features: [
      {
        eyebrow: "Inteligência de horários",
        title: "Sugestões que o lead realmente aceita",
        description:
          "Distribuímos as opções entre manhã e tarde, em dias diferentes, aumentando a chance de confirmação na primeira tentativa.",
        bullets: [
          "Sugestões por período e disponibilidade real",
          "Confirmação sempre com data e hora completas",
          "Bloqueio automático de sobreposição",
        ],
        metrics: [
          { label: "Conflitos de agenda", value: "zero" },
          { label: "Sincronização", value: "Google" },
        ],
      },
      {
        eyebrow: "Acompanhamento",
        title: "Nada se perde entre marcar e realizar",
        description:
          "Lembretes automáticos, status de atraso e reagendamento em poucos cliques mantêm a taxa de comparecimento alta.",
        bullets: [
          "Lembretes por e-mail personalizáveis",
          "Status visual de atrasado e concluído",
          "Reagendamento sem perder o histórico",
        ],
        reverse: true,
      },
    ],
    proof: [
      { label: "Trabalho manual", value: "-90%", hint: "sem troca de mensagens para marcar" },
      { label: "Lembretes", value: "automáticos", hint: "e-mail com identidade da sua empresa" },
      { label: "Integração", value: "Google Agenda", hint: "sincronização contínua" },
    ],
  },
  {
    slug: "ia-de-engajamento",
    key: "engajamento",
    category: "Engajamento",
    name: "IA de Engajamento",
    shortDescription: "Conversas que reativam oportunidades",
    icon: Sparkles,
    heroTitle: "Sua base já tem vendas.",
    heroHighlight: "A IA volta a conversar.",
    heroDescription:
      "A IA de Engajamento analisa conversas paradas, identifica intenção real e reativa oportunidades esquecidas com mensagens contextuais durante um ciclo inteligente de 30 dias.",
    seoTitle: "IA de Engajamento: reative oportunidades paradas",
    seoDescription:
      "Ciclos inteligentes de follow-up que analisam intenção, priorizam leads e reativam oportunidades esquecidas com mensagens sempre contextuais.",
    keywords: "reativação de leads, follow-up automático, engajamento comercial, IA de vendas",
    howItWorksTitle: "Como oportunidades voltam à mesa",
    howItWorks: [
      {
        title: "A IA lê o histórico",
        description:
          "Cada conversa parada é analisada: o que foi dito, qual objeção apareceu e há quanto tempo o lead sumiu.",
        preview: ["124 conversas paradas", "Objeções mapeadas", "38 com intenção alta"],
      },
      {
        title: "Prioriza quem vale reativar",
        description:
          "Leads com sinais de intenção sobem na fila. Quem não tem fit fica de fora — sem disparo em massa.",
        preview: ["Prioridade: alta", "Motivo: pediu proposta", "Melhor canal: WhatsApp"],
      },
      {
        title: "Reativa com contexto",
        description:
          "Um ciclo de 30 dias com toques nos dias 0, 5, 10, 15, 20, 25 e 30 — cada mensagem diferente e ligada à última conversa.",
        preview: ["Toque 1 enviado", "Resposta recebida em 2 dias", "Card movido no CRM"],
      },
    ],
    features: [
      {
        eyebrow: "Análise",
        title: "Intenção que você não veria no olho",
        description:
          "A IA classifica cada conversa por temperatura, motivo de parada e probabilidade de retomada, transformando histórico em fila de trabalho.",
        bullets: [
          "Classificação automática por intenção",
          "Motivos de perda identificados",
          "Priorização contínua da base",
        ],
        metrics: [
          { label: "Ciclo de reativação", value: "30 dias" },
          { label: "Toques por ciclo", value: "7" },
        ],
      },
      {
        eyebrow: "Conteúdo",
        title: "Mensagens que não parecem robô",
        description:
          "Cada toque é escrito a partir do contexto real da conversa anterior, com variação de abordagem e respeito total ao opt-out.",
        bullets: [
          "Nunca repete a mesma mensagem",
          "Descadastro em um clique",
          "Conformidade com LGPD",
        ],
        reverse: true,
      },
    ],
    proof: [
      { label: "Base trabalhada", value: "100%", hint: "nenhuma conversa esquecida" },
      { label: "Toques inteligentes", value: "7 em 30 dias", hint: "sem parecer spam" },
      { label: "Opt-out", value: "respeitado", hint: "confirmação em duas etapas" },
    ],
  },
  {
    slug: "automacao-comercial",
    key: "automacao",
    category: "Automação",
    name: "Automação Comercial",
    shortDescription: "Fluxos multicanal WhatsApp e Instagram",
    icon: Workflow,
    heroTitle: "Sua operação rodando sozinha.",
    heroHighlight: "WhatsApp e Instagram.",
    heroDescription:
      "Construa fluxos comerciais com gatilhos, condições, testes A/B e integrações — usando as APIs oficiais da Meta e sem depender de ninguém para apertar 'enviar'.",
    seoTitle: "Automação Comercial WhatsApp e Instagram",
    seoDescription:
      "Editor visual de fluxos com IA, gatilhos de WhatsApp e Instagram, testes A/B e integrações com Google Sheets, Calendar e Gmail.",
    keywords: "automação comercial, fluxos WhatsApp, automação Instagram, API oficial Meta",
    howItWorksTitle: "Como um fluxo entra em produção",
    howItWorks: [
      {
        title: "Escolha o gatilho",
        description:
          "Mensagem no WhatsApp, comentário ou direct no Instagram, entrada no CRM ou horário programado.",
        preview: ["Gatilho: mensagem recebida", "Canal: WhatsApp oficial", "Filtro por número"],
      },
      {
        title: "Monte o fluxo visualmente",
        description:
          "Arraste nós de mensagem, espera inteligente, condição, teste A/B, coleta de dados e ações no CRM. A IA pode montar o rascunho para você.",
        preview: ["6 nós conectados", "Teste A/B ativo", "Coleta de dados com IA"],
      },
      {
        title: "Acompanhe os resultados",
        description:
          "Funil por etapa do fluxo, taxa de resposta e conversão em reunião — tudo em um painel de resultados.",
        preview: ["Entradas: 412", "Respostas: 187", "Reuniões: 34"],
      },
    ],
    features: [
      {
        eyebrow: "Multicanal",
        title: "Um fluxo, vários canais oficiais",
        description:
          "WhatsApp Cloud API e Instagram da Meta no mesmo editor, com gatilhos separados e mensagens adequadas a cada canal.",
        bullets: [
          "APIs oficiais, sem risco de bloqueio",
          "Gatilhos separados por canal",
          "Mídia, botões e listas suportados",
        ],
        metrics: [
          { label: "Canais", value: "WhatsApp + IG" },
          { label: "Nós disponíveis", value: "12+" },
        ],
      },
      {
        eyebrow: "Integrações",
        title: "Conectado ao resto da operação",
        description:
          "Envie dados para planilhas, crie eventos, dispare e-mails e atualize o CRM sem sair do fluxo.",
        bullets: [
          "Google Sheets, Calendar e Gmail",
          "Ações de CRM e transferência para humano",
          "Limites de segurança e delays automáticos",
        ],
        reverse: true,
      },
    ],
    proof: [
      { label: "Criação com IA", value: "1 prompt", hint: "fluxo montado automaticamente" },
      { label: "Testes A/B", value: "nativos", hint: "compare abordagens no mesmo fluxo" },
      { label: "Conformidade", value: "Meta oficial", hint: "sem automações não autorizadas" },
    ],
  },
  {
    slug: "gestao-de-contratos",
    key: "contratos",
    category: "Receita",
    name: "Gestão de Contratos",
    shortDescription: "Renovações, vencimentos e receita",
    icon: FileSignature,
    heroTitle: "Nenhuma renovação perdida.",
    heroHighlight: "Receita recorrente sob controle.",
    heroDescription:
      "Acompanhe contratos ativos, vencendo e vencidos, receba avisos antes do prazo e renove com um clique — mantendo a previsão de receita sempre atualizada.",
    seoTitle: "Gestão de Contratos e Renovações",
    seoDescription:
      "Controle contratos, vencimentos e renovações com avisos automáticos, status vencendo e visão de receita recorrente.",
    keywords: "gestão de contratos, renovação de contratos, receita recorrente, churn B2B",
    howItWorksTitle: "Do fechamento à renovação",
    howItWorks: [
      {
        title: "Contrato registrado no fechamento",
        description:
          "Ao ganhar o negócio, o contrato entra com valor, vigência e responsável — sem planilha paralela.",
        preview: ["Valor: R$ 4.800/mês", "Vigência: 12 meses", "Responsável definido"],
      },
      {
        title: "Alertas antes do vencimento",
        description:
          "O status muda para 'vencendo' com antecedência e o responsável recebe o aviso para agir a tempo.",
        preview: ["12 contratos vencendo", "Aviso enviado", "Tarefa criada"],
      },
      {
        title: "Renovação em um clique",
        description:
          "Renove estendendo a vigência, atualizando valor e mantendo todo o histórico do cliente.",
        preview: ["Renovado por 12 meses", "Reajuste aplicado", "Receita atualizada"],
      },
    ],
    features: [
      {
        eyebrow: "Visibilidade",
        title: "Saiba o que vence antes que vença",
        description:
          "Painéis por status mostram contratos ativos, vencendo e vencidos, com valor em risco a cada mês.",
        bullets: [
          "Status ativo, vencendo e vencido",
          "Valor em risco por período",
          "Filtro por responsável e cliente",
        ],
        metrics: [
          { label: "Aviso antecipado", value: "configurável" },
          { label: "Visão de receita", value: "mensal" },
        ],
      },
      {
        eyebrow: "Retenção",
        title: "Renovar vira processo, não sorte",
        description:
          "Avisos automáticos, e-mails padronizados e botão de renovação transformam retenção em rotina previsível.",
        bullets: [
          "E-mails de renovação com sua identidade",
          "Botão renovar contrato no card",
          "Histórico completo de renovações",
        ],
        reverse: true,
      },
    ],
    proof: [
      { label: "Perda por esquecimento", value: "zero", hint: "avisos automáticos" },
      { label: "Renovação", value: "1 clique", hint: "sem refazer o contrato" },
      { label: "Previsão de receita", value: "atualizada", hint: "no cockpit de crescimento" },
    ],
  },
];

export const getProductBySlug = (slug?: string) =>
  PRODUCTS.find((p) => p.slug === slug);

export const getRelatedProducts = (slug: string) =>
  PRODUCTS.filter((p) => p.slug !== slug);
