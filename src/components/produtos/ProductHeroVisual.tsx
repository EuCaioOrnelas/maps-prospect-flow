import { useEffect, useRef, useState } from "react";
import {
  Search,
  MapPin,
  Users,
  Bot,
  Check,
  CalendarClock,
  Sparkles,
  Workflow,
  FileSignature,
  TrendingUp,
  Clock,
} from "lucide-react";
import type { ProductVisualKey } from "@/data/products";

/* Frame padrão — janela "Wiize Platform" igual à linguagem do hero da LP */
const Frame = ({ title, children }: { title: string; children: React.ReactNode }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => setLive(entry.isIntersecting),
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
  <div ref={ref} className={`pv-float relative w-full max-w-[30rem] ${live ? "pv-live" : ""}`}>
    <div className="absolute -inset-4 rounded-3xl bg-primary/8 soft-glow" aria-hidden />
    <div className="relative rounded-2xl border border-border/50 bg-card p-4 shadow-card sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-warning/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-success/60" />
        </div>
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </span>
      </div>
      <div className="rounded-xl bg-background p-3 sm:p-4">{children}</div>
      <div className="absolute bottom-2 left-4 text-[10px] font-medium tracking-wide text-muted-foreground/40">
        @wiizebrasil
      </div>
    </div>
  </div>
  );
};

