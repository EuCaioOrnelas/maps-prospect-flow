import { motion, useInView } from "framer-motion";
import { ReactNode, useEffect, useRef, useState } from "react";
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
  Filter,
  Sparkles,
  Building2,
  Phone,
  Globe,
  CheckCheck,
  TrendingUp,
  Video,
  Mail,
  BarChart3,
  Zap,
  ShieldCheck,
  Paperclip,
  Smile,
  GitBranch,
  Timer,
  UserCheck,
  Flame,
  ChevronUp,
  ChevronDown,
  MousePointer2,
} from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { SectionHeading } from "@/components/landing/SectionHeading";
import { cn } from "@/lib/utils";
import avatar1 from "@/assets/avatars/contact-1.jpg";
import avatar2 from "@/assets/avatars/contact-2.jpg";
import avatar3 from "@/assets/avatars/contact-3.jpg";
import avatar4 from "@/assets/avatars/contact-4.jpg";
import avatar5 from "@/assets/avatars/contact-5.jpg";
import avatar6 from "@/assets/avatars/contact-6.jpg";

const contactAvatars = [avatar1, avatar2, avatar3, avatar4, avatar5, avatar6];

const ContactAvatar = ({ index, className = "" }: { index: number; className?: string }) => (
  <img
    src={contactAvatars[index % contactAvatars.length]}
    alt=""
    loading="lazy"
    className={cn("rounded-full object-cover object-top", className)}
  />
);

/* ------------------------------------------------------------------ */
/* Mockup shell — replica leve de uma tela real da plataforma          */
/* ------------------------------------------------------------------ */

const MockShell = ({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: string;
  children: ReactNode;
}) => (
  <div className="w-full rounded-2xl border border-border/70 bg-card overflow-hidden shadow-[0_18px_50px_-24px_hsl(var(--primary)/0.35)]">
    <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-border/60 bg-gradient-to-r from-primary/[0.07] via-transparent to-transparent">
      <span className="w-2 h-2 rounded-full bg-destructive/40" />
      <span className="w-2 h-2 rounded-full bg-amber-400/50" />
      <span className="w-2 h-2 rounded-full bg-primary/60" />
      <span className="ml-2 text-[10px] font-medium text-muted-foreground tracking-wide truncate">
        {title}
      </span>
      {badge && (
        <span className="ml-auto flex-shrink-0 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          {badge}
        </span>
      )}
    </div>
    <div className="p-3 sm:p-3.5 bg-gradient-to-br from-transparent via-transparent to-primary/[0.04] min-h-[300px] sm:min-h-[380px] lg:h-[420px] overflow-hidden flex flex-col justify-start">
      {children}
    </div>


  </div>
);

const Pill = ({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "primary" | "amber" | "info" | "outline";
}) => (
  <span
    className={cn(
      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap",
      tone === "primary" && "bg-primary/12 text-primary ring-1 ring-inset ring-primary/20",
      tone === "amber" && "bg-amber-500/12 text-amber-600 ring-1 ring-inset ring-amber-500/20",
      tone === "info" && "bg-sky-500/12 text-sky-600 ring-1 ring-inset ring-sky-500/20",
      tone === "muted" && "bg-muted text-muted-foreground",
      tone === "outline" && "border border-border/70 text-muted-foreground",
    )}
  >
    {children}
  </span>
);

const Row = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div className={cn("rounded-xl border border-border/60 bg-background/70 p-2.5", className)}>
    {children}
  </div>
);

/* Palco de destaque para os mockups (sem blur, apenas degradê sólido) */
const MockStage = ({ children }: { children: ReactNode }) => (
  <div className="relative w-full rounded-[20px] p-1.5 sm:p-2.5 bg-[linear-gradient(145deg,hsl(var(--primary)/0.22)_0%,hsl(var(--primary)/0.10)_45%,hsl(var(--primary)/0.16)_100%)] ring-1 ring-inset ring-primary/20">
    <span className="pointer-events-none absolute left-1.5 top-1.5 w-3 h-3 border-l-2 border-t-2 border-primary/40 rounded-tl-md" aria-hidden="true" />
    <span className="pointer-events-none absolute right-1.5 top-1.5 w-3 h-3 border-r-2 border-t-2 border-primary/40 rounded-tr-md" aria-hidden="true" />
    <span className="pointer-events-none absolute left-1.5 bottom-1.5 w-3 h-3 border-l-2 border-b-2 border-primary/40 rounded-bl-md" aria-hidden="true" />
    <span className="pointer-events-none absolute right-1.5 bottom-1.5 w-3 h-3 border-r-2 border-b-2 border-primary/40 rounded-br-md" aria-hidden="true" />
    {/* zoom em telas pequenas: o mockup mantém o layout de desktop sem cortar conteúdo */}
    <div className="relative [zoom:0.72] sm:[zoom:0.9] lg:[zoom:1]">{children}</div>

  </div>
);

/* --------- Animações de entrada (todas once, sem loop infinito) --------- */
const VIEW = { once: true, amount: 0.25 } as const;

const Reveal = ({
  children,
  delay = 0,
  y = 10,
  x = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  x?: number;
  className?: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y, x }}
    whileInView={{ opacity: 1, y: 0, x: 0 }}
    viewport={VIEW}
    transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
    className={className}
  >
    {children}
  </motion.div>
);

/* Viewport para animações em loop: repetem enquanto visíveis, param ao sair */
const LOOP_VIEW = { once: false, amount: 0.2 } as const;

