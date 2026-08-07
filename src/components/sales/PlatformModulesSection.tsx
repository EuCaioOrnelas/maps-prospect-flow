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
} from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { SectionHeading } from "@/components/landing/SectionHeading";
import { cn } from "@/lib/utils";

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
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          {badge}
        </span>
      )}
    </div>
    <div className="p-3.5 sm:p-4 bg-gradient-to-br from-transparent via-transparent to-primary/[0.04]">
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
  <div className="relative w-full rounded-[26px] p-3 sm:p-5 bg-[linear-gradient(145deg,hsl(var(--primary)/0.22)_0%,hsl(var(--primary)/0.10)_45%,hsl(var(--primary)/0.16)_100%)] ring-1 ring-inset ring-primary/20">
    <span className="pointer-events-none absolute left-2.5 top-2.5 w-4 h-4 border-l-2 border-t-2 border-primary/40 rounded-tl-md" aria-hidden="true" />
    <span className="pointer-events-none absolute right-2.5 top-2.5 w-4 h-4 border-r-2 border-t-2 border-primary/40 rounded-tr-md" aria-hidden="true" />
    <span className="pointer-events-none absolute left-2.5 bottom-2.5 w-4 h-4 border-l-2 border-b-2 border-primary/40 rounded-bl-md" aria-hidden="true" />
    <span className="pointer-events-none absolute right-2.5 bottom-2.5 w-4 h-4 border-r-2 border-b-2 border-primary/40 rounded-br-md" aria-hidden="true" />
    <div className="relative">{children}</div>
  </div>
);


