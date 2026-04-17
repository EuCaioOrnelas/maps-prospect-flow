import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useGuidedTour } from "@/hooks/useGuidedTour";
import { Button } from "@/components/ui/button";
import {
  Search,
  MapPin,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Building2,
  Phone,
  Star,
  Loader2,
  Brain,
  MessageSquare,
  Send,
  Users,
  Bot,
  Megaphone,
  Workflow,
  Trophy,
  LayoutDashboard,
  Handshake,
  Target,
  TrendingUp,
  Zap,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ============================================================
 *  Wiize Guided Tour — spotlight em "página simulada"
 *  Estilo do print: overlay escuro + área destacada + popup
 * ============================================================ */

export function GuidedTour() {
  const { isActive, step, totalSteps, next, prev, finish } = useGuidedTour();

  if (!isActive) return null;

  const isLast = step === totalSteps - 1;

  return createPortal(
    <div className="fixed inset-0 z-[200] overflow-hidden bg-[hsl(220,30%,5%)] text-foreground">
      {/* Conteúdo simulado por trás */}
      <SimulatedScene step={step} />

      {/* Overlay escuro global (acima da cena) */}
      <div className="absolute inset-0 bg-black/65 pointer-events-none" />

      {/* Spotlight + popup específicos do step */}
      <StepSpotlight step={step} />

      {/* Footer fixo com navegação */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[210] flex items-center gap-3 px-5 py-3 rounded-full bg-card/95 backdrop-blur-xl border border-border/60 shadow-2xl">
        <Button
          variant="ghost"
          size="sm"
          onClick={prev}
          disabled={step === 0}
          className="rounded-full text-muted-foreground hover:text-foreground disabled:opacity-30"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar
        </Button>

        <div className="flex items-center gap-1.5 px-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === step ? "w-6 bg-primary" : i < step ? "w-1.5 bg-primary/60" : "w-1.5 bg-muted-foreground/30"
              )}
            />
          ))}
        </div>

        {isLast ? (
          <Button onClick={finish} size="sm" className="rounded-full px-5 bg-primary hover:bg-primary/90">
            Escalar minha operação
            <Sparkles className="h-4 w-4 ml-1.5" />
          </Button>
        ) : (
          <Button onClick={next} size="sm" className="rounded-full px-5 bg-primary hover:bg-primary/90">
            Próximo
            <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        )}
      </div>
    </div>,
    document.body
  );
}

/* ============================================================
 *  CENA SIMULADA — muda conforme o step
 * ============================================================ */
function SimulatedScene({ step }: { step: number }) {
  // Sidebar visível a partir do step 6
  const showSidebar = step >= 6;
  // Conteúdo principal
  let content: ReactNodeContent = "welcome";
  if (step === 1) content = "search-empty";
  else if (step === 2) content = "search-filling";
  else if (step === 3) content = "search-results";
  else if (step === 4) content = "diagnosis";
  else if (step === 5) content = "message";
  else if (step >= 6) content = "sidebar-bg";

  return (
    <div className="absolute inset-0 flex">
      {/* Sidebar simulado */}
      {showSidebar && <FakeSidebar activeStep={step} />}

      {/* Área principal */}
      <div className={cn("flex-1 relative", showSidebar && "ml-[240px]")}>
        {content === "welcome" && <FakeDashboardHero />}
        {(content === "search-empty" || content === "search-filling" || content === "search-results") && (
          <FakeSearchPage step={step} />
        )}
        {content === "diagnosis" && <FakeDiagnosisPage />}
        {content === "message" && <FakeMessagePage />}
        {content === "sidebar-bg" && <FakeDashboardHero dimmed />}
      </div>
    </div>
  );
}

type NodeContent = "welcome" | "search-empty" | "search-filling" | "search-results" | "diagnosis" | "message" | "sidebar-bg";
type ReactNodeContent = NodeContent;

/* ============================================================
 *  STEP SPOTLIGHT — popup posicionado + cutout opcional
 * ============================================================ */
