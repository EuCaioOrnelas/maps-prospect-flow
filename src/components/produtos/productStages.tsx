import {
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  Clock,
  Flame,
  Mail,
  Workflow,
  Sparkles,
  TrendingUp,
  Users,
  Bot,
  Check,
  FileSignature,
  Wallet,
  BellRing,
  Zap,
  ArrowUpRight,
  ClipboardList,
  Link2,
} from "lucide-react";
import {
  HiArrowTrendingUp,
  HiBolt,
  HiChatBubbleLeftRight,
  HiCheckBadge,
  HiClock,
  HiCurrencyDollar,
  HiDocumentCheck,
  HiEnvelopeOpen,
  HiFire,
  HiRectangleGroup,
  HiShieldCheck,
  HiSignal,
  HiSparkles,
  HiSquares2X2,
  HiUserCircle,
  HiArrowPathRoundedSquare,
  HiBellAlert,
} from "react-icons/hi2";
import {
  StageCapture,
  StageDiagnosis,
  StageMessage,
  StageSend,
  StageAIChat,
  StageClose,
  segmentProgress,
  type Stage,
} from "@/components/landing/heroStages";
import type { ProductVisualKey } from "@/data/products";


/* ══════════ AGENDA ══════════ */
const StageAgendaSlots = ({ progress }: { progress: number }) => {
  const slots = [
    { d: "Terça, 12/03", h: "11:30h", best: true },
    { d: "Terça, 12/03", h: "14:30h", best: false },
    { d: "Quinta, 14/03", h: "09:00h", best: false },
  ];
  const picked = progress > 0.62;

  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden">
      <div className="flex items-center gap-2 rounded-lg bg-secondary/50 p-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15">
          <Bot size={12} className="text-primary" />
        </div>
        <p className="text-[11px] font-medium text-primary">
          IA encontrando horários livres no calendário do time
        </p>
      </div>

      <div className="flex flex-1 min-h-0 flex-col gap-1.5 rounded-xl bg-secondary/30 p-2">
        {slots.map((s, i) => {
          const shown = progress > 0.08 + i * 0.14;
          const active = picked && s.best;
          return (
            <div
              key={s.h}
              className={`flex items-center gap-2 rounded-lg border p-2 ${
                active ? "border-success/40 bg-success/10" : "border-border/40 bg-background/60"
              }`}
              style={{
                opacity: shown ? 1 : 0,
                transform: `translateY(${shown ? 0 : 10}px)`,
                transition: "all 0.45s ease-out",
              }}
            >
              <CalendarClock size={12} className={active ? "text-success" : "text-primary"} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-medium">{s.d}</p>
                <p className="text-[10px] text-muted-foreground">Slot livre · sem conflito na agenda</p>
              </div>
              <span className={`text-[11px] font-semibold ${active ? "text-success" : "text-primary"}`}>
                {s.h}
              </span>
            </div>
          );
        })}
        <div
          className="mt-auto rounded-lg border border-border/40 bg-background/70 p-2"
          style={{ opacity: progress > 0.4 ? 1 : 0, transition: "opacity 0.5s" }}
        >
          <p className="text-[11px] text-foreground">
            “Rafael, vamos deixar para terça então? Dia 12/03, prefere às{" "}
            <span className="font-semibold text-primary">11:30h</span> ou às 14:30h?”
          </p>
        </div>
      </div>

      <div
        className="flex items-center gap-2 rounded-lg border border-success/15 bg-success/10 p-2"
        style={{ opacity: picked ? 1 : 0, transform: `translateY(${picked ? 0 : 8}px)`, transition: "all 0.4s" }}
      >
        <CheckCircle2 size={12} className="text-success" />
        <span className="text-[11px] font-medium text-success">Horário escolhido pelo lead: 11:30h</span>
      </div>
    </div>
  );
};

