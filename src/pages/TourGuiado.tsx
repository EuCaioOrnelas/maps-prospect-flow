import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Rocket, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import LightThemeWrapper from "@/components/LightThemeWrapper";
import { TRIAL_DISABLED, notifyTrialDisabled } from "@/lib/trialStatus";
import {
  CockpitScreen,
  GestaoScreen,
  MockHeader,
  MockSidebar,
  MockScreen,
  MockSection,
  SearchScreen,
} from "@/components/tour/PublicAppMock";
import {
  Placement,
  SpotlightRing,
  usePopupPosition,
  usePublicSpotlight,
} from "@/components/tour/PublicTourSpotlight";

/* ------------------------------------------------------------------ */
/*  Steps — espelham exatamente o tour guiado interno da Wiize        */
/* ------------------------------------------------------------------ */

type PublicStep = {
  id: string;
  title: string;
  body: string;
  target?: string;
  placement?: Placement;
  screen: MockScreen;
  section?: MockSection;
  activeItem?: string;
  /** estados do mock */
  typed?: boolean;
  loading?: boolean;
  showLead?: boolean;
  pillar: "cockpit" | "captacao" | "prospeccao" | "atendimento" | "gestao";
};

const PILLARS = {
  cockpit: { label: "Cockpit", number: "01" },
  captacao: { label: "Captação", number: "02" },
  prospeccao: { label: "Prospecção", number: "03" },
  atendimento: { label: "Atendimento", number: "04" },
  gestao: { label: "Gestão", number: "05" },
} as const;

