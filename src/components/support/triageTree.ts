// Árvore de triagem do Wian — Camadas 1, 2 e 3
// Estrutura: Categoria → Subproblema → Solução guiada (passos)
// Quando o usuário clica "Não resolveu", a IA é acionada com TODO o contexto.

export type Solution = {
  id: string;
  title: string; // título curto do subproblema (botão)
  intro?: string; // 1 frase explicando a causa
  steps: string[]; // passos numerados
  ctaLabel?: string; // botão para abrir tela do app
  ctaPath?: string; // rota interna
  // quando o usuário clica "Não resolveu" → IA já recebe esse resumo
  aiHint?: string;
};

export type Category = {
  id: string;
  label: string; // botão da camada 1
  emoji?: string;
  // se true, NÃO usa IA — vai direto para humano (financeiro, cancelamento, LGPD)
  alwaysHuman?: boolean;
  // se true, mostra direto o formulário de chamado
  directEscalate?: boolean;
  subcategoryLabel?: string; // texto da camada 2
  problems: Solution[];
};

export const TRIAGE_TREE: Category[] = [
  {
    id: "campanhas",
    label: "Campanhas e disparos",
    emoji: "📣",
    subcategoryLabel: "Qual problema está acontecendo nas campanhas?",
    problems: [
      {
        id: "nao_dispara",
        title: "Campanha não dispara",
        intro: "Normalmente isso acontece quando a sessão do WhatsApp está desconectada ou o número está em aquecimento.",
        steps: [
          "Vá em **WhatsApp → Conexões** e confira se o número está com status **Conectado** (verde).",
          "Se estiver vermelho/amarelo, clique em **Reconectar** e leia o QR Code novamente.",
          "Volte em **Campanhas**, abra a campanha e clique em **Retomar disparo**.",
        ],
        ctaLabel: "Abrir Conexões",
        ctaPath: "/whatsapp",
        aiHint: "Usuário tem campanha que não dispara mesmo após reconectar a sessão.",
      },
      {
        id: "lentas",
        title: "Mensagens muito lentas",
        intro: "A Wiize aplica delays de segurança automáticos para evitar bloqueio do número.",
        steps: [
          "Verifique o **nível de aquecimento** do número em WhatsApp → Aquecimento.",
          "Números recém-aquecidos enviam menos por hora — isso é proposital.",
          "Em **Campanhas → Configurações de envio**, confirme que o intervalo está dentro do recomendado para o nível atual.",
        ],
        aiHint: "Mensagens lentas mesmo com número bem aquecido.",
      },
      {
        id: "fila_travada",
        title: "Fila travada / pendentes acumulando",
        intro: "Acontece quando há erro intermitente de conexão ou rate-limit do provedor.",
        steps: [
          "Pause a campanha por 1 minuto.",
          "Vá em **Conexões** e force **Reconectar** o número.",
          "Retome a campanha — os itens travados serão reprocessados.",
        ],
        aiHint: "Fila acumulando após reconectar.",
      },
      {
        id: "erro_envio",
        title: "Erro ao enviar / mensagem não chega",
        intro: "Pode ser número inválido, sem WhatsApp, ou bloqueio do destinatário.",
        steps: [
          "Abra a campanha e clique no contato com erro para ver o motivo exato.",
          "Confirme que o número tem **DDI 55** e DDD válidos.",
          "Se o erro for *número não tem WhatsApp*, remova-o da lista.",
        ],
        aiHint: "Mensagens com erro mesmo com número formatado correto.",
      },
      {
        id: "outro_campanhas",
        title: "Outro problema com campanhas",
        steps: ["Me conta com mais detalhes o que está acontecendo. Vou analisar com você."],
        aiHint: "Problema de campanha não coberto pela triagem.",
      },
    ],
  },
  {
    id: "whatsapp",
    label: "WhatsApp e conexões",
    emoji: "💬",
    subcategoryLabel: "O que está acontecendo com seu WhatsApp?",
    problems: [
      {
        id: "qr_nao_gera",
        title: "QR Code não gera",
        intro: "Quase sempre é cache de instância antiga.",
        steps: [
          "Vá em **WhatsApp → Conexões** e clique em **Adicionar novo número**.",
          "Se o QR ficar carregando por mais de 30s, **delete** essa conexão e crie outra.",
          "Use sempre conexão de internet estável (não rede pública).",
        ],
        ctaLabel: "Abrir Conexões",
        ctaPath: "/whatsapp",
        aiHint: "QR não aparece mesmo após deletar e recriar conexão.",
      },
      {
        id: "sessao_caiu",
        title: "Sessão caiu / desconectado",
        intro: "Acontece quando o WhatsApp do celular fica offline por muito tempo.",
        steps: [
          "Abra o WhatsApp no celular conectado a esse número.",
          "Vá em **Conexões** na Wiize e clique em **Reconectar**.",
          "Leia o novo QR Code com o WhatsApp (Aparelhos conectados).",
        ],
        ctaPath: "/whatsapp",
        aiHint: "Sessão cai com frequência.",
      },
      {
        id: "numero_bloqueado",
        title: "Número bloqueado pelo WhatsApp",
        intro: "Caso crítico — vou abrir um chamado humano para você.",
        steps: [
          "Não tente reconectar com o mesmo chip por enquanto.",
          "Vamos abrir um ticket para nosso time analisar o histórico do número.",
        ],
        aiHint: "Número possivelmente bloqueado pelo WhatsApp.",
      },
      {
        id: "outro_whats",
        title: "Outro problema",
        steps: ["Descreva o que aconteceu — em qual tela, qual mensagem de erro, o que você tentou."],
      },
    ],
  },
  {
    id: "meta",
    label: "Meta API Oficial",
    emoji: "🟦",
    subcategoryLabel: "O que está acontecendo com a Meta API?",
    problems: [
      {
        id: "conectar_meta",
        title: "Não consigo conectar minha WABA",
        steps: [
          "Vá em **Campanhas Meta → Configurar conta**.",
          "Use a opção **Embedded Signup** (login com Facebook).",
          "Confirme que você é admin da Business Manager e da WABA.",
        ],
        ctaLabel: "Abrir Meta",
        ctaPath: "/campanhas-meta",
        aiHint: "Falha no embedded signup da Meta.",
      },
      {
        id: "template_reprovado",
        title: "Template reprovado pela Meta",
        steps: [
          "A Meta reprova templates com tom de venda agressiva ou conteúdo proibido.",
          "Reescreva sem promessas, sem URLs encurtadas, e mantenha a categoria correta (Marketing/Utility/Authentication).",
          "Reenvie pelo painel de templates.",
        ],
        aiHint: "Template aprovação Meta reprovado.",
      },
      {
        id: "outro_meta",
        title: "Outro problema com Meta",
        steps: ["Me conte o detalhe — qual passo travou e qual mensagem aparece."],
      },
    ],
  },
  {
    id: "ia",
    label: "IA e Agentes",
    emoji: "🤖",
    subcategoryLabel: "O que está acontecendo com seus agentes de IA?",
    problems: [
      {
        id: "ia_nao_responde",
        title: "Agente de IA não responde",
        intro: "Geralmente é silenciamento automático após handoff humano ou limite diário atingido.",
        steps: [
          "Vá em **Agentes IA** e abra o agente em questão.",
          "Confira se o agente está **ativo** e se a conexão WhatsApp está conectada.",
          "Verifique o **limite diário** — agentes seguem o nível de aquecimento do número.",
        ],
        ctaLabel: "Abrir Agentes IA",
        ctaPath: "/ai-agents",
        aiHint: "Agente IA configurado mas sem responder leads.",
      },
      {
        id: "ia_resposta_ruim",
        title: "Respostas da IA não estão boas",
        steps: [
          "Abra o agente e revise o **prompt** — instruções claras geram respostas melhores.",
          "Use o **chat de teste** para iterar antes de ativar.",
          "Adicione exemplos de perguntas/respostas no prompt para ancorar o tom.",
        ],
        ctaPath: "/ai-agents",
        aiHint: "IA respondendo mal mesmo com prompt ajustado.",
      },
      {
        id: "outro_ia",
        title: "Outro problema com IA",
        steps: ["Me explica o comportamento que está vendo."],
      },
    ],
  },
  {
    id: "crm",
    label: "CRM e Leads",
    emoji: "📊",
    subcategoryLabel: "O que está acontecendo no CRM?",
    problems: [
      {
        id: "lead_nao_aparece",
        title: "Lead não aparece no Kanban",
        steps: [
          "Confira os **filtros ativos** no topo do CRM (etapa, tag, responsável).",
          "Limpe os filtros e role até a coluna **Prospectado**.",
          "Se veio de campanha, o lead pode estar em outra etapa por progressão automática.",
        ],
        ctaPath: "/crm",
        aiHint: "Lead criado mas não aparece visivelmente.",
      },
      {
        id: "score_errado",
        title: "Score do lead parece errado",
        steps: [
          "O score considera atividade (mensagens, respostas, cliques) e tempo desde o último contato.",
          "Vá em **CRM → Detalhe do lead → Score** para ver o histórico de pontuação.",
        ],
        aiHint: "Score do lead inconsistente.",
      },
      {
        id: "outro_crm",
        title: "Outro problema",
        steps: ["Me explica o que está acontecendo no CRM."],
      },
    ],
  },
  {
    id: "flows",
    label: "Fluxos e automações",
    emoji: "🔀",
    subcategoryLabel: "O que está acontecendo com seus fluxos?",
    problems: [
      {
        id: "flow_nao_inicia",
        title: "Fluxo não inicia",
        steps: [
          "Vá em **WhatsApp → Fluxos** e abra o fluxo.",
          "Confirme que ele está **ativo** e que o **gatilho** está configurado (ex.: nova mensagem).",
          "Verifique se a **conexão WhatsApp** vinculada está conectada.",
        ],
        ctaPath: "/whatsapp",
        aiHint: "Fluxo configurado mas não dispara.",
      },
      {
        id: "flow_para_meio",
        title: "Fluxo para no meio",
        steps: [
          "Abra os **Resultados** do fluxo para ver em qual nó ele parou.",
          "Nós de espera longa ou condições não atendidas são as causas mais comuns.",
        ],
        aiHint: "Fluxo travando em nó específico.",
      },
      {
        id: "outro_flow",
        title: "Outro problema",
        steps: ["Me conta em qual nó travou e o que era esperado."],
      },
    ],
  },
  {
    id: "financeiro",
    label: "Financeiro / Cobrança",
    emoji: "💳",
    alwaysHuman: true,
    directEscalate: true,
    problems: [],
  },
  {
    id: "planos",
    label: "Planos e cancelamento",
    emoji: "📦",
    alwaysHuman: true,
    directEscalate: true,
    problems: [],
  },
  {
    id: "relatorios",
    label: "Relatórios e métricas",
    emoji: "📈",
    subcategoryLabel: "O que precisa nos relatórios?",
    problems: [
      {
        id: "metricas_zeradas",
        title: "Métricas aparecem zeradas",
        steps: [
          "Confirme o **período selecionado** no topo do dashboard.",
          "Se você acabou de criar a conta, é normal — métricas aparecem após o primeiro disparo/atividade.",
        ],
        ctaPath: "/dashboard",
        aiHint: "Dashboard com dados zerados em conta com atividade.",
      },
      {
        id: "outro_rel",
        title: "Outro problema",
        steps: ["Me conta qual métrica está estranha e o que você esperava ver."],
      },
    ],
  },
  {
    id: "suporte",
    label: "Falar com suporte humano",
    emoji: "🧑‍💻",
    directEscalate: true,
    problems: [],
  },
];

export const findCategory = (id: string) => TRIAGE_TREE.find((c) => c.id === id);
export const findProblem = (catId: string, probId: string) =>
  findCategory(catId)?.problems.find((p) => p.id === probId);