const StageAgendaConfirm = ({ progress }: { progress: number }) => {
  const days = Array.from({ length: 21 });
  const stamp = progress > 0.24;
  const sync = progress > 0.48;
  const remind = progress > 0.7;

  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden">
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-medium text-foreground">Março 2026</span>
        <span className="text-muted-foreground">Agenda sincronizada</span>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((_, i) => {
          const marked = [4, 9, 11, 16].includes(i);
          const isNew = i === 11 && stamp;
          return (
            <div
              key={i}
              className={`flex aspect-square items-center justify-center rounded-md text-[10px] transition-all duration-500 ${
                isNew
                  ? "scale-110 bg-success text-white font-bold shadow-sm"
                  : marked
                    ? "bg-primary/15 font-semibold text-primary"
                    : "bg-secondary/50 text-muted-foreground"
              }`}
            >
              {i + 1}
            </div>
          );
        })}
      </div>

      <div
        className="rounded-xl border border-success/20 bg-success/8 p-2.5"
        style={{ opacity: stamp ? 1 : 0, transform: `scale(${stamp ? 1 : 0.95})`, transition: "all 0.45s ease-out" }}
      >
        <div className="flex items-center gap-2">
          <CalendarCheck size={14} className="text-success" />
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold text-foreground">Reunião confirmada · 12/03 às 11:30h</p>
            <p className="text-[10px] text-muted-foreground">Demonstração · Odonto Prime · Responsável: Rafael</p>
          </div>
        </div>
      </div>

      <div className="mt-auto grid grid-cols-2 gap-1.5">
        <div
          className="rounded-lg border border-border/40 bg-secondary/40 p-2"
          style={{ opacity: sync ? 1 : 0.25, transition: "opacity 0.5s" }}
        >
          <p className="text-[10px] text-muted-foreground">Google Calendar</p>
          <p className="flex items-center gap-1 text-[11px] font-semibold text-primary">
            <Check size={10} /> Sincronizado
          </p>
        </div>
        <div
          className="rounded-lg border border-border/40 bg-secondary/40 p-2"
          style={{ opacity: remind ? 1 : 0.25, transition: "opacity 0.5s" }}
        >
          <p className="text-[10px] text-muted-foreground">Lembrete automático</p>
          <p className="flex items-center gap-1 text-[11px] font-semibold text-success">
            <BellRing size={10} /> Enviado ao lead
          </p>
        </div>
      </div>
    </div>
  );
};

/* ══════════ Primitivas premium ══════════ */
const Panel = ({
  children,
  className = "",
  show = true,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  show?: boolean;
  delay?: number;
}) => (
  <div
    className={`rounded-xl border border-border/50 bg-card/70 ${className}`}
    style={{
      opacity: show ? 1 : 0,
      transform: `translateY(${show ? 0 : 8}px)`,
      transition: `opacity 0.5s ease-out ${delay}ms, transform 0.5s ease-out ${delay}ms`,
      willChange: "opacity, transform",
    }}
  >
    {children}
  </div>
);

const IconBadge = ({
  icon: Icon,
  tone = "primary",
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone?: "primary" | "success" | "warning" | "muted";
}) => {
  const tones: Record<string, string> = {
    primary: "bg-primary text-primary-foreground",
    success: "bg-success text-white",
    warning: "bg-warning text-white",
    muted: "bg-secondary text-muted-foreground",
  };
  return (
    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}>
      <Icon className="h-[15px] w-[15px]" />
    </span>
  );
};