const STEPS: PublicStep[] = [
  {
    id: "welcome",
    title: "Bem-vindo à Wiize",
    body: "Vamos te apresentar a sua nova operação comercial em quatro pilares: captação, prospecção, atendimento e gestão. Em poucos minutos você entende exatamente como cada parte trabalha por você.",
    placement: "center",
    screen: "cockpit",
    activeItem: "dashboard",
    pillar: "cockpit",
  },

  // ---- Cockpit ----
  {
    id: "cockpit-overview",
    title: "Cockpit de Crescimento",
    body: "Esta é a sua central de comando. Aqui você acompanha o impacto financeiro gerado, a curva de leads captados e o resultado consolidado da sua operação em tempo real.",
    target: '[data-ptour="cockpit-hero"]',
    placement: "bottom",
    screen: "cockpit",
    activeItem: "dashboard",
    pillar: "cockpit",
  },
  {
    id: "cockpit-kpis",
    title: "Indicadores executivos",
    body: "Receita potencial, leads quentes do dia, saúde da operação e o tempo que a IA economizou para você. Tudo o que precisa saber em quatro cartões.",
    target: '[data-ptour="cockpit-kpis"]',
    placement: "top",
    screen: "cockpit",
    activeItem: "dashboard",
    pillar: "cockpit",
  },
  {
    id: "cockpit-forecast",
    title: "Projeção e funil",
    body: "À esquerda, a projeção de receita por nível de score. À direita, o funil operacional completo: do lead captado à oportunidade gerada.",
    target: '[data-ptour="cockpit-forecast"]',
    placement: "top",
    screen: "cockpit",
    activeItem: "dashboard",
    pillar: "cockpit",
  },

  // ---- Captação ----
  {
    id: "sidebar-oportunidades-intro",
    title: "Captação de leads com Prospecção IA",
    body: "Tudo começa no menu Prospecção IA. É aqui que a IA busca novas empresas, analisa cada lead e deixa a abordagem pronta. Vamos entrar agora.",
    target: '[data-ptour="sidebar-oportunidades"]',
    placement: "right",
    screen: "cockpit",
    section: "oportunidades",
    pillar: "captacao",
  },
  {
    id: "sidebar-oportunidades-buscar",
    title: "Item Buscar",
    body: "Este é o ponto de entrada da sua captação. Em Buscar você encontra empresas reais do Google Maps prontas para serem prospectadas. Vamos abrir essa página.",
    target: '[data-ptour="sidebar-oportunidades-buscar"]',
    placement: "right",
    screen: "cockpit",
    section: "oportunidades",
    pillar: "captacao",
  },
  {
    id: "search-empty",
    title: "Defina o nicho",
    body: "Comece pela palavra-chave do nicho que você quer captar. Exemplo: clínicas, contabilidades, restaurantes ou imobiliárias.",
    target: '[data-ptour="search-keyword"]',
    placement: "bottom",
    screen: "search",
    section: "oportunidades",
    activeItem: "buscar",
    pillar: "captacao",
  },
  {
    id: "search-typing",
    title: "Escolha a cidade",
    body: "Agora defina a localização que deseja prospectar. A busca pode ser local, nacional ou internacional.",
    target: '[data-ptour="search-location"]',
    placement: "bottom",
    screen: "search",
    section: "oportunidades",
    activeItem: "buscar",
    typed: true,
    pillar: "captacao",
  },
  {
    id: "search-button",
    title: "Prospecte oportunidades",
    body: "Com os campos preenchidos, basta clicar aqui para a Wiize encontrar empresas qualificadas para sua abordagem.",
    target: '[data-ptour="search-button"]',
    placement: "bottom",
    screen: "search",
    section: "oportunidades",
    activeItem: "buscar",
    typed: true,
    loading: true,
    pillar: "captacao",
  },

  // ---- Gestão / Diagnóstico ----
  {
    id: "sidebar-oportunidades-gestao",
    title: "Gestão da Prospecção IA (Captação)",
    body: "Toda empresa captada vai parar aqui — ainda na etapa de Captação. É onde a IA analisa cada lead em profundidade antes de virar negócio. Vamos entrar.",
    target: '[data-ptour="sidebar-oportunidades-gestao"]',
    placement: "right",
    screen: "search",
    section: "oportunidades",
    pillar: "captacao",
  },
  {
    id: "management",
    title: "Gestão da Prospecção IA (Captação)",
    body: "Esta tela ainda faz parte da Captação: cada empresa recebe uma pontuação, um diagnóstico de pontos fortes e fracos e uma probabilidade de fechamento. A gestão do funil de vendas (CRM, pipeline e score de contatos) acontece em outro menu, que veremos mais à frente.",
    placement: "center",
    screen: "gestao",
    section: "oportunidades",
    activeItem: "gestao",
    pillar: "captacao",
  },
  {
    id: "diagnosis",
    title: "Diagnóstico inteligente",
    body: "Abrimos um lead de exemplo. Veja o score total (0–100), a quebra por dimensão (estrutura digital, reputação e potencial) e a probabilidade de conversão.",
    target: '[data-ptour="lead-score-summary"]',
    placement: "left",
    screen: "gestao",
    section: "oportunidades",
    activeItem: "gestao",
    showLead: true,
    pillar: "captacao",
  },
  {
    id: "approach-message",
    title: "Abordagem gerada por IA",
    body: "Com base no diagnóstico, a Wiize escreve uma mensagem personalizada para o primeiro contato. Você pode copiar, ajustar ou enviar direto pelo WhatsApp.",
    target: '[data-ptour="lead-approach-card"]',
    placement: "left",
    screen: "gestao",
    section: "oportunidades",
    activeItem: "gestao",
    showLead: true,
    pillar: "captacao",
  },

  // ---- SDR Inteligente ----
  {
    id: "sidebar-oportunidades-sdr",
    title: "SDR Inteligente",
    body: "Aqui vive o seu pré-vendedor de IA: ele assume a conversa no WhatsApp, qualifica o lead, quebra objeções, faz follow-up sozinho e agenda a reunião com o seu time — 24 horas por dia, sem cansar.",
    target: '[data-ptour="sidebar-oportunidades-sdr"]',
    placement: "right",
    screen: "cockpit",
    section: "oportunidades",
    pillar: "captacao",
  },

  // ---- Agenda ----
  {
    id: "sidebar-agenda",
    title: "Agenda comercial",
    body: "A Agenda é integrada ao SDR Inteligente: ele consulta a disponibilidade real do seu time, oferece horários livres na conversa e cria a reunião automaticamente — com lembretes por e-mail e visões de dia, semana, mês e lista.",
    target: '[data-ptour="sidebar-agenda"]',
    placement: "right",
    screen: "cockpit",
    pillar: "captacao",
  },

  // ---- Meta ----
  {
    id: "sidebar-meta-intro",
    title: "Meta — API Oficial do WhatsApp",
    body: "Tudo o que envolve a Meta Cloud API fica neste menu: dashboard de entregas, campanhas, números e configurações.",
    target: '[data-ptour="sidebar-meta"]',
    placement: "right",
    screen: "cockpit",
    section: "meta",
    pillar: "prospeccao",
  },
  {
    id: "sidebar-meta-campanhas",
    title: "Campanhas oficiais",
    body: "Dispare templates aprovados pela Meta para prospecção, nutrição e reativação — com entregabilidade garantida.",
    target: '[data-ptour="sidebar-meta-campanhas"]',
    placement: "right",
    screen: "cockpit",
    section: "meta",
    pillar: "prospeccao",
  },
  {
    id: "sidebar-meta-numeros",
    title: "Números & WABA",
    body: "Conecte e gerencie seus números oficiais ligados à sua conta WABA (WhatsApp Business Account).",
    target: '[data-ptour="sidebar-meta-numeros"]',
    placement: "right",
    screen: "cockpit",
    section: "meta",
    pillar: "prospeccao",
  },

  // ---- Atendimento ----
  {
    id: "sidebar-chat",
    title: "Atendimento unificado",
    body: "Todas as conversas em um único lugar. Responda manualmente ou deixe a IA conduzir o atendimento por você, 24 horas por dia.",
    target: '[data-ptour="sidebar-chat"]',
    placement: "right",
    screen: "cockpit",
    pillar: "atendimento",
  },

  // ---- Automação ----
  {
    id: "sidebar-automacao-intro",
    title: "Automação completa",
    body: "Aqui você cria fluxos conversacionais, configura agentes de IA e prepara seus números para o envio em volume. Vamos passar por cada um.",
    target: '[data-ptour="sidebar-automacao"]',
    placement: "right",
    screen: "cockpit",
    section: "automacao",
    pillar: "atendimento",
  },
  {
    id: "sidebar-automacao-fluxos",
    title: "Fluxos automáticos",
    body: "Construa jornadas conversacionais com mensagens, condições, esperas e integrações nativas com Google e WhatsApp.",
    target: '[data-ptour="sidebar-automacao-fluxos"]',
    placement: "right",
    screen: "cockpit",
    section: "automacao",
    pillar: "atendimento",
  },

  // ---- CRM ----
  {
    id: "sidebar-crm-intro",
    title: "Gestão do funil (CRM)",
    body: "No menu CRM você acompanha todo o funil de vendas e a qualificação automática dos seus leads.",
    target: '[data-ptour="sidebar-crm"]',
    placement: "right",
    screen: "cockpit",
    section: "crm",
    pillar: "gestao",
  },
  {
    id: "sidebar-crm-pipeline",
    title: "Pipeline visual",
    body: "Acompanhe cada lead pelas etapas do funil, do primeiro contato ao fechamento, com kanban e arrastar e soltar.",
    target: '[data-ptour="sidebar-crm-pipeline"]',
    placement: "right",
    screen: "cockpit",
    section: "crm",
    pillar: "gestao",
  },
  {
    id: "sidebar-crm-score",
    title: "Score de contatos",
    body: "Identifique os leads mais quentes em uma escala de 0 a 1.000, baseada em engajamento, intenção de compra e respostas no WhatsApp.",
    target: '[data-ptour="sidebar-crm-score"]',
    placement: "right",
    screen: "cockpit",
    section: "crm",
    pillar: "gestao",
  },

  {
    id: "final",
    title: "Tudo pronto para escalar",
    body: "Você já conhece toda a operação Wiize. Falta apenas uma etapa para começar a gerar resultados reais no seu comercial.",
    placement: "center",
    screen: "cockpit",
    pillar: "gestao",
  },
];

