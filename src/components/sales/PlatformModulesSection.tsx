import { motion } from "framer-motion";
import { ReactNode } from "react";
import {
  Search,
  Bot,
  CalendarDays,
  Send,
  LayoutDashboard,
  MessageSquare,
  Workflow,
  Check,
  MapPin,
  Star,
  Clock,
  Users,
  Tag,
  ArrowRight,
} from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { SectionHeading } from "@/components/landing/SectionHeading";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Mockup shell — replica leve de uma tela real da plataforma          */
/* ------------------------------------------------------------------ */

const MockShell = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="w-full rounded-2xl border border-border/70 bg-card/80 overflow-hidden shadow-sm">
    <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-border/60 bg-muted/40">
      <span className="w-2 h-2 rounded-full bg-destructive/40" />
      <span className="w-2 h-2 rounded-full bg-amber-400/50" />
      <span className="w-2 h-2 rounded-full bg-primary/50" />
      <span className="ml-2 text-[10px] font-medium text-muted-foreground tracking-wide truncate">
        {title}
      </span>
    </div>
    <div className="p-3.5 sm:p-4">{children}</div>
  </div>
);

const Pill = ({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "primary" | "amber" }) => (
  <span
    className={cn(
      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
      tone === "primary" && "bg-primary/10 text-primary",
      tone === "amber" && "bg-amber-500/10 text-amber-600",
      tone === "muted" && "bg-muted text-muted-foreground",
    )}
  >
    {children}
  </span>
);

const Row = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div className={cn("rounded-xl border border-border/60 bg-background/60 p-2.5", className)}>{children}</div>
);

/* ---------------------------- 1. Prospecção ---------------------------- */
const ProspectMock = () => (
  <MockShell title="Prospecção IA — Buscar oportunidades">
    <div className="grid grid-cols-5 gap-3">
      <div className="col-span-2 rounded-xl border border-border/60 bg-muted/30 relative overflow-hidden min-h-[130px]">
        <div className="absolute inset-0 opacity-[0.5] [background-image:linear-gradient(hsl(var(--border))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border))_1px,transparent_1px)] [background-size:18px_18px]" />
        {[
          { t: "20%", l: "25%" },
          { t: "48%", l: "58%" },
          { t: "70%", l: "32%" },
          { t: "34%", l: "76%" },
        ].map((p, i) => (
          <span
            key={i}
            className="absolute w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center"
            style={{ top: p.t, left: p.l }}
          >
            <MapPin size={10} className="text-primary" />
          </span>
        ))}
        <div className="absolute bottom-2 left-2">
          <Pill tone="primary">São Paulo · SP</Pill>
        </div>
      </div>
      <div className="col-span-3 space-y-2">
        {[
          { n: "Alpha Contabilidade", s: 92, c: "Contabilidade" },
          { n: "Nexus Clínica Odonto", s: 87, c: "Saúde" },
          { n: "Vetor Engenharia", s: 74, c: "Engenharia" },
        ].map((e) => (
          <Row key={e.n} className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Search size={13} className="text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-foreground truncate">{e.n}</p>
              <p className="text-[10px] text-muted-foreground truncate">{e.c}</p>
            </div>
            <Pill tone={e.s > 85 ? "primary" : "muted"}>
              <Star size={9} /> {e.s}
            </Pill>
          </Row>
        ))}
      </div>
    </div>
  </MockShell>
);

/* ---------------------------- 2. SDR ---------------------------- */
const SdrMock = () => (
  <MockShell title="SDR Inteligente — WhatsApp">
    <div className="space-y-2">
      {[
        { me: false, t: "Oi! Vi que vocês trabalham com contabilidade. Quanto custa?" },
        { me: true, t: "Olá, Marcos! Depende do porte. Hoje vocês atendem quantos clientes por mês?" },
        { me: false, t: "Uns 40." },
        { me: true, t: "Perfeito. Posso te mostrar em 15 min: amanhã 10h ou 16h?" },
      ].map((m, i) => (
        <div key={i} className={cn("flex", m.me ? "justify-end" : "justify-start")}>
          <div
            className={cn(
              "max-w-[80%] rounded-2xl px-3 py-2 text-[11px] leading-snug",
              m.me
                ? "bg-primary/10 text-foreground rounded-br-sm"
                : "bg-muted text-muted-foreground rounded-bl-sm",
            )}
          >
            {m.t}
          </div>
        </div>
      ))}
      <div className="flex flex-wrap gap-1.5 pt-1">
        <Pill tone="primary">Lead qualificado</Pill>
        <Pill tone="amber">Follow-up agendado</Pill>
        <Pill>Reunião proposta</Pill>
      </div>
    </div>
  </MockShell>
);