const Bar = ({ value, tone = "primary" }: { value: number; tone?: "primary" | "amber" }) => (
  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
    <div
      className={cn("h-full rounded-full", tone === "primary" ? "bg-primary" : "bg-amber-500")}
      style={{ width: `${value}%` }}
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
        <div className="absolute inset-0 opacity-[0.5] [background-image:linear-gradient(hsl(var(--border))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border))_1px,transparent_1px)] [background-size:16px_16px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_45%_45%,hsl(var(--primary)/0.14),transparent_65%)]" />
        {[
          { t: "18%", l: "22%", hot: true },
          { t: "44%", l: "56%", hot: true },
          { t: "68%", l: "30%", hot: false },
          { t: "32%", l: "76%", hot: false },
          { t: "78%", l: "64%", hot: false },
        ].map((p, i) => (
          <span
            key={i}
            className={cn(
              "absolute w-5 h-5 rounded-full flex items-center justify-center ring-2",
              p.hot ? "bg-primary/25 ring-primary/30" : "bg-muted ring-border/60",
            )}
            style={{ top: p.t, left: p.l }}
          >
            <MapPin size={10} className={p.hot ? "text-primary" : "text-muted-foreground"} />
          </span>
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
        ].map((e) => (
          <Row key={e.n} className="space-y-1.5">
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
            <Bar value={e.s} tone={e.s > 85 ? "primary" : "amber"} />
            <div className="flex items-center gap-1.5">
              {e.tags.map((t) => (
                <Pill key={t} tone="outline">
                  {t === "Site" ? <Globe size={9} /> : <Phone size={9} />} {t}
                </Pill>
              ))}
              <span className="ml-auto text-[9px] font-semibold text-primary">Diagnóstico IA →</span>
            </div>
          </Row>
        ))}
      </div>
    </div>
  </MockShell>
);

/* ---------------------------- 2. SDR ---------------------------- */
const SdrMock = () => (
  <MockShell title="SDR Inteligente — WhatsApp" badge="IA ativa">
    <div className="flex items-center gap-2 pb-2.5 mb-2.5 border-b border-border/60">
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

    <div className="space-y-2">
      {[
        { me: false, t: "Oi! Vi que vocês trabalham com contabilidade. Quanto custa?", h: "09:41" },
        {
          me: true,
          t: "Olá, Marcos! Depende do porte. Hoje vocês atendem quantos clientes por mês?",
          h: "09:41",
        },
        { me: false, t: "Uns 40.", h: "09:43" },
        {
          me: true,
          t: "Perfeito 👊 Posso te mostrar em 15 min. Amanhã às 10h ou às 16h?",
          h: "09:43",
        },
      ].map((m, i) => (
        <div key={i} className={cn("flex", m.me ? "justify-end" : "justify-start")}>
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
      ))}
    </div>

    <div className="mt-3 rounded-xl border border-primary/20 bg-primary/[0.06] p-2.5">
      <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wide text-primary mb-1.5">
        <Sparkles size={10} /> Raciocínio da IA
      </p>
      <div className="space-y-1">
        {["Nome coletado: Marcos", "Necessidade entendida (40 clientes/mês)", "Reunião proposta — 2 horários"].map(
          (s) => (
            <p key={s} className="flex items-center gap-1.5 text-[10px] text-foreground/80">
              <Check size={10} className="text-primary" strokeWidth={3} /> {s}
            </p>
          ),
        )}
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2">
        <Pill tone="primary">Lead qualificado</Pill>
        <Pill tone="amber">Follow-up 24h</Pill>
      </div>
    </div>
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
      {["S", "T", "Q", "Q", "S", "S", "D"].map((d, i) => (
        <span key={i} className="text-center text-[9px] font-semibold text-muted-foreground">
          {d}
        </span>
      ))}
      {Array.from({ length: 21 }).map((_, i) => {
        const green = [4, 9, 15].includes(i);
        const blue = [7, 18].includes(i);
        return (
          <span
            key={i}
            className={cn(
              "aspect-square rounded-md text-[9px] flex flex-col items-center justify-center gap-0.5 border",
              green
                ? "bg-primary/10 text-primary font-bold border-primary/25"
                : blue
                  ? "bg-sky-500/10 text-sky-600 font-bold border-sky-500/25"
                  : "bg-muted/40 text-muted-foreground border-transparent",
            )}
          >
            {i + 1}
            {(green || blue) && (
              <span className={cn("w-1 h-1 rounded-full", green ? "bg-primary" : "bg-sky-500")} />
            )}
          </span>
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
      ].map((e) => (
        <Row key={e.h} className="flex items-center gap-2">
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
            {e.who.map((w) => (
              <span
                key={w}
                className="w-5 h-5 rounded-full bg-muted border border-background text-[8px] font-bold text-muted-foreground flex items-center justify-center"
              >
                {w}
              </span>
            ))}
          </div>
        </Row>
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
const CampaignMock = () => (
  <MockShell title="Campanhas — API Oficial Meta" badge="enviando">
    <div className="grid grid-cols-4 gap-2 mb-3">
      {[
        { l: "Enviadas", v: "1.400", d: "" },
        { l: "Entregues", v: "1.248", d: "89%" },
        { l: "Lidas", v: "1.032", d: "74%" },
        { l: "Respostas", v: "317", d: "23%" },
      ].map((k) => (
        <Row key={k.l} className="text-center py-2">
          <p className="text-sm font-bold text-foreground leading-none">{k.v}</p>
          <p className="text-[8px] text-muted-foreground uppercase tracking-wide mt-1">{k.l}</p>
          {k.d && <p className="text-[9px] font-bold text-primary mt-0.5">{k.d}</p>}
        </Row>
      ))}
    </div>

    <div className="space-y-2">
      {[
        { n: "Reativação — Base fria", s: "Concluída", tone: "primary" as const, p: 100, t: "template_reativacao_v2" },
        { n: "Oferta Julho — ICP contábil", s: "Enviando", tone: "amber" as const, p: 62, t: "oferta_julho_pt_br" },
      ].map((c) => (
        <Row key={c.n} className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Send size={13} className="text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-foreground truncate">{c.n}</p>
              <p className="text-[9px] text-muted-foreground font-mono truncate">{c.t}</p>
            </div>
            <Pill tone={c.tone}>{c.s}</Pill>
          </div>
          <Bar value={c.p} tone={c.p === 100 ? "primary" : "amber"} />
        </Row>
      ))}
      <div className="flex items-center gap-1.5 pt-0.5">
        <Pill tone="info">
          <ShieldCheck size={9} /> Conta verificada Meta
        </Pill>
        <Pill tone="outline">Qualidade: Alta</Pill>
        <Pill tone="outline">Delay seguro</Pill>
      </div>
    </div>
  </MockShell>
);

/* ---------------------------- 5. CRM ---------------------------- */
const CrmMock = () => (
  <MockShell title="CRM Inteligente — Pipeline" badge="score IA">
    <div className="flex items-center gap-2 mb-3">
      <Pill tone="primary">
        <TrendingUp size={9} /> R$ 184.000 em negociação
      </Pill>
      <Pill tone="outline">12 leads</Pill>
    </div>
    <div className="grid grid-cols-3 gap-2">
      {[
        {
          c: "Prospectado",
          n: 5,
          items: [
            { n: "Alpha Contab.", s: 92, v: "R$ 4.9k", tag: "Quente" },
            { n: "Vetor Eng.", s: 61, v: "R$ 2.1k", tag: "" },
          ],
        },
        {
          c: "Em negociação",
          n: 4,
          items: [{ n: "Nexus Odonto", s: 88, v: "R$ 7.4k", tag: "Proposta" }],
        },
        {
          c: "Fechamento",
          n: 3,
          items: [{ n: "Grupo Orion", s: 95, v: "R$ 12k", tag: "Contrato" }],
        },
      ].map((col) => (
        <div key={col.c} className="space-y-2">
          <div className="flex items-center gap-1">
            <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground truncate">
              {col.c}
            </p>
            <span className="text-[8px] font-bold text-muted-foreground bg-muted rounded px-1">
              {col.n}
            </span>
          </div>
          {col.items.map((it) => (
            <Row key={it.n} className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Building2 size={9} className="text-primary" />
                </span>
                <p className="text-[10px] font-semibold text-foreground truncate">{it.n}</p>
              </div>
              <p className="text-[10px] font-bold text-primary">{it.v}</p>
              <Bar value={it.s} tone={it.s > 85 ? "primary" : "amber"} />
              <div className="flex items-center gap-1">
                <Pill tone={it.s > 85 ? "primary" : "muted"}>Score {it.s}</Pill>
                {it.tag && <Pill tone="outline">{it.tag}</Pill>}
              </div>
            </Row>
          ))}
        </div>
      ))}
    </div>
  </MockShell>
);

/* ---------------------------- 6. Chat ---------------------------- */
const ChatMock = () => (
  <MockShell title="Central de Conversas" badge="3 online">
    <div className="grid grid-cols-5 gap-3">
      <div className="col-span-2 space-y-2">
        <div className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/70 px-2 py-1.5 mb-1">
          <Search size={10} className="text-muted-foreground" />
          <span className="text-[9px] text-muted-foreground">Buscar conversa</span>
        </div>
        {[
          { n: "Marcos S.", m: "Vocês atendem fora de SP?", u: 2, t: "09:41" },
          { n: "Julia R.", m: "Recebi a proposta, obrigada!", u: 0, t: "09:12" },
          { n: "Pedro L.", m: "Podemos falar amanhã?", u: 1, t: "Ontem" },
        ].map((c, i) => (
          <Row
            key={c.n}
            className={cn("flex items-center gap-2", i === 0 && "border-primary/30 bg-primary/[0.07]")}
          >
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Users size={11} className="text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold text-foreground truncate">{c.n}</p>
              <p className="text-[9px] text-muted-foreground truncate">{c.m}</p>
            </div>
            {c.u > 0 && (
              <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[8px] font-bold flex items-center justify-center flex-shrink-0">
                {c.u}
              </span>
            )}
          </Row>
        ))}
      </div>

      <div className="col-span-3 flex flex-col gap-2">
        <div className="flex items-center gap-2 pb-2 border-b border-border/60">
          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
            <Users size={11} className="text-primary" />
          </div>
          <p className="text-[10px] font-semibold text-foreground">Marcos S.</p>
          <Pill tone="outline">
            <Tag size={9} /> VIP
          </Pill>
        </div>
        <div className="rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-[11px] text-muted-foreground max-w-[92%]">
          Vocês atendem fora de SP?
        </div>
        <div className="rounded-2xl rounded-br-sm bg-primary/12 ring-1 ring-inset ring-primary/15 px-3 py-2 text-[11px] text-foreground ml-auto max-w-[92%]">
          Atendemos todo o Brasil 🇧🇷 Quer falar com um especialista hoje?
          <span className="mt-1 flex items-center justify-end gap-1 text-[8px] text-muted-foreground">
            09:42 <CheckCheck size={9} className="text-sky-500" />
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/70 px-2.5 py-1.5">
          <Smile size={11} className="text-muted-foreground" />
          <Paperclip size={11} className="text-muted-foreground" />
          <span className="text-[9px] text-muted-foreground flex-1">Digite uma mensagem…</span>
          <span className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
            <Send size={9} className="text-primary-foreground" />
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Pill tone="primary">
            <Bot size={9} /> IA respondeu
          </Pill>
          <Pill tone="amber">
            <UserCheck size={9} /> Transferir p/ humano
          </Pill>
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
}: {
  icon: typeof Search;
  label: string;
  sub?: string;
  tone?: "primary" | "info" | "amber" | "muted";
}) => (
  <div className="flex flex-col items-center text-center w-[92px]">
    <div
      className={cn(
        "w-9 h-9 rounded-full flex items-center justify-center ring-4",
        tone === "primary" && "bg-primary text-primary-foreground ring-primary/15",
        tone === "info" && "bg-sky-500 text-white ring-sky-500/15",
        tone === "amber" && "bg-amber-500 text-white ring-amber-500/15",
        tone === "muted" && "bg-muted text-muted-foreground ring-border/40",
      )}
    >
      <Icon size={15} />
    </div>
    <p className="mt-1.5 text-[9px] font-bold uppercase tracking-wide text-foreground leading-tight">
      {label}
    </p>
    {sub && <p className="text-[8px] text-muted-foreground leading-tight mt-0.5">{sub}</p>}
  </div>
);

const DottedLine = ({ className = "" }: { className?: string }) => (
  <span
    className={cn("block border-dashed border-primary/45", className)}
    aria-hidden="true"
  />
);

const FlowMock = () => (
  <MockShell title="Fluxos Inteligentes — Construtor visual" badge="publicado">
    <div className="relative py-1">
      {/* Linha 1 — gatilho → atendimento */}
      <div className="flex items-start justify-center gap-2">
        <FlowNode icon={MessageSquare} label="Gatilho" sub="Mensagem recebida" />
        <DottedLine className="mt-4 w-8 border-t-2" />
        <FlowNode icon={Bot} label="Atendimento" sub="IA inicia conversa" tone="info" />
        <DottedLine className="mt-4 w-8 border-t-2" />
        <FlowNode icon={UserCheck} label="Triagem" sub="Coleta de dados" tone="muted" />
      </div>

      {/* conector vertical */}
      <div className="flex justify-center">
        <DottedLine className="h-5 border-l-2" />
      </div>

      {/* Linha 2 — condição */}
      <div className="flex justify-center">
        <FlowNode icon={GitBranch} label="Qualificado?" sub="Condição / Teste A/B" tone="amber" />
      </div>

      {/* ramificação */}
      <div className="flex justify-center items-stretch">
        <div className="w-1/2 h-5 border-l-2 border-t-2 border-dashed border-primary/45 rounded-tl-lg mt-0" />
        <div className="w-1/2 h-5 border-r-2 border-t-2 border-dashed border-primary/45 rounded-tr-lg" />
      </div>

      {/* Linha 3 — saídas */}
      <div className="flex items-start justify-between px-1">
        <FlowNode icon={CalendarDays} label="Agendar" sub="Reunião na agenda" />
        <FlowNode icon={Timer} label="Espera" sub="Follow-up 2h úteis" tone="muted" />
        <FlowNode icon={LayoutDashboard} label="CRM" sub="Move de etapa" tone="info" />
      </div>

      <div className="flex justify-center">
        <DottedLine className="h-5 border-l-2" />
      </div>

      <div className="flex justify-center">
        <FlowNode icon={CheckCheck} label="Entrega" sub="Vendedor notificado" />
      </div>

      {/* rodapé de métricas */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[
          { i: Zap, l: "Entradas", v: "842" },
          { i: BarChart3, l: "Conclusão", v: "68%" },
          { i: Mail, l: "Integrações", v: "Sheets" },
        ].map((k) => (
          <Row key={k.l} className="flex items-center gap-1.5 py-1.5">
            <k.i size={11} className="text-primary flex-shrink-0" />
            <p className="text-[9px] text-muted-foreground truncate flex-1">{k.l}</p>
            <p className="text-[10px] font-bold text-foreground">{k.v}</p>
          </Row>
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
    <motion.article
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15, margin: "0px 0px -80px 0px" }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
      style={{ contentVisibility: "auto", containIntrinsicSize: "560px" } as React.CSSProperties}
      className={cn(
        "relative overflow-hidden rounded-3xl border border-border p-5 sm:p-8 lg:p-10",
        "w-full lg:min-h-[560px] flex items-center",
        "shadow-[0_18px_50px_-40px_hsl(var(--foreground)/0.35)]",
        reversed
          ? "bg-[linear-gradient(300deg,hsl(var(--primary)/0.10)_0%,hsl(var(--card))_45%,hsl(var(--card))_100%)]"
          : "bg-[linear-gradient(60deg,hsl(var(--primary)/0.10)_0%,hsl(var(--card))_45%,hsl(var(--card))_100%)]",
      )}
    >

      <div
        className={cn(
          "absolute -top-24 w-72 h-72 rounded-full pointer-events-none opacity-[0.5]",
          reversed ? "-left-24" : "-right-24",
        )}
        style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.14), transparent 70%)" }}
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
          <div className="inline-flex items-center gap-2.5 mb-4 rounded-full border border-primary/20 bg-primary/[0.08] pl-1.5 pr-3.5 py-1.5">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 shadow-[0_6px_16px_-6px_hsl(var(--primary))]">
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
                className="flex items-center gap-2.5 rounded-xl border border-border/50 bg-background/40 px-3 py-2"
              >
                <span className="w-5 h-5 min-w-[20px] rounded-full bg-primary flex items-center justify-center shadow-[0_4px_10px_-4px_hsl(var(--primary))]">
                  <Check size={11} className="text-primary-foreground" strokeWidth={3.5} />
                </span>
                <span className="text-[13px] font-medium text-foreground/90 leading-snug">{b}</span>
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