function splitBody(body: string) {
  const match = body.trim().match(/^(.+?[.!?])\s+(.+)$/s);
  return match ? [match[1].trim(), match[2].trim()] : [body.trim()];
}

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default function TourGuiado() {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const step = STEPS[index];
  const total = STEPS.length;
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const popupRef = useRef<HTMLDivElement>(null);

  const rect = usePublicSpotlight(step.target, [step.id]);
  const popupStyle = usePopupPosition(rect, step.placement ?? "bottom", popupRef);

  const next = () => setIndex((i) => Math.min(i + 1, total - 1));
  const prev = () => setIndex((i) => Math.max(i - 1, 0));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Enter") next();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "Escape") navigate("/");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const startTrial = () => {
    if (TRIAL_DISABLED) {
      notifyTrialDisabled();
      return;
    }
    navigate("/signup");
  };

  const pillar = PILLARS[step.pillar];
  const progress = useMemo(() => ((index + 1) / total) * 100, [index, total]);

  return (
    <LightThemeWrapper>
      <SEO
        title="Tour guiado da Wiize | Veja a plataforma por dentro"
        description="Percorra o mesmo tour guiado que os clientes veem ao entrar na Wiize: cockpit, prospecção com IA, SDR Inteligente, agenda, WhatsApp oficial, CRM e automações."
      />

      <div className="fixed inset-0 flex flex-col overflow-hidden bg-background">
        {/* Mock app */}
        <div className="flex flex-1 overflow-hidden">
          <MockSidebar openSection={step.section ?? null} activeItem={step.activeItem} />
          <div className="flex min-w-0 flex-1 flex-col">
            <MockHeader />
            <main className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="mx-auto max-w-6xl">
                {step.screen === "cockpit" && <CockpitScreen />}
                {step.screen === "search" && <SearchScreen typed={!!step.typed} loading={!!step.loading} />}
                {step.screen === "gestao" && <GestaoScreen showLead={!!step.showLead} />}
              </div>
            </main>
          </div>
        </div>

        {/* Spotlight */}
        <SpotlightRing rect={step.placement === "center" ? null : rect} />

        {/* Popup */}
        {isLast ? (
          <div
            className="fixed left-1/2 top-1/2 w-[min(560px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-[28px] border border-border bg-card p-7 text-center shadow-2xl"
            style={{ zIndex: 70 }}
          >
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Rocket size={22} />
            </div>
            <h2 className="text-2xl font-bold text-foreground">{step.title}</h2>
            <p className="mx-auto mt-2 max-w-md text-[15px] leading-relaxed text-muted-foreground">{step.body}</p>
            <div className="mt-6 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
              <Button size="lg" onClick={startTrial} className="w-full sm:w-auto">
                Começar teste grátis de 7 dias
                <ArrowRight size={16} className="ml-1.5" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => setIndex(0)} className="w-full sm:w-auto">
                Rever o tour
              </Button>
            </div>
            <Link to="/" className="mt-4 inline-block text-xs text-muted-foreground underline">
              Voltar para o site
            </Link>
          </div>
        ) : (
          <div
            ref={popupRef}
            className="fixed rounded-[28px] border border-border/60 bg-card/95 px-6 py-5 text-card-foreground"
            style={{
              ...popupStyle,
              zIndex: 70,
              boxShadow: "0 24px 80px hsl(var(--foreground) / 0.14)",
              transition: "top 460ms cubic-bezier(0.2,0.8,0.2,1), left 460ms cubic-bezier(0.2,0.8,0.2,1)",
            }}
          >
            <div className="mb-2.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              <Sparkles size={13} />
              Etapa {pillar.number} • {pillar.label}
            </div>
            <h3 className="mb-2.5 text-2xl font-bold leading-[1.15] tracking-tight text-foreground">{step.title}</h3>
            <div className="space-y-2 text-[15px] leading-[1.65] text-muted-foreground">
              {splitBody(step.body).map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </div>
        )}

        {/* Controls */}
        {!isLast && (
          <div className="fixed bottom-5 left-1/2 -translate-x-1/2" style={{ zIndex: 70 }}>
            <div className="flex items-center gap-3 rounded-full border border-border/60 bg-card/95 py-2.5 pl-3 pr-2.5 shadow-[0_18px_50px_hsl(var(--foreground)/0.12)]">
              <Button size="sm" variant="ghost" onClick={prev} disabled={isFirst} className="rounded-full">
                <ArrowLeft size={15} className="mr-1" />
                Voltar
              </Button>
              <div className="hidden items-center gap-2 sm:flex">
                <div className="h-1.5 w-28 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                </div>
                <span className="text-xs text-muted-foreground">
                  {index + 1}/{total}
                </span>
              </div>
              <Button size="sm" onClick={next} className="rounded-full">
                {index === 0 ? "Começar tour" : "Avançar"}
                <ArrowRight size={15} className="ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Sair */}
        <Link
          to="/"
          className="fixed right-4 top-4 flex items-center gap-1.5 rounded-full border border-border/60 bg-card/95 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm hover:text-foreground"
          style={{ zIndex: 71 }}
        >
          <X size={13} />
          Sair do tour
        </Link>
      </div>
    </LightThemeWrapper>
  );
}