function StepSpotlight({ step }: { step: number }) {
  // Step 0: welcome popup centralizado, sem spotlight
  if (step === 0) {
    return (
      <CenteredPopup>
        <WelcomeContent />
      </CenteredPopup>
    );
  }

  if (step === 1) {
    return (
      <SpotlightPopup
        target={{ left: "50%", top: 200, width: 720, height: 280, translateX: "-50%" }}
        popup={{ left: "50%", top: 510, translateX: "-50%" }}
      >
        <PopupBody
          stepLabel="Passo 2 de 12"
          title="Defina seu nicho e região"
          desc="A Wiize encontra empresas reais a partir do nicho e da localização que você quiser prospectar. Vamos preencher juntos."
        />
      </SpotlightPopup>
    );
  }

  if (step === 2) {
    return (
      <SpotlightPopup
        target={{ left: "50%", top: 200, width: 720, height: 280, translateX: "-50%" }}
        popup={{ left: "50%", top: 510, translateX: "-50%" }}
      >
        <PopupBody
          stepLabel="Passo 3 de 12"
          title="Buscando empresas reais"
          desc="A Wiize está pesquisando empresas qualificadas no Google Maps usando os filtros que você definiu."
        />
      </SpotlightPopup>
    );
  }

  if (step === 3) {
    return (
      <SpotlightPopup
        target={{ left: "50%", top: 130, width: 800, height: 480, translateX: "-50%" }}
        popup={{ right: 40, top: 160 }}
      >
        <PopupBody
          stepLabel="Passo 4 de 12"
          title="Leads qualificados em segundos"
          desc="Pronto! 47 oportunidades reais encontradas. Agora a IA vai analisar uma a uma para identificar as melhores."
        />
      </SpotlightPopup>
    );
  }

  if (step === 4) {
    return (
      <SpotlightPopup
        target={{ left: 60, top: 100, width: 760, height: 540 }}
        popup={{ right: 40, top: 130 }}
      >
        <PopupBody
          stepLabel="Passo 5 de 12"
          title="Diagnóstico automático com IA"
          desc="A IA analisa cada lead — score, probabilidade de fechamento, oportunidade detectada e ação recomendada. Tudo automático, lead por lead."
        />
      </SpotlightPopup>
    );
  }

  if (step === 5) {
    return (
      <SpotlightPopup
        target={{ left: 60, top: 100, width: 760, height: 560 }}
        popup={{ right: 40, top: 140 }}
      >
        <PopupBody
          stepLabel="Passo 6 de 12"
          title="Mensagem de abordagem gerada por IA"
          desc="A IA escreve uma mensagem personalizada com base no diagnóstico do lead. Pronta para enviar com 1 clique — sem precisar pensar no copy."
        />
      </SpotlightPopup>
    );
  }

  if (step === 6) {
    return (
      <SpotlightPopup
        target={{ left: 0, top: 0, width: 240, height: 800 }}
        popup={{ left: 280, top: 120 }}
      >
        <PopupBody
          stepLabel="Passo 7 de 12"
          title="Sua central de comando"
          desc="Tudo na Wiize fica acessível pelo menu lateral. Vamos passar pelas 4 áreas que estruturam sua operação comercial."
        />
      </SpotlightPopup>
    );
  }

  if (step === 7) {
    return (
      <SpotlightPopup
        target={{ left: 8, top: 252, width: 224, height: 128 }}
        popup={{ left: 280, top: 240 }}
      >
        <PopupBody
          stepLabel="Passo 8 de 12"
          title="Campanhas: converta leads em conversas"
          desc={
            <>
              <strong className="text-foreground">Prospecção (Outbound):</strong> envio em massa pelos seus números do WhatsApp para leads frios.
              <br /><br />
              <strong className="text-foreground">Relacionamento (Meta API):</strong> mensagens oficiais com templates aprovados — exige conta Meta Business.
              <br /><br />
              Use as mensagens geradas pela IA ou crie suas próprias para campanhas em massa.
            </>
          }
        />
      </SpotlightPopup>
    );
  }

  if (step === 8) {
    return (
      <SpotlightPopup
        target={{ left: 8, top: 388, width: 224, height: 128 }}
        popup={{ left: 280, top: 380 }}
      >
        <PopupBody
          stepLabel="Passo 9 de 12"
          title="CRM: organize quem está pronto para comprar"
          desc={
            <>
              <strong className="text-foreground">Pipeline:</strong> kanban completo com todas as etapas do seu funil.
              <br /><br />
              <strong className="text-foreground">Score:</strong> a IA pontua cada lead por engajamento, intenção e risco — você sabe exatamente quem está quente.
            </>
          }
        />
      </SpotlightPopup>
    );
  }

  if (step === 9) {
    return (
      <SpotlightPopup
        target={{ left: 8, top: 524, width: 224, height: 56 }}
        popup={{ left: 280, top: 510 }}
      >
        <PopupBody
          stepLabel="Passo 10 de 12"
          title="Chat: atenda em tempo real"
          desc="Caixa de entrada unificada para todas as suas conversas no WhatsApp — com histórico completo e integração direta com o CRM."
        />
      </SpotlightPopup>
    );
  }

  if (step === 10) {
    return (
      <SpotlightPopup
        target={{ left: 8, top: 588, width: 224, height: 128 }}
        popup={{ left: 280, top: 580 }}
      >
        <PopupBody
          stepLabel="Passo 11 de 12"
          title="Automação: atendimento sem esforço"
          desc={
            <>
              <strong className="text-foreground">Fluxos:</strong> jornadas automáticas para qualificar, agendar e converter.
              <br /><br />
              <strong className="text-foreground">Agentes IA:</strong> seu time de IA trabalha 24/7 respondendo, qualificando e movendo leads no CRM.
            </>
          }
        />
      </SpotlightPopup>
    );
  }

  // step 11 — final
  return (
    <CenteredPopup>
      <FinalContent />
    </CenteredPopup>
  );
}

