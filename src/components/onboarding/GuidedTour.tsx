import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useGuidedTour } from "@/hooks/useGuidedTour";
import { Button } from "@/components/ui/button";
import {
  Search,
  Send,
  Users,
  Bot,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  X,
  CheckCircle2,
  Target,
  MessageSquare,
  TrendingUp,
  Workflow,
  Zap,
  Building2,
  MapPin,
  Phone,
  Star,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PILLARS = [
  { key: "captacao", label: "Captação", icon: Search },
  { key: "prospeccao", label: "Prospecção", icon: Send },
  { key: "gestao", label: "Gestão", icon: Users },
  { key: "atendimento", label: "Atendimento", icon: Bot },
];

export function GuidedTour() {
  const { isActive, step, totalSteps, next, prev, finish, skip } = useGuidedTour();

  if (!isActive) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-background/85 backdrop-blur-md animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vh] rounded-full opacity-40"
          style={{
            background:
              "radial-gradient(circle, hsl(var(--primary) / 0.18) 0%, transparent 60%)",
          }}
        />
      </div>

      {/* Card */}
      <div className="relative w-full max-w-3xl bg-card border border-border/60 rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-500">
        {/* Top progress */}
        <ProgressHeader step={step} total={totalSteps} onSkip={skip} />

        {/* Step content */}
        <div className="px-6 sm:px-10 py-8 sm:py-10 min-h-[440px] flex flex-col">
          <div key={step} className="flex-1 animate-in fade-in slide-in-from-bottom-2 duration-400">
            {step === 0 && <StepWelcome />}
            {step === 1 && <StepCaptacao />}
            {step === 2 && <StepProspeccao />}
            {step === 3 && <StepGestao />}
            {step === 4 && <StepAtendimento />}
            {step === 5 && <StepFinal />}
          </div>

          {/* Footer nav */}
          <div className="flex items-center justify-between pt-8 mt-auto border-t border-border/40">
            <Button
              variant="ghost"
              size="sm"
              onClick={prev}
              disabled={step === 0}
              className="text-muted-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Voltar
            </Button>

            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    i === step ? "w-8 bg-primary" : i < step ? "w-1.5 bg-primary/60" : "w-1.5 bg-muted"
                  )}
                />
              ))}
            </div>

            {step < totalSteps - 1 ? (
              <Button onClick={next} size="sm" className="rounded-full px-5">
                {step === 0 ? "Começar pela Captação" : "Próximo"}
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={finish} size="sm" className="rounded-full px-5">
                Escalar minha operação
                <Sparkles className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function ProgressHeader({ step, total, onSkip }: { step: number; total: number; onSkip: () => void }) {
  const pct = ((step + 1) / total) * 100;
  return (
    <div className="relative px-6 sm:px-10 pt-5 pb-4 border-b border-border/40 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
        </div>
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Tour Wiize · {step + 1} de {total}
        </span>
      </div>
      <button
        onClick={onSkip}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
      >
        Pular tutorial
        <X className="h-3.5 w-3.5" />
      </button>

      {/* Progress bar at very top */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ============================== STEPS ============================== */

function StepWelcome() {
  return (
    <div className="text-center max-w-xl mx-auto">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-6">
        <Sparkles className="h-7 w-7 text-primary" />
      </div>
      <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
        Bem-vindo à <span className="text-primary">Wiize</span>
      </h2>
      <p className="text-muted-foreground text-base mb-10 leading-relaxed">
        Sua operação comercial em 4 pilares. Em poucos minutos você verá como transformar leads em
        receita previsível.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {PILLARS.map((p) => (
          <div
            key={p.key}
            className="group p-4 rounded-2xl border border-border/60 bg-card/50 hover:border-primary/40 hover:bg-primary/5 transition-all"
          >
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center mb-2 mx-auto">
              <p.icon className="h-4 w-4 text-primary" />
            </div>
            <p className="text-sm font-medium">{p.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepCaptacao() {
  return (
    <div>
      <PillarHeader index={0} title="Captação" subtitle="De nicho e região a oportunidades reais — em segundos." />

      <div className="grid sm:grid-cols-5 gap-4 mt-6">
        {/* Mock search */}
        <div className="sm:col-span-3 p-5 rounded-2xl border border-border/60 bg-card/40">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
            1. Defina nicho e região
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border/60 bg-background">
              <Search className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Clínicas de estética</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border/60 bg-background">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">São Paulo, SP</span>
            </div>
            <SimulatedSearchButton />
          </div>
        </div>

        {/* AI analysis preview */}
        <div className="sm:col-span-2 p-5 rounded-2xl border border-primary/30 bg-primary/5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="text-xs uppercase tracking-wider text-primary font-semibold">
              IA analisa cada lead
            </p>
          </div>
          <p className="text-sm text-foreground/90 leading-relaxed">
            A Wiize qualifica oportunidade por oportunidade automaticamente, gera diagnóstico e
            cria a <strong>mensagem ideal de abordagem</strong>.
          </p>
        </div>
      </div>

      <div className="mt-6 p-4 rounded-2xl border border-border/40 bg-muted/30 flex items-start gap-3">
        <MessageSquare className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <div className="text-sm text-muted-foreground">
          A mensagem gerada pela IA já vem pronta para uso e pode ser enviada com 1 clique — sem
          precisar escrever do zero.
        </div>
      </div>
    </div>
  );
}

function SimulatedSearchButton() {
  const [phase, setPhase] = useState<"idle" | "searching" | "analyzing" | "done">("idle");
  const [leads, setLeads] = useState(0);

  useEffect(() => {
    if (phase !== "searching" && phase !== "analyzing") return;
    if (phase === "searching") {
      const t = setTimeout(() => setPhase("analyzing"), 1400);
      return () => clearTimeout(t);
    }
    const interval = setInterval(() => {
      setLeads((n) => {
        if (n >= 47) {
          setPhase("done");
          clearInterval(interval);
          return 47;
        }
        return n + 1;
      });
    }, 35);
    return () => clearInterval(interval);
  }, [phase]);

  if (phase === "idle") {
    return (
      <button
        onClick={() => setPhase("searching")}
        className="w-full mt-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
      >
        <Search className="h-4 w-4" />
        Simular busca
      </button>
    );
  }

  if (phase === "done") {
    return (
      <div className="mt-2 px-4 py-2.5 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-primary">{leads} leads qualificados</span>
      </div>
    );
  }

  return (
    <div className="mt-2 px-4 py-2.5 rounded-xl bg-muted/50 border border-border/40 flex items-center justify-center gap-2">
      <Loader2 className="h-4 w-4 animate-spin text-primary" />
      <span className="text-sm font-medium">
        {phase === "searching" ? "Buscando leads…" : `Analisando com IA · ${leads}`}
      </span>
    </div>
  );
}

function StepProspeccao() {
  return (
    <div>
      <PillarHeader
        index={1}
        title="Prospecção"
        subtitle="Converta leads em conversas com campanhas inteligentes."
      />

      <div className="grid sm:grid-cols-2 gap-4 mt-6">
        <div className="p-5 rounded-2xl border border-border/60 bg-card/40">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Send className="h-4 w-4 text-primary" />
            </div>
            <p className="text-sm font-semibold">Campanha Outbound</p>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Dispare mensagens personalizadas em escala usando seus próprios números do WhatsApp.
            Ideal para iniciar conversas com leads frios.
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-border/60 bg-card/40">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <p className="text-sm font-semibold">Campanha Inbound (Meta API)</p>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Mensagens oficiais com templates aprovados. Requer conta Meta Business conectada.
            Maior entregabilidade e segurança.
          </p>
        </div>
      </div>

      <div className="mt-5 p-4 rounded-2xl border border-primary/30 bg-primary/5 flex items-start gap-3">
        <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <div className="text-sm">
          Use as <strong>mensagens geradas pela IA</strong> para abordar leads individualmente, ou
          crie campanhas com mensagens personalizadas para envio em massa.
        </div>
      </div>
    </div>
  );
}

function StepGestao() {
  const items = [
    { icon: Users, label: "Leads", desc: "CRM Kanban completo" },
    { icon: Star, label: "Score", desc: "Pronto para comprar?" },
    { icon: Target, label: "Pipeline", desc: "Funil de vendas" },
    { icon: TrendingUp, label: "Resultados", desc: "Métricas em tempo real" },
  ];
  return (
    <div>
      <PillarHeader
        index={2}
        title="Gestão"
        subtitle="Organize oportunidades e saiba quem está pronto para comprar."
      />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
        {items.map((it) => (
          <div
            key={it.label}
            className="p-4 rounded-2xl border border-border/60 bg-card/40 hover:border-primary/30 transition-all"
          >
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
              <it.icon className="h-4 w-4 text-primary" />
            </div>
            <p className="text-sm font-semibold">{it.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{it.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepAtendimento() {
  const items = [
    { icon: Workflow, label: "Fluxos", desc: "Automatize jornadas" },
    { icon: Bot, label: "Agente IA", desc: "Atende 24/7" },
    { icon: Zap, label: "Automações", desc: "Sem esforço manual" },
  ];
  return (
    <div>
      <PillarHeader
        index={3}
        title="Atendimento"
        subtitle="Automatize atendimento sem perder personalização."
      />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
        {items.map((it) => (
          <div
            key={it.label}
            className="p-5 rounded-2xl border border-border/60 bg-card/40 hover:border-primary/30 transition-all"
          >
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
              <it.icon className="h-4 w-4 text-primary" />
            </div>
            <p className="text-sm font-semibold">{it.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{it.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepFinal() {
  return (
    <div className="text-center max-w-xl mx-auto">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-6">
        <CheckCircle2 className="h-7 w-7 text-primary" />
      </div>
      <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
        Você já conhece toda a operação Wiize
      </h2>
      <p className="text-muted-foreground text-base mb-8 leading-relaxed">
        Continue de onde parou. Sua próxima oportunidade está a um clique.
      </p>

      <div className="grid grid-cols-4 gap-2">
        {PILLARS.map((p) => (
          <div
            key={p.key}
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

function PillarHeader({ index, title, subtitle }: { index: number; title: string; subtitle: string }) {
  const Icon = PILLARS[index].icon;
  return (
    <div className="flex items-start gap-4">
      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <p className="text-xs uppercase tracking-wider text-primary font-semibold mb-1">
          Pilar {index + 1} de 4 · {PILLARS[index].label}
        </p>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1">{title}</h2>
        <p className="text-muted-foreground text-sm">{subtitle}</p>
      </div>
    </div>
  );
}