/* ══════════ ENGAJAMENTO / SCORE ══════════ */
const StageScoreRising = ({ progress }: { progress: number }) => {
  const ramp = segmentProgress(progress, 0.05, 0.85);
  const score = Math.round(320 + ramp * 592);
  const pct = Math.min(score / 1000, 1);
  const R = 26;
  const C = 2 * Math.PI * R;
  const signals = [
    { l: "Abriu a proposta 3x", p: "+120", d: 0.14, i: HiEnvelopeOpen },
    { l: "Respondeu no WhatsApp", p: "+180", d: 0.34, i: HiChatBubbleLeftRight },
    { l: "Visitou a página de planos", p: "+140", d: 0.54, i: HiSignal },
    { l: "Pediu valores", p: "+152", d: 0.72, i: HiCurrencyDollar },
  ];

  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden">
      <Panel className="flex items-center gap-3 p-3">
        <div className="relative h-[62px] w-[62px] shrink-0">
          <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
            <circle cx="32" cy="32" r={R} className="fill-none stroke-secondary" strokeWidth="6" />
            <circle
              cx="32"
              cy="32"
              r={R}
              className="fill-none stroke-primary"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - pct)}
              style={{ transition: "stroke-dashoffset 200ms linear" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-[15px] font-bold leading-none text-primary">{score}</span>
            <span className="text-[8px] uppercase tracking-wide text-muted-foreground">score</span>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-foreground">Studio Pilates One</p>
          <p className="text-[10px] text-muted-foreground">Contato monitorado em tempo real</p>
          <div className="mt-2 flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-success/12 px-2 py-0.5 text-[9px] font-semibold text-success">
              <HiArrowTrendingUp className="h-3 w-3" /> intenção subindo
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-semibold text-primary">
              <HiShieldCheck className="h-3 w-3" /> dados validados
            </span>
          </div>
        </div>
      </Panel>

      <div className="flex flex-1 min-h-0 flex-col gap-1.5 overflow-hidden">
        {signals.map((s) => {
          const on = progress > s.d;
          return (
            <div
              key={s.l}
              className="flex items-center gap-2 rounded-lg border border-border/45 bg-background/70 px-2 py-1.5"
              style={{
                opacity: on ? 1 : 0,
                transform: `translateX(${on ? 0 : -14}px)`,
                transition: "opacity 0.45s ease-out, transform 0.45s ease-out",
                willChange: "opacity, transform",
              }}
            >
              <IconBadge icon={s.i} tone="primary" />
              <span className="flex-1 truncate text-[11px] text-foreground/80">{s.l}</span>
              <span className="rounded-md bg-success/10 px-1.5 py-0.5 text-[10px] font-bold text-success">
                {s.p}
              </span>
            </div>
          );
        })}
      </div>

      <div
        className="flex items-center gap-2 rounded-xl border border-warning/25 bg-warning/10 p-2"
        style={{ opacity: progress > 0.8 ? 1 : 0, transition: "opacity 0.4s" }}
      >
        <IconBadge icon={HiFire} tone="warning" />
        <span className="text-[11px] font-semibold text-warning">
          Contato quente · priorize a abordagem hoje
        </span>
      </div>
    </div>
  );
};

