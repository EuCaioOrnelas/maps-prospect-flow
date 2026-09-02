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
    shortDescription: "Compromissos marcados pelo SDR IA, sozinho",
    cardTagline: "Compromissos marcados pelo SDR IA, sozinho",
    cardDescription:
      "Conectada ao SDR Inteligente: a IA conversa com o contato e marca o compromisso de forma autônoma, com base na disponibilidade real da sua agenda — e avisa você e o cliente antes da hora.",
    icon: CalendarClock,
    heroTitle: "A IA conversa e marca",
    heroHighlight: "o compromisso por você",
    heroDescription:
      "A Agenda Inteligente é conectada ao SDR IA: ele fala com o contato, consulta a disponibilidade real da sua agenda e agenda o compromisso de forma autônoma. Depois, avisa você e também o seu lead ou cliente antes do horário.",
    seoTitle: "Agenda Inteligente: agendamento autônomo com IA",
    seoDescription:
      "Conectada ao SDR IA: a inteligência conversa com o contato, agenda de forma autônoma conforme a disponibilidade da sua agenda e avisa você e o cliente antes do compromisso.",
    keywords:
      "agendamento automático, agenda com IA, reuniões B2B, lembrete de compromisso, Google Agenda, SDR IA",
    howItWorksTitle: "Da conversa ao compromisso, sem você digitar nada",
    howItWorksHighlight: "sem você digitar nada",
    howItWorks: [
      {
        title: "O SDR IA conduz a conversa",
        description:
          "Conectada ao SDR Inteligente, a agenda entra em cena assim que o contato demonstra interesse real em avançar para uma conversa.",
        preview: ["Interesse confirmado", "Responsável definido", "SDR IA no comando"],
      },
      {
        title: "A IA consulta a sua disponibilidade",
        description:
          "Ela lê a disponibilidade real de cada pessoa do time, evita sobreposição e oferece horários que realmente existem na sua agenda.",
        preview: ["Terça às 11:30h", "Quinta às 14:30h", "Sem conflitos de agenda"],
      },
      {
        title: "Agenda e avisa todo mundo",
        description:
          "O compromisso é criado sozinho, sincronizado com o Google Agenda, e os lembretes saem para você e para o lead ou cliente antes do horário.",
        preview: ["Compromisso criado sozinho", "Aviso para você", "Aviso para o lead ou cliente"],
      },
    ],
    features: [
      {
        eyebrow: "Autonomia",
        title: "O agendamento acontece sem depender de ninguém",
        titleHighlight: "sem depender de ninguém",
        description:
          "O SDR IA fala com o contato, propõe horários e fecha o compromisso com base na disponibilidade real da sua agenda. Você só aparece na hora da reunião.",
        bullets: [
          "Horários sugeridos conforme a agenda de cada pessoa",
          "Confirmação sempre com data e hora completas",
          "Bloqueio automático de sobreposição",
        ],
        metrics: [
          { label: "Conflitos de agenda", value: "evitados" },
          { label: "Sincronização", value: "Google Agenda" },
        ],
      },
      {
        eyebrow: "Lembretes",
        title: "Avisa você e avisa o seu cliente",
        titleHighlight: "e avisa o seu cliente",
        description:
          "Antes de cada compromisso, a agenda notifica o responsável do time e o próprio lead ou cliente — reduzindo esquecimento, atraso e reunião perdida.",
        bullets: [
          "Aviso ao responsável antes do horário",
          "Lembrete ao lead ou cliente com a sua identidade",
          "Reagendamento sem perder o histórico",
        ],
        reverse: true,
      },
    ],
    proof: [
      { label: "Agendamento", value: "autônomo", hint: "feito pelo SDR IA na conversa" },
      { label: "Avisos", value: "dos dois lados", hint: "para você e para o cliente" },
      { label: "Integração", value: "Google Agenda", hint: "sincronização contínua" },
    ],
  },
  {
    slug: "ia-de-engajamento",
    key: "engajamento",
    category: "Otimize",
    stage: "Otimize",
    name: "IA de Engajamento",
    shortDescription: "Pontue o engajamento de cada contato",
    cardTagline: "Pontue o engajamento de cada contato",
    cardDescription:
      "A IA analisa as conversas e atribui pontuação por mensagem, palavras usadas, intenção e tempo de resposta. Você vê quem está engajado, quem está pronto para comprar e quem está esfriando.",
    icon: Sparkles,
    heroTitle: "Saiba quem está engajado",
    heroHighlight: "e quem está esfriando",
    heroDescription:
      "A IA de Engajamento analisa as conversas com seus contatos e atribui pontuação por mensagem, palavras utilizadas, intenção demonstrada e tempo de resposta. O resultado é uma leitura clara de quem está pronto para comprar, quem precisa de atenção e quem está perdendo o interesse.",
    seoTitle: "IA de Engajamento: pontuação de conversas e intenção de compra",
    seoDescription:
      "A IA analisa conversas e pontua cada contato por mensagem, palavras, intenção e tempo de resposta, mostrando quem está engajado, pronto para comprar ou esfriando.",
    keywords:
      "engajamento comercial, lead scoring, análise de conversas, intenção de compra, priorização de leads",
    howItWorksTitle: "De conversas soltas a uma leitura clara de engajamento",
    howItWorksHighlight: "leitura clara de engajamento",
    howItWorks: [
      {
        title: "A IA lê cada conversa",
        description:
          "Todas as interações com o contato são analisadas: o que foi dito, as palavras utilizadas, o tom e a evolução da conversa ao longo do tempo.",
        preview: ["Mensagens analisadas", "Palavras-chave detectadas", "Tom da conversa avaliado"],
      },
      {
        title: "Cada sinal vira pontuação",
        description:
          "Mensagem enviada, intenção demonstrada, perguntas sobre preço e tempo de resposta somam ou reduzem pontos no score de engajamento do contato.",
        preview: ["Pontos por mensagem", "Peso por intenção", "Tempo de resposta considerado"],
      },
      {
        title: "Você vê onde investir atenção",
        description:
          "A pontuação organiza a base: quem está quente e pronto para a proposta, quem precisa de mais atenção e quem começou a esfriar.",
        preview: ["Pronto para compra", "Precisa de atenção", "Engajamento em queda"],
      },
    ],
    features: [
      {
        eyebrow: "Pontuação",
        title: "Engajamento vira um número que a equipe entende",
        titleHighlight: "um número que a equipe entende",
        description:
          "Em vez de opinião sobre quem está interessado, cada contato recebe um score construído a partir de mensagens, palavras, intenção e velocidade de resposta.",
        bullets: [
          "Score atualizado a cada nova interação",
          "Peso maior para sinais de intenção de compra",
          "Tempo de resposta como indicador de interesse",
        ],
        metrics: [
          { label: "Conversas analisadas", value: "todas" },
          { label: "Score", value: "em tempo real" },
        ],
      },
      {
        eyebrow: "Prioridade",
        title: "A equipe fala primeiro com quem está pronto",
        titleHighlight: "com quem está pronto",
        description:
          "A fila deixa de ser por ordem de chegada. Contatos quentes sobem, quem está esfriando aparece a tempo de ser recuperado e ninguém importante fica esquecido.",
        bullets: [
          "Contatos quentes em destaque no cockpit",
          "Alerta para engajamento em queda",
          "Retomadas sempre com o contexto da conversa",
        ],
        reverse: true,
      },
    ],
    proof: [
      { label: "Pontuação", value: "por conversa", hint: "mensagem, palavras, intenção e tempo" },
      { label: "Leitura", value: "quente ou frio", hint: "quem comprar e quem está esfriando" },
      { label: "Atenção", value: "priorizada", hint: "a equipe age no contato certo" },
    ],
  },
  {
    slug: "automacao-comercial",
    key: "automacao",
    category: "Otimize",
    stage: "Otimize",
    name: "Automação Comercial",
    shortDescription: "Automatize o atendimento no WhatsApp",
    cardTagline: "Automatize o atendimento no WhatsApp",
    cardDescription:
      "Automações no WhatsApp para atendimento ao cliente, suporte, pedidos e consultas: o cliente é respondido na hora e sua equipe só entra quando realmente precisa.",
    icon: Workflow,
    heroTitle: "Automatize atendimento",
    heroHighlight: "e suporte no WhatsApp",
    heroDescription:
      "Crie automações no WhatsApp para atender clientes, resolver suporte, receber pedidos e responder consultas. O cliente tem resposta imediata, o processo roda sozinho e sua equipe assume apenas os casos que exigem gente.",
    seoTitle: "Automação no WhatsApp: atendimento, suporte, pedidos e consultas",
    seoDescription:
      "Automatize o WhatsApp da sua empresa: atendimento ao cliente, suporte, pedidos e consultas resolvidos automaticamente, com transferência para humano quando necessário.",
    keywords:
      "automação WhatsApp, atendimento automatizado, suporte no WhatsApp, pedidos, consultas, WhatsApp oficial",
    howItWorksTitle: "Como o atendimento no WhatsApp passa a rodar sozinho",
    howItWorksHighlight: "passa a rodar sozinho",
    howItWorks: [
      {
        title: "Defina o gatilho",
        description:
          "Escolha o que inicia a automação: uma mensagem recebida no WhatsApp, uma palavra específica, uma mudança de etapa no CRM ou um horário programado.",
        preview: ["Gatilho definido", "Canal: WhatsApp oficial", "Condições configuradas"],
      },
      {
        title: "Monte o atendimento",
        description:
          "Crie menus, respostas, coletas de dados e etapas para atendimento, suporte, pedidos e consultas — tudo com o contexto da conversa preservado.",
        preview: ["Atendimento e suporte", "Pedidos e consultas", "Dados coletados na conversa"],
      },
      {
        title: "Humano só quando precisa",
        description:
          "A automação resolve o que é repetitivo e transfere para a equipe quando o caso exige atenção humana, com todo o histórico registrado no CRM.",
        preview: ["Casos simples resolvidos", "Transferência para humano", "CRM atualizado"],
      },
    ],
    features: [
      {
        eyebrow: "Atendimento",
        title: "Seu cliente é respondido na hora, sempre",
        titleHighlight: "na hora, sempre",
        description:
          "Dúvidas frequentes, status de pedido, consultas e solicitações de suporte deixam de esperar por alguém livre. A automação responde no WhatsApp em segundos.",
        bullets: [
          "Atendimento ao cliente e suporte automatizados",
          "Pedidos e consultas resolvidos na conversa",
          "Fila menor para a equipe humana",
        ],
        metrics: [
          { label: "Canal", value: "WhatsApp oficial" },
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
          "API oficial da Meta e limites de segurança",
        ],
        reverse: true,
      },
    ],
    proof: [
      { label: "Atendimento", value: "imediato", hint: "suporte, pedidos e consultas" },
      { label: "Trabalho repetitivo", value: "reduzido", hint: "sem tirar pessoas do processo" },
      { label: "Conformidade", value: "canal oficial", hint: "sem automações não autorizadas" },
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