/* ---------------------------- 3. Agenda ---------------------------- */
const AgendaMock = () => (
  <MockShell title="Agenda Inteligente">
    <div className="grid grid-cols-7 gap-1 mb-3">
      {["S", "T", "Q", "Q", "S", "S", "D"].map((d, i) => (
        <span key={i} className="text-center text-[9px] font-semibold text-muted-foreground">
          {d}
        </span>
      ))}
      {Array.from({ length: 21 }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "aspect-square rounded-md text-[9px] flex items-center justify-center border border-transparent",
            [4, 9, 15].includes(i)
              ? "bg-primary/10 text-primary font-bold border-primary/20"
              : "bg-muted/40 text-muted-foreground",
          )}
        >
          {i + 1}
        </span>
      ))}
    </div>
    <div className="space-y-2">
      {[
        { h: "10:00", t: "Demo — Alpha Contabilidade", s: "Google Calendar" },
        { h: "16:30", t: "Follow-up — Vetor Engenharia", s: "Outlook" },
      ].map((e) => (
        <Row key={e.h} className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Clock size={13} className="text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-foreground truncate">{e.t}</p>
            <p className="text-[10px] text-muted-foreground">{e.h} · sincronizado</p>
          </div>
          <Pill>{e.s}</Pill>
        </Row>
      ))}
    </div>
  </MockShell>
);

/* ---------------------------- 4. Campanhas ---------------------------- */
const CampaignMock = () => (
  <MockShell title="Campanhas — API Oficial Meta">
    <div className="grid grid-cols-3 gap-2 mb-3">
      {[
        { l: "Entregues", v: "1.248" },
        { l: "Lidas", v: "1.032" },
        { l: "Respondidas", v: "317" },
      ].map((k) => (
        <Row key={k.l} className="text-center">
          <p className="text-sm font-bold text-foreground">{k.v}</p>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wide">{k.l}</p>
        </Row>
      ))}
    </div>
    <div className="space-y-2">
      {[
        { n: "Reativação — Base fria", s: "Concluída", tone: "primary" as const },
        { n: "Oferta Julho — ICP contábil", s: "Enviando", tone: "amber" as const },
      ].map((c) => (
        <Row key={c.n} className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Send size={13} className="text-primary" />
          </div>
          <p className="text-[11px] font-semibold text-foreground truncate flex-1">{c.n}</p>
          <Pill tone={c.tone}>{c.s}</Pill>
        </Row>
      ))}
    </div>
  </MockShell>
);

/* ---------------------------- 5. CRM ---------------------------- */
const CrmMock = () => (
  <MockShell title="CRM Inteligente">
    <div className="grid grid-cols-3 gap-2">
      {[
        { c: "Prospectado", items: [{ n: "Alpha Contab.", s: 92 }, { n: "Vetor Eng.", s: 61 }] },
        { c: "Em negociação", items: [{ n: "Nexus Odonto", s: 88 }] },
        { c: "Fechamento", items: [{ n: "Grupo Orion", s: 95 }] },
      ].map((col) => (
        <div key={col.c} className="space-y-2">
          <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground truncate">
            {col.c}
          </p>
          {col.items.map((it) => (
            <Row key={it.n} className="space-y-1.5">
              <p className="text-[10px] font-semibold text-foreground truncate">{it.n}</p>
              <div className="h-1 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-primary/70" style={{ width: `${it.s}%` }} />
              </div>
              <Pill tone={it.s > 85 ? "primary" : "muted"}>Score {it.s}</Pill>
            </Row>
          ))}
        </div>
      ))}
    </div>
  </MockShell>
);