/* ============================================================
 *  POPUP COMPONENTS
 * ============================================================ */
function CenteredPopup({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-[205] flex items-center justify-center p-4 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-xl bg-card border border-border/60 rounded-3xl shadow-2xl p-8 sm:p-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {children}
      </div>
    </div>
  );
}

interface SpotlightPopupProps {
  target: {
    left?: number | string;
    top?: number | string;
    right?: number | string;
    width: number;
    height: number;
    translateX?: string;
  };
  popup: {
    left?: number | string;
    top?: number | string;
    right?: number | string;
    translateX?: string;
  };
  children: React.ReactNode;
}

function SpotlightPopup({ target, popup, children }: SpotlightPopupProps) {
  return (
    <>
      {/* Spotlight halo around the target — sits ABOVE the dark overlay */}
      <div
        className="absolute z-[202] rounded-2xl pointer-events-none animate-in fade-in duration-500"
        style={{
          left: target.left,
          top: target.top,
          right: target.right,
          width: target.width,
          height: target.height,
          transform: target.translateX ? `translateX(${target.translateX})` : undefined,
          boxShadow:
            "0 0 0 9999px rgba(0,0,0,0.55), 0 0 0 2px hsl(var(--primary) / 0.7), 0 0 60px hsl(var(--primary) / 0.4)",
          borderRadius: 16,
        }}
      />

      {/* Popup */}
      <div
        className="absolute z-[206] w-[360px] animate-in fade-in slide-in-from-bottom-2 duration-400"
        style={{
          left: popup.left,
          top: popup.top,
          right: popup.right,
          transform: popup.translateX ? `translateX(${popup.translateX})` : undefined,
        }}
      >
        <div className="bg-card border border-border/60 rounded-2xl shadow-2xl p-5 pointer-events-auto">
          {children}
        </div>
      </div>
    </>
  );
}

function PopupBody({
  stepLabel,
  title,
  desc,
}: {
  stepLabel: string;
  title: string;
  desc: React.ReactNode;
}) {
  return (
    <>
      <p className="text-[11px] uppercase tracking-wider text-primary font-semibold mb-1.5">
        {stepLabel}
      </p>
      <h3 className="text-lg font-bold tracking-tight mb-2 leading-snug">{title}</h3>
      <div className="text-sm text-muted-foreground leading-relaxed">{desc}</div>
    </>
  );
}

