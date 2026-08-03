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

import { TOUR_CONTENT, TourContentStep } from "@/lib/tourContent";

/* ------------------------------------------------------------------ */
/*  Steps — o CONTEÚDO vem de src/lib/tourContent.ts (fonte única      */
/*  compartilhada com o tour interno). Aqui só definimos o mock de     */
/*  tela/estado de cada passo, indexado pelo id do passo.              */
/* ------------------------------------------------------------------ */

type MockConfig = {
  target?: string;
  /** sobrescreve o placement quando o mock precisa de outro lado */
  placement?: Placement;
  screen: MockScreen;
  section?: MockSection;
  activeItem?: string;
  typed?: boolean;
  loading?: boolean;
  showLead?: boolean;
};

type PublicStep = TourContentStep & Omit<MockConfig, "placement"> & { placement: Placement };

const PILLARS = {
  cockpit: { label: "Cockpit", number: "01" },
  captacao: { label: "Captação", number: "02" },
  prospeccao: { label: "Prospecção", number: "03" },
  atendimento: { label: "Atendimento", number: "04" },
  gestao: { label: "Gestão", number: "05" },
} as const;

const MOCKS: Record<string, MockConfig> = {
  welcome: { screen: "cockpit", activeItem: "dashboard" },

  // ---- Cockpit ----
  "cockpit-overview": {
    target: '[data-ptour="cockpit-hero"]',
    screen: "cockpit",
    activeItem: "dashboard",
  },
  "cockpit-kpis": {
    target: '[data-ptour="cockpit-kpis"]',
    screen: "cockpit",
    activeItem: "dashboard",
  },
  "cockpit-forecast": {
    target: '[data-ptour="cockpit-forecast"]',
    screen: "cockpit",
    activeItem: "dashboard",
  },

  // ---- Captação ----
  "sidebar-oportunidades-intro": {
    target: '[data-ptour="sidebar-oportunidades"]',
    screen: "cockpit",
    section: "oportunidades",
  },
  "sidebar-oportunidades-buscar": {
    target: '[data-ptour="sidebar-oportunidades-buscar"]',
    screen: "cockpit",
    section: "oportunidades",
  },
  "search-empty": {
    target: '[data-ptour="search-keyword"]',
    placement: "bottom",
    screen: "search",
    section: "oportunidades",
    activeItem: "buscar",
  },
  "search-typing": {
    target: '[data-ptour="search-location"]',
    placement: "bottom",
    screen: "search",
    section: "oportunidades",
    activeItem: "buscar",
    typed: true,
  },
  "search-button": {
    target: '[data-ptour="search-button"]',
    placement: "bottom",
    screen: "search",
    section: "oportunidades",
    activeItem: "buscar",
    typed: true,
    loading: true,
  },

  // ---- Gestão / Diagnóstico ----
  "sidebar-oportunidades-gestao": {
    target: '[data-ptour="sidebar-oportunidades-gestao"]',
    screen: "search",
    section: "oportunidades",
  },
  management: {
    screen: "gestao",
    section: "oportunidades",
    activeItem: "gestao",
  },
  diagnosis: {
    target: '[data-ptour="lead-score-summary"]',
    placement: "left",
    screen: "gestao",
    section: "oportunidades",
    activeItem: "gestao",
    showLead: true,
  },
  "approach-message": {
    target: '[data-ptour="lead-approach-card"]',
    placement: "left",
    screen: "gestao",
    section: "oportunidades",
    activeItem: "gestao",
    showLead: true,
  },

  // ---- SDR Inteligente ----
  "sidebar-oportunidades-sdr": {
    target: '[data-ptour="sidebar-oportunidades-sdr"]',
    screen: "cockpit",
    section: "oportunidades",
  },

  // ---- Agenda ----
  "sidebar-agenda": {
    target: '[data-ptour="sidebar-agenda"]',
    screen: "cockpit",
  },

  // ---- Meta ----
  "sidebar-meta-intro": {
    target: '[data-ptour="sidebar-meta"]',
    screen: "cockpit",
    section: "meta",
  },
  "sidebar-meta-campanhas": {
    target: '[data-ptour="sidebar-meta-campanhas"]',
    screen: "cockpit",
    section: "meta",
  },
  "sidebar-meta-numeros": {
    target: '[data-ptour="sidebar-meta-numeros"]',
    screen: "cockpit",
    section: "meta",
  },

  // ---- Atendimento ----
  "sidebar-chat": {
    target: '[data-ptour="sidebar-chat"]',
    screen: "cockpit",
  },

  // ---- Automação ----
  "sidebar-automacao-intro": {
    target: '[data-ptour="sidebar-automacao"]',
    screen: "cockpit",
    section: "automacao",
  },
  "sidebar-automacao-fluxos": {
    target: '[data-ptour="sidebar-automacao-fluxos"]',
    screen: "cockpit",
    section: "automacao",
  },

  // ---- CRM ----
  "sidebar-crm-intro": {
    target: '[data-ptour="sidebar-crm"]',
    screen: "cockpit",
    section: "crm",
  },
  "sidebar-crm-pipeline": {
    target: '[data-ptour="sidebar-crm-pipeline"]',
    screen: "cockpit",
    section: "crm",
  },
  "sidebar-crm-score": {
    target: '[data-ptour="sidebar-crm-score"]',
    screen: "cockpit",
    section: "crm",
  },

  final: { screen: "cockpit" },
};

const STEPS: PublicStep[] = TOUR_CONTENT.map((content) => {
  const mock = MOCKS[content.id];
  if (!mock && import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.warn(
      `[TourGuiado] Passo "${content.id}" não possui mock configurado em MOCKS. Adicione-o para manter o tour público sincronizado.`
    );
  }
  const { placement: mockPlacement, ...rest } = mock ?? { screen: "cockpit" as MockScreen };
  return {
    ...content,
    ...rest,
    placement: (mockPlacement ?? content.placement) as Placement,
  };
});


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