/* Fundo de conversa (padrão tipo WhatsApp) para áreas de mensagens */
const ChatWallpaper = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div
    className={cn(
      "relative rounded-xl border border-border/50 bg-muted/25 p-2",
      "[background-image:radial-gradient(hsl(var(--primary)/0.10)_1px,transparent_1px)] [background-size:13px_13px]",
      className,
    )}
  >
    {children}
  </div>
);

/* Balão de "digitando" — permanece na tela e pulsa em loop enquanto visível */
const TypingDots = ({ delay = 0 }: { delay?: number }) => (
  <span className="inline-flex items-center gap-1">
    {[0, 1, 2].map((i) => (
      <motion.span
        key={i}
        className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60"
        initial={{ y: 0, opacity: 0.5 }}
        whileInView={{ y: [0, -3, 0], opacity: [0.5, 1, 0.5] }}
        viewport={LOOP_VIEW}
        transition={{
          duration: 1,
          delay: delay + i * 0.14,
          repeat: Infinity,
          repeatType: "loop",
          ease: "easeInOut",
        }}
      />
    ))}
  </span>
);


const Bar = ({ value, tone = "primary", delay = 0 }: { value: number; tone?: "primary" | "amber"; delay?: number }) => (
  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
    <motion.div
      className={cn("h-full rounded-full", tone === "primary" ? "bg-primary" : "bg-amber-500")}
      initial={{ width: 0 }}
      whileInView={{ width: `${value}%` }}
      viewport={VIEW}
      transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
    />
  </div>
);


/* ---------------------------- 1. Prospecção ---------------------------- */
const ProspectMock = () => (
  <MockShell title="Prospecção IA — Buscar oportunidades" badge="ao vivo">
    {/* barra de busca */}
    <div className="flex items-center gap-2 mb-3">
      <div className="flex-1 flex items-center gap-2 rounded-lg border border-border/60 bg-background/70 px-2.5 py-1.5">
        <Search size={11} className="text-primary" />
        <span className="text-[10px] text-foreground/80 truncate">
          escritórios de contabilidade · São Paulo · 20-100 func.
        </span>
      </div>
      <span className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-[10px] font-bold text-primary-foreground">
        <Sparkles size={10} /> Buscar
      </span>
    </div>

    <div className="flex flex-wrap gap-1.5 mb-3">
      <Pill tone="primary">
        <Filter size={9} /> Nicho: Contábil
      </Pill>
      <Pill tone="outline">Tem site</Pill>
      <Pill tone="outline">Google 4.0+</Pill>
      <Pill tone="info">184 encontradas</Pill>
    </div>

    <div className="grid grid-cols-5 gap-3">
      <div className="col-span-2 rounded-xl border border-border/60 bg-muted/30 relative overflow-hidden min-h-[152px]">
        <div className="absolute inset-0 bg-muted/40" />
        <div className="absolute -left-5 top-6 h-3 w-[125%] rotate-[18deg] bg-background shadow-[0_0_0_1px_hsl(var(--border))]" />
        <div className="absolute -left-4 top-[74px] h-2.5 w-[120%] -rotate-[12deg] bg-background shadow-[0_0_0_1px_hsl(var(--border))]" />
        <div className="absolute left-[54%] -top-4 h-[120%] w-3 rotate-[5deg] bg-background shadow-[0_0_0_1px_hsl(var(--border))]" />
        <div className="absolute left-2 top-2 h-8 w-12 rounded-md border border-primary/15 bg-primary/[0.07]" />
        <div className="absolute bottom-3 right-2 h-10 w-14 rounded-md border border-sky-500/15 bg-sky-500/[0.07]" />
        {[
          { t: "18%", l: "22%", hot: true },
          { t: "44%", l: "56%", hot: true },
          { t: "68%", l: "30%", hot: false },
          { t: "32%", l: "76%", hot: false },
          { t: "78%", l: "64%", hot: false },
        ].map((p, i) => (
          <motion.span
            key={i}
            className={cn(
              "absolute w-5 h-5 rounded-full flex items-center justify-center ring-2",
              p.hot ? "bg-primary/25 ring-primary/30" : "bg-muted ring-border/60",
            )}
            style={{ top: p.t, left: p.l }}
            initial={{ opacity: 0, scale: 0.4 }}
            whileInView={{ opacity: 1, scale: p.hot ? [0.85, 1.22, 0.92, 1] : 1 }}
            viewport={VIEW}
            transition={{ duration: p.hot ? 1.1 : 0.4, delay: 0.15 + i * 0.1, ease: "easeOut" }}
          >
            <MapPin size={10} className={p.hot ? "text-primary" : "text-muted-foreground"} />
          </motion.span>
        ))}
        <div className="absolute bottom-2 left-2">
          <Pill tone="primary">São Paulo · SP</Pill>
        </div>
      </div>

      <div className="col-span-3 space-y-2">
        {[
          { n: "Alpha Contabilidade", s: 92, c: "Contabilidade · 45 func.", tags: ["Site", "WhatsApp"] },
          { n: "Nexus Clínica Odonto", s: 87, c: "Saúde · 28 func.", tags: ["Instagram"] },
          { n: "Vetor Engenharia", s: 74, c: "Engenharia · 62 func.", tags: ["Site"] },
        ].map((e, i) => (
          <Reveal key={e.n} delay={0.15 + i * 0.12} y={14}>
            <Row className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Building2 size={13} className="text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold text-foreground truncate">{e.n}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{e.c}</p>
                </div>
                <Pill tone={e.s > 85 ? "primary" : "muted"}>
                  <Star size={9} /> {e.s}
                </Pill>
              </div>
              <Bar value={e.s} tone={e.s > 85 ? "primary" : "amber"} delay={0.3 + i * 0.12} />
              <div className="flex items-center gap-1.5">
                {e.tags.map((t) => (
                  <Pill key={t} tone="outline">
                    {t === "Site" ? <Globe size={9} /> : <Phone size={9} />} {t}
                  </Pill>
                ))}
                <span className="ml-auto text-[9px] font-semibold text-primary">Diagnóstico IA →</span>
              </div>
            </Row>
          </Reveal>
        ))}

      </div>
    </div>
  </MockShell>
);