/* ============================================================
 *  WELCOME + FINAL CONTENT
 * ============================================================ */
function WelcomeContent() {
  const pillars = [
    { icon: Search, label: "Captação" },
    { icon: Send, label: "Prospecção" },
    { icon: Users, label: "Gestão" },
    { icon: Bot, label: "Atendimento" },
  ];
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-5">
        <Sparkles className="h-7 w-7 text-primary" />
      </div>
      <p className="text-[11px] uppercase tracking-wider text-primary font-semibold mb-2">
        Passo 1 de 12
      </p>
      <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
        Bem-vindo à <span className="text-primary">Wiize</span>
      </h2>
      <p className="text-muted-foreground text-base mb-8 leading-relaxed max-w-md mx-auto">
        Sua operação comercial em 4 pilares. Em alguns minutos você verá como transformar leads em receita previsível.
      </p>

      <div className="grid grid-cols-4 gap-3 mb-2">
        {pillars.map((p) => (
          <div
            key={p.label}
            className="p-3 rounded-2xl border border-border/60 bg-card/50"
          >
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center mb-2 mx-auto">
              <p.icon className="h-4 w-4 text-primary" />
            </div>
            <p className="text-xs font-medium">{p.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function FinalContent() {
  const pillars = [
    { icon: Search, label: "Captação" },
    { icon: Send, label: "Prospecção" },
    { icon: Users, label: "Gestão" },
    { icon: Bot, label: "Atendimento" },
  ];
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-5">
        <CheckCircle2 className="h-7 w-7 text-primary" />
      </div>
      <p className="text-[11px] uppercase tracking-wider text-primary font-semibold mb-2">
        Passo 12 de 12
      </p>
      <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
        Você já conhece toda a operação Wiize
      </h2>
      <p className="text-muted-foreground text-base mb-8 leading-relaxed max-w-md mx-auto">
        Continue de onde parou. Sua próxima oportunidade está a um clique.
      </p>

      <div className="grid grid-cols-4 gap-3">
        {pillars.map((p) => (
          <div
            key={p.label}
            className="p-3 rounded-xl border border-primary/30 bg-primary/5 flex flex-col items-center gap-1.5"
          >
            <p.icon className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium">{p.label}</span>
            <CheckCircle2 className="h-3 w-3 text-primary" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
 *  FAKE SCENES
 * ============================================================ */
function FakeDashboardHero({ dimmed }: { dimmed?: boolean }) {
  return (
    <div className={cn("h-full w-full p-10 bg-background", dimmed && "opacity-90")}>
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Dashboard</h1>
        <p className="text-muted-foreground mb-8">Visão geral da sua operação comercial</p>
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: "Leads captados", value: "1.284", icon: Users },
            { label: "Conversas", value: "342", icon: MessageSquare },
            { label: "Em negociação", value: "47", icon: Target },
            { label: "Receita projetada", value: "R$ 184K", icon: TrendingUp },
          ].map((kpi) => (
            <div key={kpi.label} className="p-5 rounded-2xl border border-border/60 bg-card">
              <kpi.icon className="h-4 w-4 text-primary mb-3" />
              <p className="text-xs text-muted-foreground mb-1">{kpi.label}</p>
              <p className="text-2xl font-bold">{kpi.value}</p>
            </div>
          ))}
        </div>
        <div className="h-64 rounded-2xl border border-border/60 bg-card p-5">
          <p className="text-sm font-semibold mb-4">Evolução do funil</p>
          <div className="flex items-end gap-2 h-44">
            {[40, 65, 50, 80, 70, 95, 85].map((h, i) => (
              <div key={i} className="flex-1 rounded-t-lg bg-primary/40" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FakeSearchPage({ step }: { step: number }) {
  const fillNiche = step >= 2;
  const fillCity = step >= 2;
  const showResults = step >= 3;
  const showAnalyzing = step === 2;

  return (
    <div className="h-full w-full overflow-hidden bg-background">
      <div className="max-w-6xl mx-auto p-10">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Buscar oportunidades</h1>
        <p className="text-muted-foreground mb-8">Encontre empresas reais por nicho e localização.</p>

        {/* Search box */}
        <div className="rounded-2xl border border-border/60 bg-card p-6 mb-6 max-w-3xl mx-auto">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1.5 block">
                Nicho
              </label>
              <div className="flex items-center gap-2 px-3 h-11 rounded-xl border border-border bg-background">
                <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                <TypingText
                  text="Clínicas de estética"
                  active={fillNiche}
                  className="text-sm font-medium"
                />
              </div>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1.5 block">
                Cidade / Região
              </label>
              <div className="flex items-center gap-2 px-3 h-11 rounded-xl border border-border bg-background">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                <TypingText
                  text="São Paulo, SP"
                  active={fillCity}
                  delay={900}
                  className="text-sm font-medium"
                />
              </div>
            </div>
          </div>
          <button
            className={cn(
              "w-full h-11 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all",
              showAnalyzing
                ? "bg-muted text-foreground"
                : "bg-primary text-primary-foreground"
            )}
          >
            {showAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Buscando empresas reais…
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Buscar oportunidades
              </>
            )}
          </button>
        </div>

        {/* Results list */}
        {showResults && (
          <div className="rounded-2xl border border-border/60 bg-card p-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold">
                <span className="text-primary">47 oportunidades</span> encontradas
              </p>
              <span className="text-xs text-muted-foreground">Página 1 de 5</span>
            </div>
            <div className="space-y-2">
              {FAKE_LEADS.slice(0, 6).map((lead, i) => (
                <FakeLeadRow key={i} lead={lead} delay={i * 80} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const FAKE_LEADS = [
  { name: "Estética Bella Vita", city: "São Paulo, SP", phone: "(11) 9 8765-4321", rating: 4.8, reviews: 142 },
  { name: "Clínica Renova Estética", city: "São Paulo, SP", phone: "(11) 9 7654-3210", rating: 4.9, reviews: 287 },
  { name: "Spa & Estética Lumière", city: "São Paulo, SP", phone: "(11) 9 6543-2109", rating: 4.7, reviews: 98 },
  { name: "Studio Beauty Care", city: "São Paulo, SP", phone: "(11) 9 5432-1098", rating: 4.6, reviews: 64 },
  { name: "Clínica Pure Skin", city: "São Paulo, SP", phone: "(11) 9 4321-0987", rating: 5.0, reviews: 312 },
  { name: "Espaço Estética Vitória", city: "São Paulo, SP", phone: "(11) 9 3210-9876", rating: 4.5, reviews: 51 },
];

function FakeLeadRow({
  lead,
  delay,
}: {
  lead: (typeof FAKE_LEADS)[number];
  delay: number;
}) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  if (!show) return <div className="h-14" />;
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-background/40 animate-in fade-in slide-in-from-left-2 duration-300">
      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
        <Building2 className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{lead.name}</p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {lead.city}
          </span>
          <span className="flex items-center gap-1">
            <Phone className="h-3 w-3" />
            {lead.phone}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1 text-xs">
        <Star className="h-3.5 w-3.5 fill-primary text-primary" />
        <span className="font-semibold">{lead.rating}</span>
        <span className="text-muted-foreground">({lead.reviews})</span>
      </div>
    </div>
  );
}

function FakeDiagnosisPage() {
  const items = [
    { label: "Score de oportunidade", value: "92 / 100", icon: Trophy, color: "text-primary" },
    { label: "Probabilidade de fechar", value: "Alta · 78%", icon: Target, color: "text-primary" },
    { label: "Nível de oportunidade", value: "Premium", icon: Star, color: "text-primary" },
    { label: "Sinal detectado", value: "Site sem agendamento online", icon: Zap, color: "text-primary" },
    { label: "Segurança da abordagem", value: "Validada", icon: ShieldCheck, color: "text-primary" },
  ];
  return (
    <div className="h-full w-full overflow-hidden bg-background">
      <div className="max-w-6xl mx-auto p-10">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <span>Oportunidades</span>
          <span>›</span>
          <span>Gestão</span>
          <span>›</span>
          <span className="text-foreground">Estética Bella Vita</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-1">Estética Bella Vita</h1>
        <p className="text-muted-foreground mb-6 flex items-center gap-3">
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" /> São Paulo, SP
          </span>
          <span className="flex items-center gap-1">
            <Phone className="h-3.5 w-3.5" /> (11) 9 8765-4321
          </span>
        </p>

        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="h-5 w-5 text-primary" />
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">
              Diagnóstico gerado pela IA
            </p>
            <Loader2 className="h-3.5 w-3.5 text-primary animate-spin ml-auto" />
            <span className="text-xs text-muted-foreground">Analisando lead 1 de 47</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {items.map((it, i) => (
              <FadeInItem key={it.label} delay={i * 200}>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-background border border-border/40">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <it.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">{it.label}</p>
                    <p className="text-sm font-semibold">{it.value}</p>
                  </div>
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                </div>
              </FadeInItem>
            ))}
          </div>
        </div>

        <FadeInItem delay={1100}>
          <div className="rounded-2xl border border-border/60 bg-card p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">
              Ação recomendada
            </p>
            <p className="text-sm leading-relaxed">
              Abordar destacando que sua plataforma resolve o agendamento online — principal gap identificado no site da clínica. Mencionar cases de aumento de 30% na taxa de retenção.
            </p>
          </div>
        </FadeInItem>
      </div>
    </div>
  );
}

function FakeMessagePage() {
  return (
    <div className="h-full w-full overflow-hidden bg-background">
      <div className="max-w-6xl mx-auto p-10">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <span>Estética Bella Vita</span>
          <span>›</span>
          <span className="text-foreground">Mensagem de abordagem</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-6">Mensagem gerada por IA</h1>

        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-primary" />
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">
              IA escrevendo mensagem personalizada
            </p>
            <Loader2 className="h-3.5 w-3.5 text-primary animate-spin ml-auto" />
          </div>
          <div className="rounded-xl bg-background border border-border/40 p-5 min-h-[280px] text-sm leading-relaxed text-foreground/90">
            <TypingParagraph
              paragraphs={[
                "Olá! Vi que vocês da Estética Bella Vita atendem em São Paulo e têm uma reputação incrível no Google (4.8 estrelas com mais de 140 avaliações). Parabéns!",
                "Notei que o site de vocês ainda não tem agendamento online — e isso costuma ser um dos maiores gargalos para clínicas de estética que querem escalar atendimento sem aumentar a equipe.",
                "Trabalhamos com clínicas como a sua que aumentaram em até 30% a taxa de retenção depois de automatizar agendamento e relacionamento.",
                "Faz sentido conversarmos 15 minutos esta semana para te mostrar como funciona?",
              ]}
            />
          </div>
          <div className="flex items-center justify-end gap-2 mt-4">
            <button className="h-9 px-4 rounded-xl text-sm font-medium border border-border bg-background text-foreground">
              Editar
            </button>
            <button className="h-9 px-4 rounded-xl text-sm font-medium bg-primary text-primary-foreground flex items-center gap-2">
              <Send className="h-4 w-4" />
              Enviar pelo WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
 *  FAKE SIDEBAR
 * ============================================================ */
function FakeSidebar({ activeStep }: { activeStep: number }) {
  const highlightCampaign = activeStep === 7;
  const highlightCrm = activeStep === 8;
  const highlightChat = activeStep === 9;
  const highlightAuto = activeStep === 10;

  const items = [
    { icon: LayoutDashboard, label: "Dashboard", y: 116 },
    { icon: Search, label: "Oportunidades", y: 184 },
    {
      icon: Megaphone,
      label: "Campanha",
      y: 252,
      sub: [
        { icon: Send, label: "Prospecção" },
        { icon: Handshake, label: "Relacionamento" },
      ],
      highlight: highlightCampaign,
    },
    {
      icon: Users,
      label: "CRM",
      y: 388,
      sub: [
        { icon: Users, label: "Pipeline" },
        { icon: Trophy, label: "Score" },
      ],
      highlight: highlightCrm,
    },
    { icon: MessageSquare, label: "Chat", y: 524, highlight: highlightChat },
    {
      icon: Workflow,
      label: "Automação",
      y: 588,
      sub: [
        { icon: Workflow, label: "Fluxos" },
        { icon: Bot, label: "Agentes IA" },
      ],
      highlight: highlightAuto,
    },
  ];

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[240px] bg-sidebar border-r border-sidebar-border z-[201]">
      <div className="h-[58px] flex items-center px-5 border-b border-sidebar-border">
        <span
          className="text-2xl tracking-tight text-sidebar-foreground"
          style={{ fontFamily: "'Outfit', system-ui, sans-serif", fontWeight: 500 }}
        >
          wiize
        </span>
      </div>
      <nav className="p-3 space-y-1">
        {items.map((it) => (
          <div key={it.label}>
            <div
              className={cn(
                "flex items-center gap-3 px-3 h-11 rounded-xl transition-colors",
                it.highlight
                  ? "bg-primary/10 text-primary"
                  : "text-sidebar-foreground/70"
              )}
            >
              <it.icon className="h-4 w-4 shrink-0" />
              <span className="text-sm font-medium">{it.label}</span>
            </div>
            {it.sub && it.highlight && (
              <div className="ml-7 mt-1 space-y-0.5 pl-3 border-l border-sidebar-border">
                {it.sub.map((s) => (
                  <div
                    key={s.label}
                    className="flex items-center gap-2.5 px-2.5 h-9 text-sidebar-foreground/60 text-sm"
                  >
                    <s.icon className="h-3.5 w-3.5" />
                    {s.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}

/* ============================================================
 *  HELPERS — typing animations
 * ============================================================ */
function TypingText({
  text,
  active,
  delay = 0,
  className,
}: {
  text: string;
  active: boolean;
  delay?: number;
  className?: string;
}) {
  const [shown, setShown] = useState("");
  const indexRef = useRef(0);

  useEffect(() => {
    if (!active) {
      setShown("");
      indexRef.current = 0;
      return;
    }
    setShown("");
    indexRef.current = 0;
    let interval: ReturnType<typeof setInterval> | null = null;
    const startT = setTimeout(() => {
      interval = setInterval(() => {
        indexRef.current += 1;
        setShown(text.slice(0, indexRef.current));
        if (indexRef.current >= text.length) {
          if (interval) clearInterval(interval);
        }
      }, 45);
    }, delay);
    return () => {
      clearTimeout(startT);
      if (interval) clearInterval(interval);
    };
  }, [active, text, delay]);

  return (
    <span className={cn(className, !shown && active && "text-muted-foreground/40")}>
      {shown || (active ? "" : "")}
      {active && shown.length < text.length && (
        <span className="inline-block w-px h-4 bg-foreground/70 ml-0.5 animate-pulse" />
      )}
    </span>
  );
}

function TypingParagraph({ paragraphs }: { paragraphs: string[] }) {
  const [pIndex, setPIndex] = useState(0);
  const [chars, setChars] = useState("");

  useEffect(() => {
    if (pIndex >= paragraphs.length) return;
    setChars("");
    const text = paragraphs[pIndex];
    let i = 0;
    const interval = setInterval(() => {
      i += 2;
      setChars(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(interval);
        setTimeout(() => setPIndex((p) => p + 1), 300);
      }
    }, 18);
    return () => clearInterval(interval);
  }, [pIndex, paragraphs]);

  return (
    <div className="space-y-3">
      {paragraphs.slice(0, pIndex).map((p, i) => (
        <p key={i}>{p}</p>
      ))}
      {pIndex < paragraphs.length && (
        <p>
          {chars}
          <span className="inline-block w-px h-4 bg-foreground/70 ml-0.5 animate-pulse" />
        </p>
      )}
    </div>
  );
}

function FadeInItem({ children, delay }: { children: React.ReactNode; delay: number }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  if (!show) return <div className="opacity-0">{children}</div>;
  return <div className="animate-in fade-in slide-in-from-bottom-2 duration-400">{children}</div>;
}
