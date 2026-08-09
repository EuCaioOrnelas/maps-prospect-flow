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
    body: "Vamos te apresentar a sua nova operação comercial em quatro pilares: captação, prospecção, atendimento e gestão. Em poucos minutos você entende exatamente como cada parte trabalha por você.",
    placement: "center",
    pillar: "cockpit",
  },

  // ---- Cockpit ----
  {
    id: "cockpit-overview",
    title: "Cockpit de Crescimento",
    body: "Esta é a sua central de comando. Aqui você acompanha o impacto financeiro gerado, a curva de leads captados e o resultado consolidado da sua operação em tempo real.",
    placement: "bottom",
    pillar: "cockpit",
  },
  {
    id: "cockpit-kpis",
    title: "Indicadores executivos",
    body: "Receita potencial, leads quentes do dia, saúde da operação e o tempo que a IA economizou para você. Tudo o que precisa saber em quatro cartões.",
    placement: "top",
    pillar: "cockpit",
  },
  {
    id: "cockpit-forecast",
    title: "Projeção e funil",
    body: "À esquerda, a projeção de receita por nível de score. À direita, o funil operacional completo: do lead captado à oportunidade gerada.",
    placement: "top",
    pillar: "cockpit",
  },
  {
    id: "wian-briefing",
    title: "Wian — sua analista comercial",
    body: "Todo dia a Wian lê o cockpit, o CRM, as vendas, o atendimento e a agenda e entrega um briefing executivo em formato de chat. Você conversa com ela por texto ou áudio e recebe o plano de ação com metas numéricas.",
    placement: "top",
    pillar: "cockpit",
  },



  // ---- Captação ----
  {
    id: "sidebar-oportunidades-intro",
    title: "Captação de leads com Prospecção IA",
    body: "Tudo começa no menu Prospecção IA. É aqui que a IA busca novas empresas, analisa cada lead e deixa a abordagem pronta. Vamos entrar agora.",
    placement: "right",
    pillar: "captacao",
  },
  {
    id: "sidebar-oportunidades-buscar",
    title: "Item Buscar",
    body: "Este é o ponto de entrada da sua captação. Em Buscar você encontra empresas reais do Google Maps prontas para serem prospectadas. Vamos abrir essa página.",
    placement: "right",
    pillar: "captacao",
  },
  {
    id: "search-empty",
    title: "Defina o nicho",
    body: "Comece pela palavra-chave do nicho que você quer captar. Exemplo: clínicas, contabilidades, restaurantes ou imobiliárias.",
    placement: "top",
    pillar: "captacao",
  },
  {
    id: "search-typing",
    title: "Escolha a cidade",
    body: "Agora defina a localização que deseja prospectar. A busca pode ser local, nacional ou internacional.",
    placement: "top",
    pillar: "captacao",
  },
  {
    id: "search-button",
    title: "Prospecte oportunidades",
    body: "Com os campos preenchidos, basta clicar aqui para a Wiize encontrar empresas qualificadas para sua abordagem.",
    placement: "top",
    pillar: "captacao",
  },

  // ---- Gestão / Diagnóstico ----
  {
    id: "sidebar-oportunidades-gestao",
    title: "Gestão da Prospecção IA (Captação)",
    body: "Toda empresa captada vai parar aqui, ainda na etapa de Captação. É onde a IA analisa cada lead em profundidade antes de virar negócio. Vamos entrar.",
    placement: "right",
    pillar: "captacao",
  },
  {
    id: "management",
    title: "Gestão da Prospecção IA (Captação)",
    body: "Esta tela ainda faz parte da Captação: cada empresa recebe uma pontuação, um diagnóstico de pontos fortes e fracos e uma probabilidade de fechamento. A gestão do funil de vendas (CRM, pipeline e score de contatos) acontece em outro menu, que veremos mais à frente.",
    placement: "center",
    pillar: "captacao",
  },
  {
    id: "diagnosis",
    title: "Diagnóstico inteligente",
    body: "Abrimos um lead de exemplo. Veja o score total (0–100), a quebra por dimensão (estrutura digital, reputação e potencial) e a probabilidade de conversão.",
    placement: "right",
    pillar: "captacao",
  },
  {
    id: "approach-message",
    title: "Abordagem gerada por IA",
    body: "Com base no diagnóstico, a Wiize escreve uma mensagem personalizada para o primeiro contato. Você pode copiar, ajustar ou enviar direto pelo WhatsApp.",
    placement: "right",
    pillar: "captacao",
  },

  // ---- SDR Inteligente ----
  {
    id: "sidebar-oportunidades-sdr",
    title: "SDR Inteligente",
    body: "Aqui vive o seu pré-vendedor de IA. Ele assume a conversa no WhatsApp, qualifica o lead, quebra objeções, faz follow-up sozinho e agenda a reunião com o seu time, 24 horas por dia, sem cansar.",
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
    title: "Agenda comercial",
    body: "A Agenda é integrada ao SDR Inteligente: ele consulta a disponibilidade real do seu time, oferece horários livres na conversa e cria a reunião automaticamente, com lembretes por e-mail e visões de dia, semana, mês e lista.",
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
    title: "Gestão do funil (CRM)",
    body: "No menu CRM você acompanha todo o funil de vendas e a qualificação automática dos seus leads.",
    placement: "right",
    pillar: "gestao",
  },
  {
    id: "sidebar-crm-pipeline",
    title: "Pipeline visual",
    body: "Acompanhe cada lead pelas etapas do funil, do primeiro contato ao fechamento, com kanban e arrastar e soltar.",
    placement: "right",
    pillar: "gestao",
  },
  {
    id: "sidebar-crm-score",
    title: "Score de contatos",
    body: "Identifique os leads mais quentes em uma escala de 0 a 1.000, baseada em engajamento, intenção de compra e respostas no WhatsApp.",
    placement: "right",
    pillar: "gestao",
  },

  {
    id: "final",
    title: "Tudo pronto para escalar",
    body: "Você já conhece toda a operação Wiize. Falta apenas uma etapa para começar a gerar resultados reais.",
    placement: "center",
    pillar: "gestao",
  },
];

export const TOUR_STEP_IDS = TOUR_CONTENT.map((s) => s.id);