/* ---------------------------- 2. SDR ---------------------------- */
const SdrMock = () => (
  <MockShell title="SDR Inteligente — WhatsApp" badge="IA ativa">
    <div className="flex items-center gap-2 pb-2 mb-2 border-b border-border/60">
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
        <Users size={14} className="text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold text-foreground truncate">Marcos Silva</p>
        <p className="text-[9px] text-primary">online · respondendo</p>
      </div>
      <Pill tone="primary">
        <Flame size={9} /> Quente
      </Pill>
    </div>

    <ChatWallpaper className="space-y-1.5">

      {[
        { me: false, t: "Oi! Vi que vocês trabalham com contabilidade. Quanto custa?", h: "09:41" },
        {
          me: true,
          t: "Olá, Marcos! Depende do porte. Hoje vocês atendem quantos clientes por mês?",
          h: "09:41",
        },
        { me: false, t: "Uns 40 clientes por mês.", h: "09:43" },


      ].map((m, i) => (

        <Reveal key={i} delay={0.15 + i * 0.28} y={10}>
          <div className={cn("flex", m.me ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[82%] rounded-2xl px-3 py-2 text-[11px] leading-snug shadow-sm",
                m.me
                  ? "bg-primary/12 text-foreground rounded-br-sm ring-1 ring-inset ring-primary/15"
                  : "bg-muted text-muted-foreground rounded-bl-sm",
              )}
            >
              {m.t}
              <span className="mt-1 flex items-center justify-end gap-1 text-[8px] text-muted-foreground/80">
                {m.h}
                {m.me && <CheckCheck size={9} className="text-sky-500" />}
              </span>
            </div>
          </div>
        </Reveal>
      ))}
      <div className="w-fit rounded-2xl rounded-bl-sm bg-muted px-2.5 py-2 shadow-sm">
        <TypingDots delay={0.2} />
      </div>
    </ChatWallpaper>


    <Reveal delay={0.9} className="mt-1.5">
      <div className="rounded-xl border border-primary/20 bg-primary/[0.06] p-1.5">
        <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wide text-primary mb-1">
          <Sparkles size={10} /> Raciocínio da IA
        </p>
        <div className="space-y-0.5">

          {["Nome coletado: Marcos", "Necessidade entendida (40 clientes/mês)", "Reunião proposta — 2 horários"].map(
            (s, i) => (
              <motion.p
                key={s}
                className="flex items-center gap-1.5 text-[10px] text-foreground/80"
                initial={{ opacity: 0, x: -8 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={VIEW}
                transition={{ duration: 0.35, delay: 1.6 + i * 0.15 }}
              >
                <Check size={10} className="text-primary" strokeWidth={3} /> {s}
              </motion.p>
            ),
          )}
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          <Pill tone="primary">Lead qualificado</Pill>
          <Pill tone="amber">Follow-up 24h</Pill>
        </div>
      </div>
    </Reveal>

  </MockShell>
);

/* ---------------------------- 3. Agenda ---------------------------- */
const AgendaMock = () => (
  <MockShell title="Agenda Inteligente — Novembro" badge="sincronizado">
    <div className="flex items-center gap-2 mb-3">
      <Pill tone="primary">Mês</Pill>
      <Pill tone="outline">Semana</Pill>
      <Pill tone="outline">Dia</Pill>
      <span className="ml-auto flex items-center gap-1 text-[9px] text-muted-foreground">
        <span className="w-2 h-2 rounded-full bg-primary" /> Comercial
        <span className="ml-1.5 w-2 h-2 rounded-full bg-sky-500" /> Interna
      </span>
    </div>

    <div className="grid grid-cols-7 gap-1 mb-3">
      {["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"].map((d, i) => (
        <span key={i} className="text-center text-[9px] font-semibold text-muted-foreground">
          {d}
        </span>
      ))}
      {Array.from({ length: 35 }).map((_, i) => {
        const day = i - 1; // 2 células vazias antes do dia 1
        const valid = day >= 1 && day <= 30;
        const green = [6, 12, 19, 25].includes(day);
        const blue = [9, 21].includes(day);

        if (!valid) {
          return <span key={i} className="h-6 rounded-md bg-muted/20" aria-hidden="true" />;
        }

        return (
          <motion.span
            key={i}
            initial={{ opacity: 0, scale: 0.85 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={VIEW}
            transition={{ duration: 0.3, delay: 0.05 + i * 0.008 }}
            className={cn(
              "h-6 rounded-md text-[9px] flex flex-col items-center justify-center leading-none gap-[1px] border",
              green
                ? "bg-primary/10 text-primary font-bold border-primary/25"
                : blue
                  ? "bg-sky-500/10 text-sky-600 font-bold border-sky-500/25"
                  : "bg-muted/40 text-muted-foreground border-transparent",
            )}
          >
            {day}
            {(green || blue) && (
              <span className={cn("w-1 h-1 rounded-full", green ? "bg-primary" : "bg-sky-500")} />
            )}
          </motion.span>
        );
      })}
    </div>


    <div className="space-y-2">
      {[
        {
          h: "10:00",
          d: "45 min",
          t: "Demo — Alpha Contabilidade",
          s: "Google Meet",
          tone: "primary" as const,
          who: ["AC", "RS"],
        },
        {
          h: "16:30",
          d: "30 min",
          t: "Follow-up — Vetor Engenharia",
          s: "Outlook",
          tone: "info" as const,
          who: ["VE"],
        },
      ].map((e, i) => (
        <Reveal key={e.h} delay={0.55 + i * 0.14} y={14}>
          <Row className="flex items-center gap-2">
            <div className="flex flex-col items-center justify-center w-11 flex-shrink-0 rounded-lg bg-primary/10 py-1">
              <span className="text-[11px] font-bold text-primary leading-none">{e.h}</span>
              <span className="text-[8px] text-muted-foreground mt-0.5">{e.d}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-foreground truncate">{e.t}</p>
              <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Video size={9} /> {e.s} · agendado pela IA
              </p>
            </div>
            <div className="flex -space-x-1.5">
              {e.who.map((w, avatarIndex) => (
                <span
                  key={w}
                  className="w-6 h-6 rounded-full bg-muted border-2 border-background overflow-hidden"
                >
                  <ContactAvatar index={i * 2 + avatarIndex} className="h-full w-full" />
                </span>
              ))}
            </div>
          </Row>
        </Reveal>
      ))}

      <Row className="flex items-center gap-2 border-dashed">
        <Clock size={12} className="text-muted-foreground" />
        <p className="text-[10px] text-muted-foreground">
          Lembrete automático por e-mail 1h antes de cada reunião
        </p>
      </Row>
    </div>
  </MockShell>
);

/* ---------------------------- 4. Campanhas ---------------------------- */
const CampaignProgress = ({ name, template, index }: { name: string; template: string; index: number }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const [status, setStatus] = useState("Na fila");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const timers: number[] = [];
    const start = 700 + index * 450;

    timers.push(window.setTimeout(() => { setStatus("Preparando"); setProgress(8); }, start));
    timers.push(window.setTimeout(() => setStatus("Enviando"), start + 500));

    // incremento progressivo do progressbar
    [
      [700, 22], [1100, 35], [1500, 48], [1900, 61],
      [2300, 74], [2700, 86], [3100, 94],
    ].forEach(([t, v]) => {
      timers.push(window.setTimeout(() => setProgress(v), start + t));
    });

    timers.push(window.setTimeout(() => { setStatus("Concluída"); setProgress(100); }, start + 3550));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [inView, index]);

  return (
    <div ref={ref}>
      <Reveal delay={0.35 + index * 0.1} x={12}>
        <Row className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"><Send size={13} className="text-primary" /></div>
            <div className="min-w-0 flex-1"><p className="text-[11px] font-semibold text-foreground truncate">{name}</p><p className="text-[9px] text-muted-foreground font-mono truncate">{template}</p></div>
            <Pill tone={status === "Concluída" ? "primary" : status === "Na fila" ? "muted" : "amber"}>{status}</Pill>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden"><motion.div className="h-full rounded-full bg-primary" animate={{ width: `${progress}%` }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }} /></div>
          <div className="flex items-center justify-between text-[9px] text-muted-foreground"><span className="flex items-center gap-1"><CheckCheck size={9} className="text-sky-500" /> {progress}% processado</span><span>delay seguro 8s</span></div>
        </Row>
      </Reveal>
    </div>
  );
};

const CampaignMock = () => (
  <MockShell title="Campanhas — API Oficial Meta" badge="enviando">
    <Reveal className="flex items-center gap-1.5 mb-2.5">
      <Pill tone="primary">
        <ShieldCheck size={9} /> WABA verificada
      </Pill>
      <Pill tone="outline">Qualidade: Alta</Pill>
      <Pill tone="info">Tier 10k/dia</Pill>
    </Reveal>

    <div className="grid grid-cols-4 gap-1.5 mb-2.5">
      {[
        { l: "Enviadas", v: "1.400", d: "12%", up: true },
        { l: "Entregues", v: "1.248", d: "8,4%", up: true },
        { l: "Lidas", v: "1.032", d: "3,1%", up: true },
        { l: "Respostas", v: "317", d: "1,2%", up: false },
      ].map((k, i) => (
        <Reveal key={k.l} delay={0.08 * i} y={12}>
          <Row className="text-center py-2 h-full">
            <p className="text-sm font-bold text-foreground leading-none">{k.v}</p>
            <p className="text-[8px] text-muted-foreground uppercase tracking-wide mt-1">{k.l}</p>
            <p className={cn("mt-0.5 flex items-center justify-center text-[9px] font-bold", k.up ? "text-primary" : "text-destructive")}>
              {k.up ? <ChevronUp size={10} /> : <ChevronDown size={10} />}{k.d}
            </p>
          </Row>
        </Reveal>
      ))}
    </div>

    {/* Preview do template + envio em andamento */}
    <div className="grid grid-cols-5 gap-2">
      <Reveal delay={0.3} x={-12} className="col-span-2">
        <div className="h-full rounded-xl border border-border/60 bg-muted/30 p-2 flex flex-col gap-1.5">
          <p className="text-[8px] font-bold uppercase tracking-wide text-muted-foreground">
            Pré-visualização
          </p>
          <div className="rounded-lg rounded-tl-sm bg-card border border-border/60 p-2 space-y-1">
            <p className="text-[9px] font-semibold text-foreground leading-snug">
              Olá, {"{{nome}}"} 👋
            </p>
            <p className="text-[9px] text-muted-foreground leading-snug">
              Vi que a {"{{empresa}}"} atua em {"{{nicho}}"}. Posso te mostrar como gerar mais
              oportunidades?
            </p>
            <div className="rounded-md bg-primary/10 text-primary text-[8px] font-bold text-center py-1">
              Quero saber mais
            </div>
          </div>
          <div className="flex flex-wrap gap-1 mt-auto">
            <Pill tone="outline">3 variáveis</Pill>
            <Pill tone="primary">Aprovado</Pill>
          </div>
        </div>
      </Reveal>

      <div className="col-span-3 space-y-1.5">
        {[
          { n: "Reativação — Base fria", t: "template_reativacao_v2" },
          { n: "Oferta Julho — ICP contábil", t: "oferta_julho_pt_br" },
          { n: "Follow-up — Demonstração", t: "followup_demo_v3" },
        ].map((c, i) => <CampaignProgress key={c.n} name={c.n} template={c.t} index={i} />)}
      </div>
    </div>
  </MockShell>
);

/* ---------------------------- 5. CRM ---------------------------- */
const CrmMock = () => (
  <MockShell title="CRM Inteligente — Pipeline comercial" badge="score IA">
    <Reveal className="grid grid-cols-3 gap-1.5 mb-2.5">
      {[
        { l: "Em negociação", v: "R$ 184k" },
        { l: "Taxa de ganho", v: "34%" },
        { l: "Ciclo médio", v: "11 dias" },
      ].map((k) => (
        <Row key={k.l} className="py-1.5 text-center">
          <p className="text-[11px] font-bold text-foreground leading-none">{k.v}</p>
          <p className="text-[8px] uppercase tracking-wide text-muted-foreground mt-1">{k.l}</p>
        </Row>
      ))}
    </Reveal>

    <div className="relative grid grid-cols-3 gap-1.5">
      {[
        {
          c: "Prospectado",
          n: 5,
          v: "R$ 32k",
          items: [
            { n: "Alpha Contab.", s: 92, v: "R$ 4.9k", tag: "Quente", who: "RS", when: "hoje" },
            { n: "Vetor Eng.", s: 61, v: "R$ 2.1k", tag: "Novo", who: "JM", when: "2d" },
          ],
        },
        {
          c: "Em negociação",
          n: 4,
          v: "R$ 96k",
          items: [
            { n: "Nexus Odonto", s: 88, v: "R$ 7.4k", tag: "Proposta", who: "AC", when: "1d" },
            { n: "Lumen Tech", s: 76, v: "R$ 5.2k", tag: "Reunião", who: "RS", when: "3d" },
          ],
        },
        {
          c: "Fechamento",
          n: 3,
          v: "R$ 56k",
          items: [
            { n: "Grupo Orion", s: 95, v: "R$ 12k", tag: "Contrato", who: "AC", when: "hoje" },
            { n: "Delta Log", s: 84, v: "R$ 8.6k", tag: "Assinar", who: "JM", when: "1d" },
          ],
        },
      ].map((col, ci) => (
        <div key={col.c} className="space-y-1.5">
          <Reveal delay={0.05 * ci}>
            <div className="rounded-lg bg-muted/50 px-1.5 py-1">
              <div className="flex items-center gap-1">
                <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground truncate">
                  {col.c}
                </p>
                <span className="ml-auto text-[8px] font-bold text-muted-foreground bg-background rounded px-1">
                  {col.n}
                </span>
              </div>
              <p className="text-[9px] font-bold text-primary">{col.v}</p>
            </div>
          </Reveal>
          {col.items.map((it, ii) => (
            <Reveal key={it.n} delay={0.15 + ci * 0.08 + ii * 0.1} y={14}>
              <Row className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Building2 size={9} className="text-primary" />
                  </span>
                  <p className="text-[10px] font-semibold text-foreground truncate">{it.n}</p>
                </div>
                <p className="text-[10px] font-bold text-primary">{it.v}</p>
                <Bar value={it.s} tone={it.s > 85 ? "primary" : "amber"} delay={0.3 + ci * 0.08} />
                <div className="flex items-center gap-1">
                  <Pill tone={it.s > 85 ? "primary" : "muted"}>{it.s}</Pill>
                  <Pill tone="outline">{it.tag}</Pill>
                </div>
                <div className="flex items-center gap-1 text-[8px] text-muted-foreground">
                  <span className="w-3.5 h-3.5 rounded-full bg-muted flex items-center justify-center font-bold">
                    {it.who}
                  </span>
                  <Clock size={8} /> {it.when}
                </div>
              </Row>
            </Reveal>
          ))}
        </div>
      ))}
      <motion.div
        className="pointer-events-none absolute left-[17%] top-[100px] z-20"
        initial={{ opacity: 0, x: 0, y: 0 }}
        animate={{ opacity: [0, 1, 1, 1, 0], x: [0, 0, 52, 112, 112], y: [0, 20, 38, 38, 38] }}
        transition={{ duration: 2.4, delay: 1.1, times: [0, 0.18, 0.48, 0.82, 1], ease: "easeInOut" }}
      >
        <MousePointer2 size={20} className="fill-primary text-primary drop-shadow-md" />
        <motion.span
          className="absolute left-3 top-3 h-12 w-24 rounded-lg border border-primary/40 bg-card/95 p-2 shadow-lg"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: [0, 1, 1, 0], scale: [0.9, 1, 1, 0.95] }}
          transition={{ duration: 2, delay: 1.35, times: [0, 0.18, 0.78, 1] }}
        >
          <span className="block text-[9px] font-bold text-foreground">Alpha Contab.</span>
          <span className="text-[8px] font-semibold text-primary">R$ 4.9k</span>
        </motion.span>
      </motion.div>
    </div>

    <Reveal delay={0.6} className="mt-1.5">
      <Row className="flex items-center gap-1.5 py-1 border-dashed">
        <Sparkles size={11} className="text-primary flex-shrink-0" />
        <p className="text-[9px] text-muted-foreground leading-snug truncate">
          IA priorizou <span className="font-semibold text-foreground">Grupo Orion</span> — maior
          intenção nas últimas 48h
        </p>
      </Row>
    </Reveal>

  </MockShell>
);

/* ---------------------------- 6. Chat ---------------------------- */
const ChatMock = () => (
  <MockShell title="Central de Conversas — WhatsApp" badge="3 online">
    <div className="grid grid-cols-5 gap-2">
      {/* Lista de conversas */}
      <div className="col-span-2 space-y-1.5">
        <Reveal className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/70 px-2 py-1.5">
          <Search size={10} className="text-muted-foreground" />
          <span className="text-[9px] text-muted-foreground">Buscar conversa</span>
        </Reveal>
        <Reveal delay={0.05} className="flex gap-1">
          <Pill tone="primary">Todas</Pill>
          <Pill tone="outline">IA</Pill>
          <Pill tone="outline">Humano</Pill>
        </Reveal>
        {[
          { n: "Marcos S.", m: "Vocês atendem fora de SP?", u: 2, t: "09:41", tag: "IA" },
          { n: "Julia R.", m: "Recebi a proposta, obrigada!", u: 0, t: "09:12", tag: "" },
          { n: "Pedro L.", m: "Podemos falar amanhã?", u: 1, t: "Ontem", tag: "Humano" },
          { n: "Camila A.", m: "Qual o próximo horário?", u: 0, t: "Ontem", tag: "IA" },
          { n: "Rafael M.", m: "Vou enviar os dados agora.", u: 0, t: "Ter", tag: "" },
        ].map((c, i) => (
          <Reveal key={c.n} delay={0.12 + i * 0.07} x={-10}>
            <Row
              className={cn(
                "flex items-center gap-2 py-2",
                i === 0 && "border-primary/30 bg-primary/[0.07]",
              )}
            >
              <div className="relative flex-shrink-0">
                <ContactAvatar index={i} className="h-7 w-7 border border-border/60" />
                {i === 0 && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary ring-2 ring-card" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <p className="text-[10px] font-semibold text-foreground truncate flex-1">{c.n}</p>
                  <span className="text-[8px] text-muted-foreground flex-shrink-0">{c.t}</span>
                </div>
                <div className="flex items-center gap-1">
                  <p className="text-[9px] text-muted-foreground truncate flex-1">{c.m}</p>
                  {c.u > 0 && (
                    <span className="w-3.5 h-3.5 rounded-full bg-primary text-primary-foreground text-[8px] font-bold flex items-center justify-center flex-shrink-0">
                      {c.u}
                    </span>
                  )}
                </div>
              </div>
            </Row>
          </Reveal>
        ))}
      </div>

      {/* Janela da conversa */}
      <div className="col-span-3 flex flex-col rounded-xl border border-border/60 bg-background/50 overflow-hidden">
        <div className="flex items-center gap-2 px-2 py-1.5 border-b border-border/60 bg-card">
          <ContactAvatar index={0} className="h-7 w-7 border border-border/60" />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-foreground truncate">Marcos S.</p>
            <p className="text-[8px] text-primary">online agora</p>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <Pill tone="outline">
              <Tag size={9} /> VIP
            </Pill>
          </div>
        </div>

        <div className="flex-1 p-2 space-y-1.5 bg-muted/25 [background-image:radial-gradient(hsl(var(--primary)/0.12)_1px,transparent_1px)] [background-size:13px_13px]">
          <Reveal delay={0.45} y={8}>
            <div className="rounded-2xl rounded-bl-sm bg-muted px-2.5 py-1.5 text-[10px] text-muted-foreground max-w-[88%] w-fit">
              Oi! Vocês atendem fora de SP?
              <span className="block text-right text-[8px] text-muted-foreground/70 mt-0.5">09:40</span>
            </div>
          </Reveal>

          <Reveal delay={1.15} y={8}>
            <div className="ml-auto w-fit max-w-[88%] rounded-2xl rounded-br-sm bg-primary/12 ring-1 ring-inset ring-primary/15 px-2.5 py-1.5 text-[10px] text-foreground">
              Atendemos todo o Brasil 🇧🇷 Quer falar com um especialista hoje?
              <span className="mt-0.5 flex items-center justify-end gap-1 text-[8px] text-muted-foreground">
                09:42 <CheckCheck size={9} className="text-sky-500" />
              </span>
            </div>
          </Reveal>

          <Reveal delay={1.85} y={8}>
            <div className="rounded-2xl rounded-bl-sm bg-muted px-2.5 py-1.5 text-[10px] text-muted-foreground max-w-[88%] w-fit">
              Sim, pode agendar para hoje às 16h.
              <span className="block text-right text-[8px] text-muted-foreground/70 mt-0.5">09:42</span>
            </div>
          </Reveal>

          <Reveal delay={2.55} y={8}>
            <div className="ml-auto w-fit max-w-[88%] rounded-2xl rounded-br-sm bg-primary/12 ring-1 ring-inset ring-primary/15 px-2.5 py-1.5 text-[10px] text-foreground">
              Fechado! Reunião confirmada para hoje 16h 📅
              <span className="mt-0.5 flex items-center justify-end gap-1 text-[8px] text-muted-foreground">
                09:43 <CheckCheck size={9} className="text-sky-500" />
              </span>
            </div>
          </Reveal>
        </div>

        <div className="p-2 border-t border-border/60 bg-card space-y-1">
          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/70 px-2 py-1.5">
            <Smile size={11} className="text-muted-foreground" />
            <Paperclip size={11} className="text-muted-foreground" />
            <span className="text-[9px] text-muted-foreground flex-1">Digite uma mensagem…</span>
            <motion.span
              className="w-5 h-5 rounded-full bg-primary flex items-center justify-center"
              initial={{ scale: 0.6, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={VIEW}
              transition={{ duration: 0.4, delay: 2.9, ease: [0.22, 1, 0.36, 1] }}
            >
              <Send size={9} className="text-primary-foreground" />
            </motion.span>
          </div>
          <div className="flex flex-wrap gap-1">
            <Pill tone="primary">
              <Bot size={9} /> IA respondeu
            </Pill>
            <Pill tone="amber">
              <UserCheck size={9} /> Transferir p/ humano
            </Pill>
            <Pill tone="outline">Resposta rápida</Pill>
          </div>
        </div>
      </div>
    </div>
  </MockShell>
);


/* ---------------------------- 7. Fluxos ---------------------------- */
const FlowNode = ({
  icon: Icon,
  label,
  sub,
  tone = "primary",
  delay = 0,
}: {
  icon: typeof Search;
  label: string;
  sub?: string;
  tone?: "primary" | "info" | "amber" | "muted";
  delay?: number;
}) => (
  <motion.div
    className="flex flex-col items-center text-center w-[92px]"
    initial={{ opacity: 0, scale: 0.7, y: 8 }}
    whileInView={{ opacity: 1, scale: 1, y: 0 }}
    viewport={VIEW}
    transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
  >
    <div
      className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center ring-4",
        tone === "primary" && "bg-primary text-primary-foreground ring-primary/15",
        tone === "info" && "bg-sky-500 text-white ring-sky-500/15",
        tone === "amber" && "bg-amber-500 text-white ring-amber-500/15",
        tone === "muted" && "bg-muted text-muted-foreground ring-border/40",
      )}
    >
      <Icon size={14} />
    </div>
    <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-foreground leading-tight">
      {label}
    </p>
    {sub && <p className="text-[8px] text-muted-foreground leading-tight">{sub}</p>}

  </motion.div>
);

/* Linha pontilhada que se desenha na entrada + bolinha percorrendo o fluxo */
const DottedLine = ({
  className = "",
  delay = 0,
  axis = "x",
  travel = false,
}: {
  className?: string;
  delay?: number;
  axis?: "x" | "y";
  travel?: boolean;
}) => (
  <span className={cn("relative block", className.includes("w-") ? "" : "")}>
    <motion.span
      className={cn("block border-dashed border-primary/45", className)}
      aria-hidden="true"
      initial={axis === "x" ? { scaleX: 0 } : { scaleY: 0 }}
      whileInView={axis === "x" ? { scaleX: 1 } : { scaleY: 1 }}
      viewport={VIEW}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
      style={{ originX: 0, originY: 0 }}
    />
    {travel && (
      <motion.span
        className="absolute w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_6px_hsl(var(--primary)/0.7)]"
        style={axis === "x" ? { top: "50%", left: 0, marginTop: -3 } : { left: "50%", top: 0, marginLeft: -3 }}
        initial={{ opacity: 0 }}
        whileInView={
          axis === "x"
            ? { opacity: [0, 1, 1, 0], x: [0, 32] }
            : { opacity: [0, 1, 1, 0], y: [0, 20] }
        }
        viewport={LOOP_VIEW}
        transition={{
          duration: 0.9 + (delay % 0.45),
          delay: 0.15 + ((delay * 7) % 0.8),
          ease: "easeInOut",
          repeat: Infinity,
          repeatDelay: 0.7 + ((delay * 11) % 1.5),
        }}
        aria-hidden="true"
      />
    )}

  </span>
);

const FlowMock = () => (
  <MockShell title="Fluxos Inteligentes — Construtor visual" badge="publicado">
      <div className="relative px-1 w-full my-auto">
      {/* Linha 1 — gatilho → atendimento */}
        <div className="flex items-start justify-center gap-0">
        <FlowNode icon={MessageSquare} label="Gatilho" sub="Mensagem recebida" delay={0} />
          <DottedLine className="mt-[15px] -mx-2 w-12 border-t-2" delay={0.2} travel />
        <FlowNode icon={Bot} label="Atendimento" sub="IA inicia conversa" tone="info" delay={0.3} />
          <DottedLine className="mt-[15px] -mx-2 w-12 border-t-2" delay={0.53} travel />
        <FlowNode icon={UserCheck} label="Triagem" sub="Coleta de dados" tone="muted" delay={0.55} />
      </div>

      {/* conector vertical */}
      <div className="flex justify-center">
        <DottedLine className="h-4 border-l-2" delay={0.7} axis="y" travel />
      </div>

      {/* Linha 2 — condição */}
      <div className="flex justify-center">
        <FlowNode icon={GitBranch} label="Qualificado?" sub="Condição / Teste A/B" tone="amber" delay={0.85} />
      </div>

      {/* ramificação — alinhada ao centro dos ícones (nós têm 92px de largura) */}
      <motion.div
        className="relative h-5"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={VIEW}
        transition={{ duration: 0.4, delay: 1 }}
        aria-hidden="true"
      >
        {/* barra horizontal ligando os centros dos nós das pontas */}
        <span className="absolute left-[46px] right-[46px] top-2.5 border-t-2 border-dashed border-primary/45" />
        {[18, 43, 71].map((left, i) => (
          <motion.span
            key={left}
            className="absolute top-[7px] h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_6px_hsl(var(--primary)/0.7)]"
            style={{ left: `${left}%` }}
            animate={{ x: [0, i % 2 ? 34 : 58], opacity: [0, 1, 1, 0] }}
            transition={{ duration: 1 + i * 0.27, delay: 1.15 + i * 0.43, repeat: Infinity, repeatDelay: 0.8 + i * 0.65, ease: "easeInOut" }}
          />
        ))}
        {/* descida do nó de condição */}
        <span className="absolute left-1/2 -translate-x-px top-0 h-2.5 border-l-2 border-dashed border-primary/45" />
        {/* descidas para cada saída */}
        <span className="absolute left-[46px] top-2.5 h-2.5 border-l-2 border-dashed border-primary/45" />
        <span className="absolute left-1/2 -translate-x-px top-2.5 h-2.5 border-l-2 border-dashed border-primary/45" />
        <span className="absolute right-[46px] top-2.5 h-2.5 border-l-2 border-dashed border-primary/45" />
      </motion.div>

      {/* Linha 3 — saídas */}
      <div className="flex items-start justify-between">
        <FlowNode icon={CalendarDays} label="Agendar" sub="Reunião na agenda" delay={1.1} />
        <FlowNode icon={Timer} label="Espera" sub="Follow-up 2h úteis" tone="muted" delay={1.2} />
        <FlowNode icon={LayoutDashboard} label="CRM" sub="Move de etapa" tone="info" delay={1.3} />
      </div>

      <div className="flex justify-center">
        <DottedLine className="h-4 border-l-2" delay={1.4} axis="y" travel />
      </div>

      <div className="flex justify-center">
        <FlowNode icon={CheckCheck} label="Entrega" sub="Vendedor notificado" delay={1.55} />
      </div>

      {/* rodapé de métricas */}
      <div className="mt-1.5 flex items-center justify-center gap-1.5">
        {[
          { i: Zap, l: "Entradas", v: "842" },
          { i: BarChart3, l: "Conclusão", v: "68%" },
          { i: Mail, l: "Integrações", v: "Sheets" },
        ].map((k, i) => (
          <Reveal key={k.l} delay={1.6 + i * 0.08}>
            <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/70 px-2 py-1">
              <k.i size={10} className="text-primary flex-shrink-0" />
              <span className="text-[9px] text-muted-foreground">{k.l}</span>
              <span className="text-[9px] font-bold text-foreground">{k.v}</span>
            </span>
          </Reveal>
        ))}
      </div>

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
    <div
      className="lg:sticky"
      style={{ top: `calc(5.5rem + ${index * 16}px)`, zIndex: 10 + index }}
    >
    <motion.article
      initial={{ opacity: 0, x: reversed ? 140 : -140, scale: 0.96 }}
      whileInView={{ opacity: 1, x: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.2, margin: "0px 0px -60px 0px" }}
      transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}


      className={cn(
        "relative overflow-hidden rounded-card border border-white/20 p-5 sm:p-8 lg:p-10 bg-primary",
        "w-full lg:min-h-[560px] flex items-center",
        "shadow-[0_24px_60px_-30px_hsl(var(--primary)/0.5)]",
      )}
    >


      <div
        className={cn(
          "absolute -top-24 w-72 h-72 rounded-full pointer-events-none opacity-[0.6]",
          reversed ? "-left-24" : "-right-24",
        )}
        style={{ background: "radial-gradient(circle, hsl(var(--primary-foreground) / 0.12), transparent 70%)" }}
        aria-hidden="true"
      />
      <div
        className={cn(
          "relative z-10 w-full grid items-center gap-6 lg:gap-12 lg:grid-cols-2",
          reversed && "lg:[&>*:first-child]:order-2",
        )}
      >
        {/* O texto acompanha o card; somente o mockup inicia depois da entrada. */}
        <div>
          <div className="inline-flex items-center gap-2.5 mb-4 rounded-full border border-border bg-card pl-1.5 pr-3.5 py-1.5 shadow-[0_6px_18px_-14px_hsl(var(--foreground)/0.4)]">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <Icon size={15} className="text-primary-foreground" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
              {item.eyebrow}
            </span>
          </div>
          <h3 className="font-display font-bold text-foreground text-xl sm:text-2xl lg:text-[1.75rem] leading-tight tracking-tight mb-3">
            {item.title}
          </h3>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-5">
            {item.description}
          </p>
          <ul className="grid sm:grid-cols-2 gap-2">
            {item.benefits.map((b) => (
              <li
                key={b}
                className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-card px-3 py-2"
              >
                <span className="w-5 h-5 min-w-[20px] rounded-full bg-primary flex items-center justify-center">
                  <Check size={11} className="text-primary-foreground" strokeWidth={3.5} />
                </span>
                <span className="text-[13px] font-medium text-foreground/90 leading-snug">{b}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Mockup — entra pelo lado contrário do texto */}
        <div className="w-full">
          <MockStage>
            <Mock />
          </MockStage>
        </div>

      </div>

    </motion.article>
    </div>
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