const StageReengage = ({ progress }: { progress: number }) => {
  const cadence = [
    { d: "D0", l: "Contexto" },
    { d: "D3", l: "Prova" },
    { d: "D7", l: "Oferta" },
    { d: "D14", l: "Reativar" },
    { d: "D21", l: "Convite" },
    { d: "D30", l: "Fechar" },
  ];
  const reach = segmentProgress(progress, 0.05, 0.9);
  const active = Math.min(cadence.length - 1, Math.floor(reach * cadence.length));

  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden">
      <div className="grid grid-cols-3 gap-1.5">
        {[
          { l: "Parados", v: "124", i: HiClock, tone: "muted" as const },
          { l: "Intenção alta", v: "38", i: HiBolt, tone: "warning" as const },
          { l: "Reativados", v: "17", i: HiCheckBadge, tone: "success" as const },
        ].map((m, i) => (
          <Panel key={m.l} className="p-2" show={progress > i * 0.06}>
            <IconBadge icon={m.i} tone={m.tone} />
            <p className="mt-1.5 font-display text-base font-bold leading-none text-foreground">{m.v}</p>
            <p className="text-[9px] uppercase tracking-wide text-muted-foreground">{m.l}</p>
          </Panel>
        ))}
      </div>

      <Panel className="p-2.5">
        <div className="mb-2 flex items-center gap-1.5">
          <HiArrowPathRoundedSquare className="h-3.5 w-3.5 text-primary" />
          <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">
            Cadência inteligente · 30 dias
          </span>
        </div>
        <div className="relative">
          <span className="absolute left-1 right-1 top-[7px] h-[2px] rounded-full bg-secondary" aria-hidden />
          <span
            className="absolute left-1 top-[7px] h-[2px] rounded-full bg-primary"
            style={{
              width: `calc((100% - 8px) * ${reach})`,
              transition: "width 220ms linear",
            }}
            aria-hidden
          />
          <div className="relative flex items-start justify-between">
            {cadence.map((c, i) => {
              const on = i <= active;
              return (
                <div key={c.d} className="flex w-[16%] flex-col items-center gap-1">
                  <span
                    className={`h-4 w-4 rounded-full border-2 transition-all duration-500 ${
                      on ? "border-primary bg-primary" : "border-border bg-card"
                    }`}
                  />
                  <span className={`text-[9px] font-bold ${on ? "text-primary" : "text-muted-foreground"}`}>
                    {c.d}
                  </span>
                  <span className="text-[8px] leading-tight text-muted-foreground">{c.l}</span>
                </div>
              );
            })}
          </div>
        </div>
      </Panel>

      <div className="flex flex-1 min-h-0 flex-col gap-1.5 overflow-hidden">
        {[
          { t: "Toque 3 enviado com o contexto da conversa", d: 0.3, i: HiChatBubbleLeftRight },
          { t: "Contato reagiu · score recalculado: 742", d: 0.56, i: HiArrowTrendingUp },
          { t: "Oportunidade movida para Negociação", d: 0.78, i: HiCheckBadge },
        ].map((r) => {
          const on = progress > r.d;
          return (
            <div
              key={r.t}
              className="flex items-center gap-2 rounded-lg border border-border/45 bg-background/70 px-2 py-1.5"
              style={{
                opacity: on ? 1 : 0,
                transform: `translateY(${on ? 0 : 8}px)`,
                transition: "opacity 0.4s ease-out, transform 0.4s ease-out",
              }}
            >
              <IconBadge icon={r.i} tone="success" />
              <span className="flex-1 truncate text-[11px] text-foreground/80">{r.t}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ══════════ AUTOMAÇÃO / FLUXO ══════════ */
const FlowNode = ({
  icon: Icon,
  label,
  sub,
  on,
  tone = "primary",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  sub: string;
  on: boolean;
  tone?: "primary" | "success" | "warning" | "muted";
}) => {
  const ring: Record<string, string> = {
    primary: "border-primary/45 bg-primary/[0.07]",
    success: "border-success/45 bg-success/[0.08]",
    warning: "border-warning/45 bg-warning/[0.08]",
    muted: "border-border/50 bg-secondary/40",
  };
  return (
    <div
      className={`flex w-[30%] flex-col items-center gap-1 rounded-xl border px-1.5 py-2 text-center transition-all duration-500 ${
        on ? ring[tone] : "border-border/40 bg-background/50"
      }`}
      style={{ opacity: on ? 1 : 0.4, transform: `translateY(${on ? 0 : 5}px)` }}
    >
      <IconBadge icon={Icon} tone={on ? tone : "muted"} />
      <p className="text-[9.5px] font-bold leading-tight text-foreground">{label}</p>
      <p className="text-[8px] leading-tight text-muted-foreground">{sub}</p>
    </div>
  );
};

const Wire = ({ on, vertical = false }: { on: boolean; vertical?: boolean }) => (
  <span
    className={`${vertical ? "mx-auto h-3 w-[2px]" : "mt-6 h-[2px] flex-1"} block overflow-hidden rounded-full bg-border/70`}
    aria-hidden
  >
    <span
      className="block bg-primary transition-all duration-500"
      style={vertical ? { width: "2px", height: on ? "100%" : "0%" } : { height: "2px", width: on ? "100%" : "0%" }}
    />
  </span>
);

const StageFlow = ({ progress }: { progress: number }) => {
  const p = segmentProgress(progress, 0.04, 0.92);
  const step = (t: number) => p > t;

  return (
    <div className="flex h-full flex-col gap-1.5 overflow-hidden">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">
          <HiSquares2X2 className="h-3 w-3" /> Construtor visual
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[9px] font-bold text-success">
          <HiCheckBadge className="h-3 w-3" /> publicado
        </span>
      </div>

      <Panel className="flex flex-1 min-h-0 flex-col justify-center gap-0.5 p-2">
        <div className="flex items-start justify-between">
          <FlowNode icon={HiChatBubbleLeftRight} label="Gatilho" sub="WhatsApp recebido" on={step(0.05)} />
          <Wire on={step(0.16)} />
          <FlowNode icon={HiSparkles} label="Atendimento" sub="IA inicia conversa" on={step(0.2)} />
          <Wire on={step(0.3)} />
          <FlowNode icon={HiUserCircle} label="Triagem" sub="Coleta de dados" on={step(0.34)} tone="muted" />
        </div>

        <Wire on={step(0.42)} vertical />

        <div className="flex justify-center">
          <FlowNode icon={HiBolt} label="Qualificado?" sub="Condição do fluxo" on={step(0.46)} tone="warning" />
        </div>

        <Wire on={step(0.58)} vertical />

        <div className="flex items-start justify-between">
          <FlowNode icon={HiRectangleGroup} label="CRM" sub="Move de etapa" on={step(0.62)} />
          <Wire on={step(0.7)} />
          <FlowNode icon={HiClock} label="Espera" sub="Follow-up 2h" on={step(0.72)} tone="muted" />
          <Wire on={step(0.8)} />
          <FlowNode icon={HiCheckBadge} label="Entrega" sub="Vendedor avisado" on={step(0.84)} tone="success" />
        </div>
      </Panel>

      <div className="grid grid-cols-3 gap-1.5">
        {[
          { l: "Entradas", v: 842, i: HiBolt },
          { l: "Conclusão", v: 68, suffix: "%", i: HiArrowTrendingUp },
          { l: "Reuniões", v: 34, i: HiCheckBadge },
        ].map((m) => (
          <div
            key={m.l}
            className="flex items-center gap-1.5 rounded-lg border border-border/45 bg-background/70 px-2 py-1.5"
          >
            <m.i className="h-3.5 w-3.5 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="font-display text-[13px] font-bold leading-none text-foreground">
                {Math.round(m.v * Math.min(progress * 1.2, 1))}
                {m.suffix ?? ""}
              </p>
              <p className="text-[8px] uppercase tracking-wide text-muted-foreground">{m.l}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* CRM do produto — 3 colunas, cards maiores e legíveis */
const StageFlowCRM = ({ progress }: { progress: number }) => {
  const moved = progress > 0.6;
  const columns = [
    {
      title: "Novo",
      dot: "bg-info",
      leads: [
        { n: "Dental Prime", s: 320, v: "R$ 3,2k" },
        ...(!moved ? [{ n: "Studio Pilates One", s: 514, v: "R$ 4,7k" }] : []),
      ],
    },
    {
      title: "Qualificado",
      dot: "bg-warning",
      leads: [
        { n: "Barbearia VIP", s: 580, v: "R$ 4,8k" },
        ...(moved ? [{ n: "Studio Pilates One", s: 684, v: "R$ 6,2k" }] : []),
      ],
    },
    {
      title: "Fechado",
      dot: "bg-success",
      leads: [
        { n: "CrossFit Box SP", s: 847, v: "R$ 5,9k" },
        { n: "Arena Black", s: 902, v: "R$ 8,4k" },
      ],
    },
  ];

  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden">
      <div className="grid flex-1 min-h-0 grid-cols-3 gap-2">
        {columns.map((col, ci) => (
          <div
            key={col.title}
            className="flex min-h-0 flex-col rounded-xl border border-border/45 bg-secondary/30 p-2"
            style={{
              opacity: progress > ci * 0.07 ? 1 : 0,
              transform: `translateY(${progress > ci * 0.07 ? 0 : 8}px)`,
              transition: "opacity 0.45s ease-out, transform 0.45s ease-out",
            }}
          >
            <div className="mb-1.5 flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${col.dot}`} />
              <span className="text-[10px] font-bold text-foreground">{col.title}</span>
              <span className="ml-auto text-[9px] text-muted-foreground">{col.leads.length}</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {col.leads.map((l) => (
                <div key={l.n} className="rounded-lg border border-border/50 bg-card p-1.5">
                  <p className="truncate text-[10px] font-semibold text-foreground">{l.n}</p>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="rounded bg-primary/10 px-1 py-0.5 text-[8.5px] font-bold text-primary">
                      {l.s}
                    </span>
                    <span className="text-[9px] font-semibold text-success">{l.v}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div
        className="flex items-center gap-2 rounded-xl border border-success/25 bg-success/10 p-2"
        style={{ opacity: moved ? 1 : 0, transition: "opacity 0.4s" }}
      >
        <IconBadge icon={HiCheckBadge} tone="success" />
        <span className="text-[11px] font-semibold text-success">
          Lead qualificado pelo fluxo e movido no CRM
        </span>
      </div>
    </div>
  );
};

/* ══════════ CONTRATOS / RECEITA ══════════ */
const StageContracts = ({ progress }: { progress: number }) => {
  const ramp = Math.min(progress * 1.25, 1);
  const mrr = Math.round(128400 * ramp);
  const rows = [
    { n: "Odonto Prime", s: "Ativo", tone: "success" as const, v: "R$ 4.800/mês", r: "Ana", w: 100 },
    { n: "Clínica Sorriso+", s: "Vencendo", tone: "warning" as const, v: "R$ 3.200/mês", r: "Rafael", w: 62 },
    { n: "Dental Care SP", s: "Renovado", tone: "primary" as const, v: "R$ 5.400/mês", r: "Marina", w: 88 },
  ];
  const badge: Record<string, string> = {
    success: "bg-success/12 text-success",
    warning: "bg-warning/12 text-warning",
    primary: "bg-primary/12 text-primary",
  };
  const bar: Record<string, string> = {
    success: "bg-success",
    warning: "bg-warning",
    primary: "bg-primary",
  };

  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden">
      <Panel className="p-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Receita recorrente
            </p>
            <p className="font-display text-lg font-bold leading-tight text-foreground">
              R$ {mrr.toLocaleString("pt-BR")}
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-success/12 px-2 py-0.5 text-[9px] font-bold text-success">
            <HiArrowTrendingUp className="h-3 w-3" /> +12,4% no mês
          </span>
        </div>
        <div className="mt-2 flex h-[26px] items-end gap-1">
          {[38, 44, 41, 52, 58, 64, 71, 78].map((h, i) => (
            <span
              key={i}
              className="flex-1 rounded-t bg-primary/25"
              style={{
                height: `${Math.max(4, h * 0.33 * ramp)}px`,
                background: i > 5 ? "hsl(var(--primary))" : undefined,
                transition: "height 320ms ease-out",
              }}
            />
          ))}
        </div>
      </Panel>

      <div className="flex flex-1 min-h-0 flex-col justify-center gap-1.5">
        {rows.map((c, i) => {
          const on = progress > 0.1 + i * 0.14;
          return (
            <div
              key={c.n}
              className="shrink-0 rounded-xl border border-border/50 bg-background/70 p-1.5"
              style={{
                opacity: on ? 1 : 0,
                transform: `translateX(${on ? 0 : -14}px)`,
                transition: "opacity 0.45s ease-out, transform 0.45s ease-out",
              }}
            >
              <div className="flex items-center gap-2">
                <IconBadge icon={HiDocumentCheck} tone={c.tone === "warning" ? "warning" : "primary"} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-semibold leading-tight text-foreground">{c.n}</p>
                  <p className="truncate text-[9px] leading-tight text-muted-foreground">
                    {c.v} · {c.r}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold ${badge[c.tone]}`}>
                  {c.s}
                </span>
              </div>
              <span className="mt-1 block h-1 w-full overflow-hidden rounded-full bg-secondary">
                <span
                  className={`block h-1 rounded-full ${bar[c.tone]}`}
                  style={{ width: `${on ? c.w : 0}%`, transition: "width 700ms ease-out" }}
                />
              </span>
            </div>
          );
        })}
      </div>


      <div
        className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/[0.06] p-2"
        style={{ opacity: progress > 0.7 ? 1 : 0, transition: "opacity 0.4s" }}
      >
        <IconBadge icon={HiShieldCheck} />
        <span className="text-[11px] font-medium text-foreground/80">
          Receita, renovações e responsáveis sempre atualizados
        </span>
      </div>
    </div>
  );
};

const StageRenewalEmail = ({ progress }: { progress: number }) => {
  const steps = [
    { t: "Contrato entra na janela de vencimento", d: 0.08, i: HiClock, tone: "warning" as const },
    { t: "Aviso enviado ao responsável", d: 0.34, i: HiBellAlert, tone: "primary" as const },
    { t: "Cliente confirma a renovação", d: 0.58, i: HiCheckBadge, tone: "success" as const },
    { t: "MRR atualizado no painel", d: 0.78, i: HiArrowTrendingUp, tone: "success" as const },
  ];
  const typed = Math.round(segmentProgress(progress, 0.28, 0.55) * 74);
  const body = "Olá Rafael, seu contrato com a Wiize vence em 12/03. Podemos renovar?";

  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden">
      <Panel className="p-2.5">
        <div className="mb-1.5 flex items-center gap-2">
          <IconBadge icon={HiEnvelopeOpen} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-semibold text-foreground">
              Aviso de renovação · Clínica Sorriso+
            </p>
            <p className="truncate text-[9px] text-muted-foreground">para rafael@clinicasorriso.com.br</p>
          </div>
          <span className="rounded-full bg-warning/12 px-2 py-0.5 text-[9px] font-bold text-warning">D-14</span>
        </div>
        <p className="min-h-[30px] text-[11px] leading-relaxed text-foreground/75">
          {body.slice(0, typed)}
          {typed < body.length && progress > 0.28 && <span className="opacity-60">|</span>}
        </p>
      </Panel>

      <div className="flex flex-1 min-h-0 flex-col gap-1.5 overflow-hidden">
        {steps.map((s, i) => {
          const on = progress > s.d;
          return (
            <div key={s.t} className="flex items-stretch gap-2">
              <div className="flex flex-col items-center">
                <IconBadge icon={s.i} tone={on ? s.tone : "muted"} />
                {i < steps.length - 1 && (
                  <span className="my-0.5 w-[2px] flex-1 overflow-hidden rounded-full bg-border/70">
                    <span
                      className="block w-[2px] bg-primary transition-all duration-500"
                      style={{ height: progress > steps[i + 1].d ? "100%" : "0%" }}
                    />
                  </span>
                )}
              </div>
              <div
                className="mb-1 flex flex-1 items-center gap-2 rounded-lg border border-border/45 bg-background/70 px-2 py-1.5"
                style={{
                  opacity: on ? 1 : 0.35,
                  transform: `translateY(${on ? 0 : 6}px)`,
                  transition: "opacity 0.4s ease-out, transform 0.4s ease-out",
                }}
              >
                <span className="flex-1 text-[11px] text-foreground/85">{s.t}</span>
                {on && <HiCheckBadge className="h-3.5 w-3.5 text-success" />}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {[
          { l: "Contratos ativos", v: "37" },
          { l: "Renovados no mês", v: "9" },
          { l: "Churn evitado", v: "R$ 12,6k" },
        ].map((m) => (
          <div key={m.l} className="rounded-lg border border-border/45 bg-background/70 p-2 text-center">
            <p className="font-display text-[13px] font-bold leading-none text-foreground">{m.v}</p>
            <p className="mt-0.5 text-[8px] uppercase tracking-wide text-muted-foreground">{m.l}</p>
          </div>
        ))}
      </div>
    </div>
  );
};


/* ══════════ Mapa por produto ══════════ */
export interface ProductStage extends Stage {
  render: (props: { progress: number }) => JSX.Element;
}

const StageFormCapture = ({ progress }: { progress: number }) => {
  const received = progress > 0.58;
  return <div className="flex h-full flex-col gap-2 overflow-hidden">
    <div className="rounded-lg border border-border/50 bg-background/80 p-3">
      <div className="mb-2 flex items-center justify-between"><span className="text-[11px] font-semibold text-foreground">Solicite uma demonstração</span><span className="text-[9px] font-semibold text-primary">{received ? "99%" : "50%"}</span></div>
      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: received ? "99%" : "50%" }} /></div>
      {["Nome completo", "E-mail profissional", "Empresa"].map((label, index) => <div key={label} className="mb-1.5 flex h-8 items-center rounded-md border border-border/50 bg-card px-2 text-[10px] text-muted-foreground" style={{ opacity: progress > index * 0.12 ? 1 : 0.35 }}>{label}</div>)}
    </div>
    <div className="grid grid-cols-2 gap-2"><div className="rounded-lg bg-primary/10 p-2"><p className="text-[9px] text-muted-foreground">Origem</p><p className="text-[11px] font-semibold text-primary">Google Ads</p></div><div className="rounded-lg bg-success/10 p-2"><p className="text-[9px] text-muted-foreground">Destino</p><p className="text-[11px] font-semibold text-success">CRM Wiize</p></div></div>
  </div>;
};

const StageTrackedLink = ({ progress }: { progress: number }) => <div className="flex h-full flex-col gap-2 overflow-hidden">
  <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-background/80 p-3"><Link2 className="h-4 w-4 text-primary" /><div className="min-w-0"><p className="text-[10px] text-muted-foreground">Link rastreado</p><p className="truncate text-[11px] font-semibold text-foreground">wiize.link/demo-b2b</p></div></div>
  {[{ label: "Cliques identificados", value: "184" }, { label: "Respostas recebidas", value: "47" }, { label: "Conversão", value: "25,5%" }].map((metric, index) => <div key={metric.label} className="flex items-center justify-between rounded-lg border border-border/40 bg-card/80 px-3 py-2 transition-all duration-300" style={{ opacity: progress > index * 0.16 ? 1 : 0.35, transform: `translateX(${progress > index * 0.16 ? 0 : 8}px)` }}><span className="text-[10px] text-muted-foreground">{metric.label}</span><span className="text-[12px] font-bold text-foreground">{metric.value}</span></div>)}
  <div className="mt-auto flex items-center gap-2 rounded-lg bg-success/10 p-2 text-[10px] font-medium text-success"><ClipboardList className="h-3.5 w-3.5" />Lead criado com origem e respostas</div>
</div>;

export const PRODUCT_STAGES: Record<ProductVisualKey, ProductStage[]> = {
  prospeccao: [
    { color: "text-success", label: "Captando leads qualificados", icon: Users, render: StageCapture },
    { color: "text-warning", label: "IA analisando e qualificando", icon: Sparkles, render: StageDiagnosis },
    {
      color: "text-info",
      label: "Mensagens personalizadas automaticamente",
      icon: Bot,
      render: StageMessage,
    },
  ],
  sdr: [
    { color: "text-primary", label: "Enviando mensagens automaticamente", icon: Bot, render: StageSend },
    { color: "text-info", label: "IA conduzindo a conversa", icon: Sparkles, render: StageAIChat },
    { color: "text-success", label: "Cliente fechado com sucesso", icon: Check, render: StageClose },
  ],
  agenda: [
    {
      color: "text-primary",
      label: "Transformando interesse em reunião",
      icon: CalendarClock,
      render: StageAgendaSlots,
    },
    {
      color: "text-success",
      label: "Reunião confirmada e sincronizada",
      icon: CalendarCheck,
      render: StageAgendaConfirm,
    },
  ],
  engajamento: [
    { color: "text-primary", label: "Score do contato subindo", icon: TrendingUp, render: StageScoreRising },
    { color: "text-success", label: "Reativando contatos parados", icon: Flame, render: StageReengage },
  ],
  automacao: [
    { color: "text-primary", label: "A máquina continua quando o time para", icon: Workflow, render: StageFlow },
    { color: "text-foreground", label: "CRM atualizando automaticamente", icon: Check, render: StageFlowCRM },
  ],
  contratos: [
    { color: "text-success", label: "Contratos e receita sob controle", icon: Wallet, render: StageContracts },
    {
      color: "text-warning",
      label: "Avisos de vencimento e renovação",
      icon: Mail,
      render: StageRenewalEmail,
    },
  ],
  formularios: [
    { color: "text-primary", label: "Capturando uma nova oportunidade", icon: ClipboardList, render: StageFormCapture },
    { color: "text-success", label: "Origem rastreada até o CRM", icon: Link2, render: StageTrackedLink },
  ],
};