/* ---------------------------- 6. Chat ---------------------------- */
const ChatMock = () => (
  <MockShell title="Central de Conversas">
    <div className="grid grid-cols-5 gap-3">
      <div className="col-span-2 space-y-2">
        {["Marcos S.", "Julia R.", "Pedro L."].map((n, i) => (
          <Row key={n} className={cn("flex items-center gap-2", i === 0 && "border-primary/30 bg-primary/5")}>
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Users size={11} className="text-primary" />
            </div>
            <p className="text-[10px] font-semibold text-foreground truncate">{n}</p>
          </Row>
        ))}
      </div>
      <div className="col-span-3 space-y-2">
        <div className="rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-[11px] text-muted-foreground">
          Vocês atendem fora de SP?
        </div>
        <div className="rounded-2xl rounded-br-sm bg-primary/10 px-3 py-2 text-[11px] text-foreground ml-auto max-w-[90%]">
          Atendemos todo o Brasil. Quer falar com um especialista?
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Pill tone="primary">IA respondeu</Pill>
          <Pill tone="amber">Transferir p/ humano</Pill>
          <Pill>
            <Tag size={9} /> VIP
          </Pill>
        </div>
      </div>
    </div>
  </MockShell>
);

/* ---------------------------- 7. Fluxos ---------------------------- */
const FlowMock = () => (
  <MockShell title="Fluxos Inteligentes — Construtor visual">
    <div className="space-y-2">
      {[
        { i: MessageSquare, t: "Gatilho: nova mensagem", tone: "primary" as const },
        { i: Bot, t: "IA qualifica o lead", tone: "muted" as const },
        { i: CalendarDays, t: "Agendar reunião", tone: "muted" as const },
        { i: LayoutDashboard, t: "Mover no CRM", tone: "primary" as const },
      ].map((n, i, arr) => (
        <div key={n.t}>
          <Row className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <n.i size={13} className="text-primary" />
            </div>
            <p className="text-[11px] font-semibold text-foreground truncate flex-1">{n.t}</p>
            <Pill tone={n.tone}>{i === 1 ? "condição" : "ação"}</Pill>
          </Row>
          {i < arr.length - 1 && (
            <div className="flex justify-center py-0.5">
              <ArrowRight size={12} className="text-muted-foreground/60 rotate-90" />
            </div>
          )}
        </div>
      ))}
    </div>
  </MockShell>
);

/* ------------------------------------------------------------------ */

type ModuleItem = {
  icon: typeof Search;
  eyebrow: string;
  title: string;
  description: string;
  benefits: string[];
  mock: () => JSX.Element;
};

const modules: ModuleItem[] = [
  {
    icon: Search,
    eyebrow: "Prospecção",
    title: "Prospecção Inteligente com IA",
    description:
      "Encontre empresas com potencial real de compra utilizando IA, localização, nicho e sinais comerciais para gerar oportunidades qualificadas automaticamente.",
    benefits: [
      "Busca inteligente por nicho e localização",
      "Score de oportunidade em tempo real",
      "Dados enriquecidos automaticamente",
      "Empresas prontas para abordagem",
    ],
    mock: ProspectMock,
  },
  {
    icon: Bot,
    eyebrow: "SDR IA",
    title: "SDR Inteligente",
    description:
      "Seu vendedor com IA conversa, responde dúvidas, qualifica, faz follow-up, agenda reuniões e conduz o lead automaticamente pelo WhatsApp.",
    benefits: [
      "Conversas naturais",
      "Qualificação automática",
      "Follow-up inteligente",
      "Agendamento automático",
    ],
    mock: SdrMock,
  },
  {
    icon: CalendarDays,
    eyebrow: "Agenda",
    title: "Agenda Inteligente",
    description:
      "Nunca mais perca uma oportunidade. Sua agenda é sincronizada automaticamente e o SDR agenda reuniões no melhor horário disponível.",
    benefits: [
      "Sincronização automática",
      "Google Calendar",
      "Outlook",
      "Reagendamentos automáticos",
    ],
    mock: AgendaMock,
  },
  {
    icon: Send,
    eyebrow: "Campanhas",
    title: "Campanhas via API Oficial Meta",
    description:
      "Envie mensagens utilizando a API Oficial do WhatsApp Business com segurança, estabilidade e conformidade com as políticas da Meta.",
    benefits: ["API Oficial", "Alta entregabilidade", "Variáveis inteligentes", "Relatórios completos"],
    mock: CampaignMock,
  },
  {
    icon: LayoutDashboard,
    eyebrow: "CRM",
    title: "CRM Inteligente com IA",
    description:
      "Acompanhe cada oportunidade enquanto a IA identifica automaticamente quem possui maior intenção de compra e quem deve ser priorizado.",
    benefits: ["Pipeline inteligente", "Score de intenção", "Histórico completo", "Priorização automática"],
    mock: CrmMock,
  },
  {
    icon: MessageSquare,
    eyebrow: "Atendimento",
    title: "Central de Conversas",
    description:
      "Gerencie todas as conversas em um único lugar enquanto a IA responde automaticamente sempre que possível.",
    benefits: ["Atendimento híbrido", "IA + Humano", "Histórico unificado", "Respostas inteligentes"],
    mock: ChatMock,
  },
  {
    icon: Workflow,
    eyebrow: "Automação",
    title: "Fluxos Inteligentes",
    description:
      "Automatize processos comerciais completos através de fluxos visuais que conectam WhatsApp, CRM, Agenda e SDR Inteligente.",
    benefits: ["Fluxos visuais", "Gatilhos inteligentes", "Automação comercial", "Integração completa"],
    mock: FlowMock,
  },
];

