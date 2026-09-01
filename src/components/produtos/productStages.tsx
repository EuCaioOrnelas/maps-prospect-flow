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
} from "lucide-react";
import {
  StageCapture,
  StageDiagnosis,
  StageMessage,
  StageSend,
  StageAIChat,
  StageClose,
  StageCRM,
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

/* ══════════ ENGAJAMENTO / SCORE ══════════ */
const StageScoreRising = ({ progress }: { progress: number }) => {
  const score = Math.round(320 + segmentProgress(progress, 0.05, 0.85) * 592);
  const pct = Math.min(score / 1000, 1);
  const signals = [
    { l: "Abriu a proposta 3x", p: "+120", d: 0.12 },
    { l: "Respondeu no WhatsApp", p: "+180", d: 0.3 },
    { l: "Visitou a página de planos", p: "+140", d: 0.5 },
    { l: "Pediu valores", p: "+152", d: 0.68 },
  ];

  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden">
      <div className="rounded-xl border border-border/40 bg-secondary/30 p-2.5">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Score do contato</p>
            <p className="text-2xl font-bold leading-none text-primary">{score}</p>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-success/12 px-2 py-0.5 text-[10px] font-semibold text-success">
            <ArrowUpRight size={10} /> intenção subindo
          </span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-primary/60 to-success transition-[width] duration-200"
            style={{ width: `${pct * 100}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-[9px] text-muted-foreground">
          <span>Frio</span>
          <span>Morno</span>
          <span>Quente</span>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 flex-col gap-1 overflow-hidden">
        {signals.map((s) => {
          const on = progress > s.d;
          return (
            <div
              key={s.l}
              className="flex items-center gap-2 rounded-lg border border-border/40 bg-background/60 px-2 py-1.5"
              style={{
                opacity: on ? 1 : 0,
                transform: `translateX(${on ? 0 : -12}px)`,
                transition: "all 0.45s ease-out",
              }}
            >
              <Zap size={10} className="text-warning" />
              <span className="flex-1 truncate text-[11px] text-muted-foreground">{s.l}</span>
              <span className="text-[11px] font-semibold text-success">{s.p}</span>
            </div>
          );
        })}
      </div>

      <div
        className="flex items-center gap-2 rounded-lg border border-warning/20 bg-warning/10 p-2"
        style={{ opacity: progress > 0.8 ? 1 : 0, transition: "opacity 0.4s" }}
      >
        <Flame size={12} className="text-warning" />
        <span className="text-[11px] font-medium text-warning">
          Contato quente · priorize a abordagem hoje
        </span>
      </div>
    </div>
  );
};

const StageReengage = ({ progress }: { progress: number }) => {
  const touches = [0, 5, 10, 15, 20, 25, 30];
  const active = Math.floor(progress * touches.length);

  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden">
      <div className="grid grid-cols-3 gap-1.5">
        {[
          { l: "Contatos parados", v: "124", c: "text-muted-foreground" },
          { l: "Intenção alta", v: "38", c: "text-warning" },
          { l: "Reativados", v: "17", c: "text-success" },
        ].map((m) => (
          <div key={m.l} className="rounded-lg border border-border/40 bg-secondary/40 p-2">
            <p className="text-[10px] text-muted-foreground">{m.l}</p>
            <p className={`text-sm font-semibold ${m.c}`}>{m.v}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-secondary/30 p-2.5">
        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-primary">
          <Sparkles size={12} /> Ciclo inteligente de 30 dias
        </div>
        <div className="flex items-end gap-1">
          {touches.map((d, i) => (
            <div key={d} className="flex-1 text-center">
              <div
                className={`mx-auto rounded-full transition-all duration-500 ${
                  i <= active ? "bg-primary" : "bg-secondary"
                }`}
                style={{ height: i <= active ? 14 - Math.abs(3 - i) : 6, width: "100%" }}
              />
              <span className="text-[9px] text-muted-foreground">D{d}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-1 min-h-0 flex-col gap-1.5 overflow-hidden">
        {[
          { t: "Toque 3 enviado com o contexto da última conversa", d: 0.24, i: Bot },
          { t: "Contato reagiu · score recalculado para 742", d: 0.52, i: TrendingUp },
          { t: "Oportunidade movida para Negociação no CRM", d: 0.76, i: Check },
        ].map((r) => {
          const on = progress > r.d;
          return (
            <div
              key={r.t}
              className="flex items-center gap-2 rounded-lg border border-border/40 bg-background/60 p-2"
              style={{
                opacity: on ? 1 : 0,
                transform: `translateY(${on ? 0 : 8}px)`,
                transition: "all 0.4s ease-out",
              }}
            >
              <r.i size={11} className="text-success" />
              <span className="text-[11px] text-muted-foreground">{r.t}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ══════════ AUTOMAÇÃO ══════════ */
const StageFlow = ({ progress }: { progress: number }) => {
  const nodes = [
    { t: "Gatilho · mensagem no WhatsApp", i: Workflow },
    { t: "Condição · lead novo?", i: Sparkles },
    { t: "Mensagem · apresentação com mídia", i: Bot },
    { t: "Ação CRM · mover para qualificado", i: Check },
  ];
  const activeNode = Math.floor(segmentProgress(progress, 0.05, 0.9) * nodes.length);

  return (
    <div className="flex h-full flex-col gap-1.5 overflow-hidden">
      {nodes.map((n, i) => {
        const on = i <= activeNode;
        return (
          <div key={n.t} className="flex flex-col items-stretch">
            <div
              className={`flex items-center gap-2 rounded-lg border p-2 transition-all duration-500 ${
                on ? "border-primary/40 bg-primary/8" : "border-border/40 bg-background/50"
              }`}
              style={{ transform: `translateY(${on ? 0 : 6}px)`, opacity: on ? 1 : 0.45 }}
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                  on ? "bg-primary/15" : "bg-secondary"
                }`}
              >
                <n.i size={12} className={on ? "text-primary" : "text-muted-foreground"} />
              </span>
              <span className="flex-1 text-[12px] font-medium">{n.t}</span>
              {on && <Check size={11} className="text-success" />}
            </div>
            {i < nodes.length - 1 && (
              <span className="mx-auto h-3 w-px bg-border">
                <span
                  className="block w-px bg-primary transition-all duration-500"
                  style={{ height: i < activeNode ? "100%" : "0%" }}
                />
              </span>
            )}
          </div>
        );
      })}

      <div className="mt-auto grid grid-cols-3 gap-1.5">
        {[
          { l: "Entradas", v: 412 },
          { l: "Respostas", v: 187 },
          { l: "Reuniões", v: 34 },
        ].map((m) => (
          <div key={m.l} className="rounded-lg bg-secondary/40 p-2">
            <p className="text-[10px] text-muted-foreground">{m.l}</p>
            <p className="text-sm font-semibold text-foreground">
              {Math.round(m.v * Math.min(progress * 1.2, 1))}
            </p>
          </div>
        ))}
      </div>

      <div
        className="flex items-center gap-2 rounded-lg border border-success/15 bg-success/10 p-2"
        style={{ opacity: progress > 0.82 ? 1 : 0, transition: "opacity 0.4s" }}
      >
        <Clock size={11} className="text-success" />
        <span className="text-[11px] font-medium text-success">
          Rodando 24/7 · nenhuma oportunidade parada
        </span>
      </div>
    </div>
  );
};

