/**
 * FONTE ÚNICA DE VERDADE DO TOUR GUIADO DA WIIZE
 * ------------------------------------------------------------------
 * Este arquivo define o conteúdo (id, título, texto e ordem) de TODOS
 * os passos do tour. Ele é consumido por:
 *
 *   1. `src/hooks/useGuidedTour.tsx`  -> tour interno (usuário logado)
 *   2. `src/pages/TourGuiado.tsx`     -> tour público (`/tour-guiado`)
 *
 * Regra: para alterar textos, ordem ou adicionar/remover etapas, edite
 * SOMENTE este arquivo. Os dois tours se atualizam juntos, garantindo
 * que a versão pública seja sempre idêntica à interna.
 *
 * Cada consumidor adiciona apenas o seu comportamento próprio
 * (rotas/selectors no interno, telas mockadas no público) através de um
 * mapa indexado por `id`.
 */

export type TourPlacement = "top" | "bottom" | "left" | "right" | "center";

export type TourContentStep = {
  id: string;
  title: string;
  body: string;
  placement: TourPlacement;
  /** Pilar narrativo — usado no tour público para numerar as etapas. */
  pillar: "cockpit" | "captacao" | "prospeccao" | "atendimento" | "gestao";
};

export const TOUR_CONTENT: TourContentStep[] = [
  {
    id: "welcome",
    title: "Bem-vindo à Wiize",
    body: "Esta é a sua máquina de vendas B2B. Em poucos minutos você vê ela encontrar empresas, iniciar conversas, fazer follow-up e marcar reuniões para o seu time.",
    placement: "center",
    pillar: "cockpit",
  },

  // ---- Cockpit ----
  {
    id: "cockpit-overview",
    title: "Sua visão do pipeline",
    body: "Aqui você vê o que a máquina produziu: empresas encontradas, conversas iniciadas e oportunidades geradas.",
    placement: "bottom",
    pillar: "cockpit",
  },
  {
    id: "cockpit-kpis",
    title: "O que importa hoje",
    body: "Receita possível, quem está quente hoje, como está a operação e quanto tempo a IA economizou do seu time.",
    placement: "top",
    pillar: "cockpit",
  },
  {
    id: "cockpit-forecast",
    title: "O que vem pela frente",
    body: "De um lado, quanto o pipeline atual pode gerar. Do outro, o caminho da empresa encontrada até a oportunidade real.",
    placement: "top",
    pillar: "cockpit",
  },
  {
    id: "wian-briefing",
    title: "A inteligência por trás da operação",
    body: "Todo dia o Wian lê o que aconteceu e conta o que importa: quais oportunidades merecem atenção, o que está travando e o que fazer hoje. Por texto ou áudio.",
    placement: "top",
    pillar: "cockpit",
  },



  // ---- Captação ----
  {
    id: "sidebar-oportunidades-intro",
    title: "1. Encontrar empresas",
    body: "Tudo começa aqui. A Wiize busca empresas do seu perfil, analisa cada uma e já deixa a abordagem pronta. Vamos entrar.",
    placement: "right",
    pillar: "captacao",
  },
  {
    id: "sidebar-oportunidades-buscar",
    title: "Item Buscar",
    body: "Em Buscar você encontra empresas reais prontas para serem abordadas. Vamos abrir essa página.",
    placement: "right",
    pillar: "captacao",
  },
  {
    id: "search-empty",
    title: "Defina o nicho",
    body: "Diga o tipo de empresa que você quer alcançar. Exemplo: clínicas, contabilidades, restaurantes ou imobiliárias.",
    placement: "top",
    pillar: "captacao",
  },
  {
    id: "search-typing",
    title: "Escolha a cidade",
    body: "Agora diga onde. A busca pode ser local, nacional ou internacional.",
    placement: "top",
    pillar: "captacao",
  },
  {
    id: "search-button",
    title: "Prospecte oportunidades",
    body: "Pronto. A partir daqui a Wiize encontra as empresas para você abordar.",
    placement: "top",
    pillar: "captacao",
  },

  // ---- Gestão / Diagnóstico ----
  {
    id: "sidebar-oportunidades-gestao",
    title: "Gestão da Prospecção IA (Captação)",
    body: "2. Entender a oportunidade: toda empresa encontrada vem para cá, onde a IA analisa antes de você gastar tempo com ela. Vamos entrar.",
    placement: "right",
    pillar: "captacao",
  },
  {
    id: "management",
    title: "Gestão da Prospecção IA (Captação)",
    body: "Cada empresa recebe uma nota, um diagnóstico com pontos fortes e fracos e a chance de fechar. Assim seu time sabe por quem começar.",
    placement: "center",
    pillar: "captacao",
  },
  {
    id: "diagnosis",
    title: "2. Entender a empresa",
    body: "Abrimos uma empresa de exemplo. Veja a nota, o que pesa em cada critério e a chance real de virar cliente.",
    placement: "right",
    pillar: "captacao",
  },
  {
    id: "approach-message",
    title: "3. Criar a abordagem",
    body: "Com base no que descobriu, a Wiize escreve a mensagem do primeiro contato. Você pode ajustar ou enviar direto pelo WhatsApp.",
    placement: "right",
    pillar: "captacao",
  },

  // ---- SDR Inteligente ----
  {
    id: "sidebar-oportunidades-sdr",
    title: "4. Conversar e fazer follow-up",
    body: "A IA assume a conversa no WhatsApp: responde, entende o interesse, faz follow-up de quem sumiu e marca a reunião com o seu time.",
    placement: "right",
    pillar: "prospeccao",
  },

  // ---- Meta (API Oficial) ----
  {
    id: "sidebar-meta-intro",
    title: "Meta, API Oficial do WhatsApp",
    body: "Tudo o que envolve a Meta Cloud API fica neste menu: dashboard de entregas, campanhas, números e configurações.",
    placement: "right",
    pillar: "prospeccao",
  },
  {
    id: "sidebar-meta-campanhas",
    title: "Campanhas oficiais",
    body: "Dispare templates aprovados pela Meta para prospecção, nutrição e reativação, com entregabilidade garantida.",
    placement: "right",
    pillar: "prospeccao",
  },
  {
    id: "sidebar-meta-numeros",
    title: "Números & WABA",
    body: "Conecte e gerencie seus números oficiais ligados à sua conta WABA (WhatsApp Business Account).",
    placement: "right",
    pillar: "prospeccao",
  },

  // ---- Agenda ----
  {
    id: "sidebar-agenda",
    title: "5. Marcar a reunião",
    body: "Quando o interesse aparece, a IA olha os horários livres do time, oferece na conversa e cria a reunião, com lembrete por e-mail.",
    placement: "right",
    pillar: "atendimento",
  },

  // ---- Atendimento ----
  {
    id: "sidebar-chat",
    title: "Atendimento unificado",
    body: "Todas as conversas em um único lugar. Responda manualmente ou deixe a IA conduzir o atendimento por você, 24 horas por dia.",
    placement: "right",
    pillar: "atendimento",
  },

  // ---- Automação ----
  {
    id: "sidebar-automacao-intro",
    title: "Automação completa",
    body: "Aqui você cria fluxos conversacionais, configura agentes de IA e prepara seus números para o envio em volume. Vamos passar por cada um.",
    placement: "right",
    pillar: "atendimento",
  },
  {
    id: "sidebar-automacao-fluxos",
    title: "Fluxos automáticos",
    body: "Construa jornadas conversacionais com mensagens, condições, esperas e integrações nativas com Google e WhatsApp.",
    placement: "right",
    pillar: "atendimento",
  },

  // ---- Gestão (CRM) ----
  {
    id: "sidebar-crm-intro",
    title: "6. Organizar a oportunidade",
    body: "Tudo o que a máquina gerou fica organizado aqui, pronto para o seu time trabalhar.",
    placement: "right",
    pillar: "gestao",
  },
  {
    id: "sidebar-crm-pipeline",
    title: "Pipeline visual",
    body: "Acompanhe cada oportunidade do primeiro contato ao fechamento, arrastando entre as etapas.",
    placement: "right",
    pillar: "gestao",
  },
  {
    id: "sidebar-crm-score",
    title: "Quem merece atenção agora",
    body: "A Wiize mostra quem está mais perto de uma reunião, com base no engajamento e nas respostas no WhatsApp.",
    placement: "right",
    pillar: "gestao",
  },

  {
    id: "final",
    title: "É isso que a máquina faz",
    body: "Encontrar empresas, iniciar conversas, fazer follow-up, marcar reuniões e organizar tudo. Falta só você colocar para rodar.",
    placement: "center",
    pillar: "gestao",
  },
];

export const TOUR_STEP_IDS = TOUR_CONTENT.map((s) => s.id);