const ModuleCard = ({ item, index }: { item: ModuleItem; index: number }) => {
  const reversed = index % 2 === 1;
  const Icon = item.icon;
  const Mock = item.mock;

  return (
    <motion.article
      initial={{ opacity: 0, y: 32, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.2, margin: "0px 0px -80px 0px" }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={{ contentVisibility: "auto", containIntrinsicSize: "480px" } as React.CSSProperties}
      className="relative overflow-hidden rounded-3xl border border-border/70 bg-card/70 p-5 sm:p-8 lg:p-10 shadow-sm hover:shadow-lg hover:shadow-primary/5 transition-shadow duration-500 will-change-auto"
    >
      <div
        className="absolute -top-16 -right-16 w-64 h-64 rounded-full pointer-events-none opacity-[0.07]"
        style={{ background: "radial-gradient(circle, hsl(var(--primary)), transparent 70%)" }}
        aria-hidden="true"
      />
      <div
        className={cn(
          "relative z-10 grid items-center gap-6 lg:gap-12 lg:grid-cols-2",
          reversed && "lg:[&>*:first-child]:order-2",
        )}
      >
        {/* Texto */}
        <div>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Icon size={17} className="text-primary" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-widest text-primary">
              {item.eyebrow}
            </span>
          </div>
          <h3 className="font-display font-bold text-foreground text-xl sm:text-2xl lg:text-[1.75rem] leading-tight tracking-tight mb-3">
            {item.title}
          </h3>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-5">
            {item.description}
          </p>
          <ul className="space-y-2.5">
            {item.benefits.map((b) => (
              <li key={b} className="flex items-start gap-2.5">
                <span className="mt-0.5 w-4.5 h-[18px] min-w-[18px] rounded-full bg-primary/10 flex items-center justify-center">
                  <Check size={11} className="text-primary" strokeWidth={3} />
                </span>
                <span className="text-sm text-foreground/85 leading-snug">{b}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Mockup */}
        <div className="w-full">
          <Mock />
        </div>
      </div>
    </motion.article>
  );
};

export const PlatformModulesSection = () => {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section
      id="recursos"
      ref={ref as React.RefObject<HTMLElement>}
      className="py-12 sm:py-20 w-full relative scroll-mt-24"
    >
      <div className="container mx-auto px-4 max-w-6xl">
        <SectionHeading
          eyebrow="Recursos da plataforma"
          title="Tudo o que você precisa para"
          highlight="vender mais com IA"
          highlightFit="tight"
          description="Conheça os módulos que trabalham juntos para transformar sua operação comercial em uma máquina de geração de oportunidades."
          isVisible={isVisible}
        />

        <div className="space-y-8 sm:space-y-12 lg:space-y-16">
          {modules.map((m, i) => (
            <ModuleCard key={m.title} item={m} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default PlatformModulesSection;