/* ══════════ CONTRATOS / RECEITA ══════════ */
const StageContracts = ({ progress }: { progress: number }) => {
  const mrr = Math.round(128400 * Math.min(progress * 1.25, 1));
  const rows = [
    { n: "Odonto Prime", s: "Ativo", c: "text-success", v: "R$ 4.800/mês", r: "Ana" },
    { n: "Clínica Sorriso+", s: "Vencendo", c: "text-warning", v: "R$ 3.200/mês", r: "Rafael" },
    { n: "Dental Care SP", s: "Renovado", c: "text-primary", v: "R$ 5.400/mês", r: "Marina" },
  ];

  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden">
      <div className="grid grid-cols-2 gap-1.5">
        <div className="rounded-lg border border-success/15 bg-success/8 p-2">
          <p className="text-[10px] text-muted-foreground">Receita recorrente (MRR)</p>
          <p className="text-sm font-semibold text-success">
            R$ {mrr.toLocaleString("pt-BR")}
          </p>
        </div>
        <div className="rounded-lg border border-warning/15 bg-warning/8 p-2">
          <p className="text-[10px] text-muted-foreground">Vencendo em 30 dias</p>
          <p className="text-sm font-semibold text-warning">R$ 19.200</p>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 flex-col gap-1.5 overflow-hidden">
        {rows.map((c, i) => {
          const on = progress > 0.1 + i * 0.14;
          return (
            <div
              key={c.n}
              className="flex items-center gap-2 rounded-lg border border-border/40 bg-background/60 p-2"
              style={{
                opacity: on ? 1 : 0,
                transform: `translateX(${on ? 0 : -12}px)`,
                transition: "all 0.45s ease-out",
              }}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                <FileSignature size={12} className="text-primary" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-medium">{c.n}</p>
                <p className="text-[10px] text-muted-foreground">
                  {c.v} · responsável: {c.r}
                </p>
              </div>
              <span className={`text-[11px] font-semibold ${c.c}`}>{c.s}</span>
            </div>
          );
        })}
      </div>

      <div
        className="flex items-center gap-2 rounded-lg bg-secondary/40 p-2"
        style={{ opacity: progress > 0.7 ? 1 : 0, transition: "opacity 0.4s" }}
      >
        <Wallet size={11} className="text-primary" />
        <span className="text-[11px] text-muted-foreground">
          Receita, renovações e responsáveis atualizados automaticamente
        </span>
      </div>
    </div>
  );
};