const Row = ({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) => (
  <div
    className="pv-rise pv-cycle pv-anim flex items-center gap-2 rounded-lg border border-border/40 bg-background p-2"
    style={{ animationDelay: `${delay}ms` }}
  >
    {children}
  </div>
);

const Prospeccao = () => (
  <div className="flex flex-col gap-2">
    <div className="grid grid-cols-[1fr_auto] gap-2">
      <div className="grid gap-1.5">
        <div className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-1.5 text-xs">
          <Search size={12} className="text-muted-foreground" />
          <span className="text-foreground">clínicas odontológicas</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-[11px] text-muted-foreground">
          <MapPin size={11} className="text-primary" />
          São Paulo, SP
        </div>
      </div>
      <div className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground">
        <Search size={16} />
        Buscar
      </div>
    </div>
    <div className="relative flex flex-col gap-1.5 overflow-hidden rounded-xl bg-secondary/30 p-2">
      <div className="pv-scan pv-anim pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-primary/25 to-transparent" aria-hidden />
      {[
        { n: "Odonto Prime", s: "912" },
        { n: "Clínica Sorriso+", s: "874" },
        { n: "Dental Care SP", s: "806" },
      ].map((l, i) => (
        <Row key={l.n} delay={i * 140}>
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success/15">
            <Users size={12} className="text-success" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-medium">{l.n}</p>
            <p className="truncate text-[11px] text-muted-foreground">(11) 9XXXX-XXXX · decisor identificado</p>
          </div>
          <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
            {l.s}
          </span>
        </Row>
      ))}
    </div>
  </div>
);

const SDR = () => (
  <div className="flex flex-col gap-2">
    {[
      { me: false, t: "Oi, vi vocês no Google. Como funciona?" },
      { me: true, t: "Olá! Sou a IA da Wiize 👋 Com quem eu falo?" },
      { me: false, t: "Sou o Rafael, dono da clínica." },
      { me: true, t: "Perfeito, Rafael. Prefere terça às 11:30h ou quinta às 14:30h?" },
    ].map((m, i) => (
      <div
        key={i}
        className={`pv-rise pv-cycle pv-anim max-w-[85%] rounded-2xl px-3 py-2 text-[12px] leading-snug ${
          m.me
            ? "self-end bg-primary/12 text-foreground"
            : "self-start border border-border/50 bg-secondary/60 text-foreground"
        }`}
        style={{ animationDelay: `${i * 160}ms` }}
      >
        {m.t}
      </div>
    ))}
    <div className="mt-1 flex items-center gap-2 rounded-lg border border-border/40 bg-success/8 p-2 text-[11px] font-medium text-success">
      <Bot size={12} className="pv-blink pv-anim" /> Reunião confirmada · terça, 12/03 às 11:30h
    </div>
  </div>
);

const Agenda = () => (
  <div className="flex flex-col gap-2">
    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
      <span className="font-medium text-foreground">Março 2026</span>
      <span>3 reuniões hoje</span>
    </div>
    <div className="grid grid-cols-7 gap-1">
      {Array.from({ length: 21 }).map((_, i) => (
        <div
          key={i}
          className={`aspect-square rounded-md text-[10px] flex items-center justify-center ${
            [4, 9, 11, 16].includes(i)
              ? "bg-primary/15 font-semibold text-primary"
              : "bg-secondary/50 text-muted-foreground"
          }`}
        >
          {i + 1}
        </div>
      ))}
    </div>
    <div className="flex flex-col gap-1.5">
      {[
        { h: "11:30h", t: "Demonstração · Odonto Prime" },
        { h: "14:30h", t: "Reunião · Clínica Sorriso+" },
      ].map((e, i) => (
        <Row key={e.h} delay={i * 160}>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/12">
            <CalendarClock size={12} className="text-primary" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-medium">{e.t}</p>
            <p className="text-[11px] text-muted-foreground">Confirmado · lembrete enviado</p>
          </div>
          <span className="text-[11px] font-semibold text-primary">{e.h}</span>
        </Row>
      ))}
    </div>
  </div>
);

const Engajamento = () => (
  <div className="flex flex-col gap-2">
    <div className="grid grid-cols-3 gap-1.5">
      {[
        { l: "Paradas", v: "124" },
        { l: "Intenção alta", v: "38" },
        { l: "Reativadas", v: "17" },
      ].map((m) => (
        <div key={m.l} className="rounded-lg border border-border/40 bg-secondary/40 p-2">
          <p className="text-[10px] text-muted-foreground">{m.l}</p>
          <p className="pv-count pv-anim text-sm font-semibold text-foreground">{m.v}</p>
        </div>
      ))}
    </div>
    <div className="rounded-xl bg-secondary/30 p-2">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-primary">
        <Sparkles size={12} /> Ciclo de 30 dias
      </div>
      <div className="flex items-center gap-1">
        {[0, 5, 10, 15, 20, 25, 30].map((d, i) => (
          <div key={d} className="flex-1 text-center">
            <div
              className={`pv-rise pv-cycle pv-anim mx-auto h-1.5 rounded-full ${i <= 3 ? "bg-primary" : "bg-secondary"}`}
              style={{ animationDelay: `${i * 90}ms` }}
            />
            <span className="text-[9px] text-muted-foreground">{d}</span>
          </div>
        ))}
      </div>
    </div>
    {[
      "Toque 3 enviado · contexto da última conversa",
      "Resposta recebida · card movido para negociação",
    ].map((t, i) => (
      <Row key={t} delay={i * 170}>
        <Check size={12} className="text-success" />
        <span className="text-[11px] text-muted-foreground">{t}</span>
      </Row>
    ))}
  </div>
);

const Automacao = () => (
  <div className="flex flex-col gap-2">
    {[
      { t: "Gatilho · mensagem no WhatsApp", i: Workflow },
      { t: "Condição · lead novo?", i: Sparkles },
      { t: "Mensagem · apresentação com mídia", i: Bot },
      { t: "Ação CRM · mover para qualificado", i: Check },
    ].map((n, i) => (
      <div key={n.t} className="flex flex-col items-stretch">
        <Row delay={i * 150}>
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/12">
            <n.i size={12} className="text-primary" />
          </span>
          <span className="text-[12px] font-medium">{n.t}</span>
        </Row>
        {i < 3 && <span className="mx-auto h-3 w-px bg-border" />}
      </div>
    ))}
    <div className="grid grid-cols-3 gap-1.5 pt-1">
      {[
        { l: "Entradas", v: "412" },
        { l: "Respostas", v: "187" },
        { l: "Reuniões", v: "34" },
      ].map((m) => (
        <div key={m.l} className="rounded-lg bg-secondary/40 p-2">
          <p className="text-[10px] text-muted-foreground">{m.l}</p>
          <p className="pv-count pv-anim text-sm font-semibold text-foreground">{m.v}</p>
        </div>
      ))}
    </div>
  </div>
);

const Contratos = () => (
  <div className="flex flex-col gap-2">
    <div className="grid grid-cols-2 gap-1.5">
      <div className="rounded-lg border border-border/40 bg-success/8 p-2">
        <p className="text-[10px] text-muted-foreground">Receita recorrente</p>
        <p className="text-sm font-semibold text-success">R$ 128.400</p>
      </div>
      <div className="rounded-lg border border-border/40 bg-warning/8 p-2">
        <p className="text-[10px] text-muted-foreground">Vencendo em 30 dias</p>
        <p className="text-sm font-semibold text-warning">R$ 19.200</p>
      </div>
    </div>
    {[
      { n: "Odonto Prime", s: "Ativo", c: "text-success", v: "R$ 4.800/mês" },
      { n: "Clínica Sorriso+", s: "Vencendo", c: "text-warning", v: "R$ 3.200/mês" },
      { n: "Dental Care SP", s: "Renovado", c: "text-primary", v: "R$ 5.400/mês" },
    ].map((c, i) => (
      <Row key={c.n} delay={i * 150}>
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
          <FileSignature size={12} className="text-primary" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-medium">{c.n}</p>
          <p className="text-[11px] text-muted-foreground">{c.v}</p>
        </div>
        <span className={`text-[11px] font-semibold ${c.c}`}>{c.s}</span>
      </Row>
    ))}
    <div className="flex items-center gap-2 rounded-lg bg-secondary/40 p-2 text-[11px] text-muted-foreground">
      <Clock size={12} className="text-warning" /> Aviso de renovação enviado ao responsável
    </div>
  </div>
);

const VISUALS: Record<ProductVisualKey, { title: string; render: () => JSX.Element }> = {
  prospeccao: { title: "Oportunidades", render: Prospeccao },
  sdr: { title: "SDR Inteligente", render: SDR },
  agenda: { title: "Agenda Wiize", render: Agenda },
  engajamento: { title: "Engajamento", render: Engajamento },
  automacao: { title: "Fluxos", render: Automacao },
  contratos: { title: "Contratos", render: Contratos },
};

export const ProductHeroVisual = ({ visual }: { visual: ProductVisualKey }) => {
  const v = VISUALS[visual];
  const Render = v.render;
  return (
    <Frame title={v.title}>
      <Render />
    </Frame>
  );
};

export default ProductHeroVisual;