const StageRenewalEmail = ({ progress }: { progress: number }) => {
  const steps = [
    { t: "Contrato entra em janela de vencimento", d: 0.08, i: Clock, c: "text-warning" },
    { t: "E-mail de aviso enviado ao responsável", d: 0.32, i: Mail, c: "text-primary" },
    { t: "Cliente confirma a renovação", d: 0.58, i: CheckCircle2, c: "text-success" },
    { t: "MRR atualizado no painel de receita", d: 0.78, i: TrendingUp, c: "text-success" },
  ];
  const typed = Math.round(segmentProgress(progress, 0.28, 0.55) * 74);
  const body = "Olá Rafael, seu contrato com a Wiize vence em 12/03. Podemos renovar?";

  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden">
      <div className="rounded-xl border border-border/40 bg-background/70 p-2.5">
        <div className="mb-1.5 flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/12">
            <Mail size={11} className="text-primary" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-medium">Aviso de renovação · Clínica Sorriso+</p>
            <p className="text-[10px] text-muted-foreground">para rafael@clinicasorriso.com.br</p>
          </div>
        </div>
        <p className="min-h-[32px] text-[11px] leading-relaxed text-muted-foreground">
          {body.slice(0, typed)}
          {typed < body.length && progress > 0.28 && <span className="opacity-70">|</span>}
        </p>
      </div>

      <div className="flex flex-1 min-h-0 flex-col gap-1.5 overflow-hidden">
        {steps.map((s) => {
          const on = progress > s.d;
          return (
            <div
              key={s.t}
              className="flex items-center gap-2 rounded-lg border border-border/40 bg-secondary/30 p-2"
              style={{
                opacity: on ? 1 : 0.3,
                transform: `translateY(${on ? 0 : 8}px)`,
                transition: "all 0.4s ease-out",
              }}
            >
              <s.i size={12} className={s.c} />
              <span className="flex-1 text-[11px] text-foreground">{s.t}</span>
              {on && <Check size={10} className="text-success" />}
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
          <div key={m.l} className="rounded-lg bg-secondary/40 p-2 text-center">
            <p className="text-[13px] font-bold text-foreground">{m.v}</p>
            <p className="text-[9px] text-muted-foreground">{m.l}</p>
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
    { color: "text-foreground", label: "CRM atualizando automaticamente", icon: Check, render: StageCRM },
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
};
