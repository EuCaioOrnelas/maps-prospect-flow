import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LineChart, Line as RLine, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer } from "recharts";
import {
  useLeadIntelligenceProfile,
  PRIORITY_LABELS,
  STAGE_LABELS,
  BEHAVIOR_LABELS,
  MOMENTUM_LABELS,
} from "@/hooks/useLeadIntelligence";
import {
  useLeadIntelligenceDetail,
  type ConversationAnalysis,
  type ProspectData,
} from "@/hooks/useLeadIntelligenceDetail";
import { useLeadScores } from "@/hooks/useLeadScores";
import { toIntel100, dimensionTo100 } from "@/lib/intelligence";
import type { Lead } from "@/hooks/useCRM";
import {
  Brain, Target, Zap, TrendingUp, TrendingDown, Minus, AlertTriangle,
  Building2, MessageSquare, Lightbulb, Sparkles, ShieldAlert, MapPin,
  DollarSign, CheckCircle2, Clock, ArrowRight, Star, Globe, Mail, Phone,
} from "lucide-react";

interface Props {
  phone?: string | null;
  lead?: Lead | null;
  className?: string;
}

/* ------------------------------------------------------------------ labels */

const SIGNAL_LABELS: Record<string, string> = {
  INTENT_PRICE: "Perguntou preço",
  INTENT_BUY_NOW: "Disse que quer comprar",
  INTENT_PAYMENT: "Falou sobre pagamento",
  INTENT_PROPOSAL: "Pediu proposta",
  INTENT_URGENT: "Demonstrou urgência",
  INTENT_AVAILABILITY: "Perguntou disponibilidade",
  OBJECTION_PRICE: "Objeção de preço",
  OBJECTION_TIME: "Objeção de tempo",
  INBOUND_MESSAGE: "Mensagem do contato",
  INBOUND_STREAK_3: "3 mensagens seguidas do contato",
  INBOUND_AFTER_24H_SILENCE: "Voltou a falar após 24h de silêncio",
  INBOUND_AFTER_7D_SILENCE: "Reativou após 7 dias parado",
  BACK_AND_FORTH_5_TURNS: "Conversa com 5 idas e vindas",
  CONVERSATION_ACTIVE_3D: "Conversa ativa nos últimos 3 dias",
  CONVERSATION_ACTIVE_5D: "Conversa ativa nos últimos 5 dias",
  OUTBOUND_REPLY_RECEIVED_WITHIN_1H: "Respondeu em menos de 1 hora",
  MEETING_SCHEDULED: "Reunião agendada",
  NO_REPLY: "Sem resposta",
  INACTIVITY: "Inatividade",
  NICHE_FIT: "Aderência ao nicho",
  AUDIO_RECEIVED: "Áudio recebido",
};

const signalLabel = (t: string) =>
  SIGNAL_LABELS[t] || t.replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase());

const bandF = (v: number) => (v >= 80 ? "Muito alta" : v >= 60 ? "Alta" : v >= 40 ? "Média" : v >= 20 ? "Baixa" : "Muito baixa");
const bandM = (v: number) => (v >= 80 ? "Muito alto" : v >= 60 ? "Alto" : v >= 40 ? "Médio" : v >= 20 ? "Baixo" : "Muito baixo");

const hoursLabel = (h: number) =>
  h < 1 ? "menos de 1 hora" : h < 48 ? `${Math.round(h)} h` : `${Math.round(h / 24)} dias`;

/* -------------------------------------------------------------- primitives */

function Block({
  icon: Icon, title, action, children, className,
}: {
  icon?: React.ElementType; title?: string; action?: React.ReactNode;
  children: React.ReactNode; className?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-border/60 bg-card", className)}>
      {title && (
        <header className="flex items-center gap-2 px-3.5 py-2.5 border-b border-border/50">
          {Icon && <Icon className="w-3.5 h-3.5 text-primary shrink-0" />}
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex-1 min-w-0 truncate">
            {title}
          </h4>
          {action}
        </header>
      )}
      <div className="p-3.5">{children}</div>
    </section>
  );
}

function Field({ label, value, icon: Icon }: { label: string; value?: React.ReactNode; icon?: React.ElementType }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/80 font-medium">{label}</p>
      <p className="text-[13px] font-medium text-foreground mt-0.5 leading-snug flex items-center gap-1.5 break-words">
        {Icon && <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
        <span className="min-w-0 break-words">{value}</span>
      </p>
    </div>
  );
}

function DimensionCard({
  label, icon: Icon, value, caption, tone = "primary",
}: {
  label: string; icon: React.ElementType; value: number | null; caption: string;
  tone?: "primary" | "warn";
}) {
  const empty = value === null;
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5 hover:bg-muted/40 transition-colors">
      <div className="flex items-center gap-1.5">
        <Icon className={cn("w-3.5 h-3.5", empty ? "text-muted-foreground/60" : tone === "warn" ? "text-amber-500" : "text-primary")} />
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium truncate">{label}</p>
      </div>
      {empty ? (
        <p className="text-[12px] text-muted-foreground mt-1.5 leading-snug">Sem dados suficientes</p>
      ) : (
        <>
          <p className="mt-1 text-[15px] font-semibold text-foreground leading-none tabular-nums">
            {value}<span className="text-[10px] font-normal text-muted-foreground"> /100</span>
          </p>
          <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-[width] duration-700", tone === "warn" ? "bg-amber-500" : "bg-primary")}
              style={{ width: `${Math.max(2, Math.min(100, value))}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground truncate">{caption}</p>
        </>
      )}
    </div>
  );
}

function StateCard({
  label, icon: Icon, value, caption,
}: { label: string; icon: React.ElementType; value: string; caption?: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
      <div className="flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 text-primary" />
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium truncate">{label}</p>
      </div>
      <p className="mt-1 text-[15px] font-semibold text-foreground leading-tight">{value}</p>
      {caption && <p className="mt-1 text-[11px] text-muted-foreground leading-snug">{caption}</p>}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium truncate">{label}</p>
      <p className="text-sm font-semibold text-foreground mt-0.5 tabular-nums leading-tight">{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{hint}</p>}
    </div>
  );
}

function Empty({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border/70 bg-muted/10 px-4 py-5 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed max-w-md mx-auto">{description}</p>
      {action && <div className="mt-3 flex justify-center">{action}</div>}
    </div>
  );
}

function EvidenceRow({
  label, quote, at, source, positive = true,
}: { label: string; quote?: string; at?: string; source?: string; positive?: boolean }) {
  const [open, setOpen] = useState(false);
  const hasQuote = !!quote;
  return (
    <li className="border-b border-border/40 last:border-0">
      <button
        type="button"
        disabled={!hasQuote}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "w-full flex items-start gap-2 py-1.5 text-left",
          hasQuote && "hover:opacity-80 transition-opacity cursor-pointer"
        )}
      >
        {positive
          ? <CheckCircle2 className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
          : <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />}
        <span className="text-[13px] text-foreground/90 leading-snug flex-1 min-w-0">{label}</span>
        {hasQuote && <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">{open ? "ocultar" : "evidência"}</span>}
      </button>
      {open && hasQuote && (
        <div className="ml-5 mb-2 rounded-md border-l-2 border-primary/40 bg-muted/30 px-2.5 py-1.5">
          <p className="text-[12px] text-foreground leading-relaxed">“{quote}”</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            {at ? format(new Date(at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : ""}{source ? ` · ${source}` : ""}
          </p>
        </div>
      )}
    </li>
  );
}

/* ------------------------------------------------------ próxima melhor ação */

interface NextAction {
  title: string;
  why: string;
  channel: string;
  what: string;
  script: string | null;
  cta: string;
}

function buildAction(ctx: {
  conv: ConversationAnalysis | null;
  prospect: ProspectData | null;
  lead?: Lead | null;
  opportunity: number;
  intent: number | null;
}): NextAction {
  const { conv, prospect, lead, opportunity, intent } = ctx;
  const firstName = (lead?.contact_name || prospect?.contact_name || "").trim().split(/\s+/)[0] || "";
  const hello = firstName ? `Oi ${firstName}` : "Olá";
  const company = lead?.company_name || prospect?.company_name || "";
  const niche = lead?.category || prospect?.category || "";
  const diagnosis = prospect?.ai_diagnosis || "";
  const channel = conv?.sources?.[0] || "WhatsApp";

  // 1. Sem conversa registrada — nunca afirmar interação.
  if (!conv) {
    const hasContext = !!(company || niche || diagnosis);
    return {
      title: "Fazer o primeiro contato",
      why: "Este contato foi prospectado, mas não existe nenhuma conversa registrada no WhatsApp. Sem interação, a Inteligência não consegue avaliar intenção nem engajamento.",
      channel,
      what: "Abrir a conversa com uma abordagem específica sobre a empresa e uma única pergunta.",
      script: hasContext
        ? `${hello}! Falo com ${company || "vocês"}${niche ? ` (${niche})` : ""}? ${diagnosis ? `Reparei em algo no material de vocês: ${String(diagnosis).slice(0, 140)}` : "Estudei rapidamente o trabalho de vocês"}. Posso te fazer uma pergunta rápida sobre isso?`
        : null,
      cta: "Iniciar conversa",
    };
  }

  // 2. Contato aguardando resposta.
  if (conv.waitingReplyHours !== null) {
    const last = conv.leadMessages[conv.leadMessages.length - 1]?.content;
    const priceIntent = conv.intents.find((i) => i.key === "PRICE");
    return {
      title: "Responder agora",
      why: `A última mensagem é do contato e está sem resposta há ${hoursLabel(conv.waitingReplyHours)}.`,
      channel,
      what: priceIntent
        ? "Responder objetivamente à pergunta sobre valores e propor o próximo passo."
        : "Responder ao que ele escreveu e encerrar com uma pergunta que exija resposta.",
      script: last
        ? `${hello}! Sobre "${String(last).slice(0, 80)}" — já consigo te responder. ${priceIntent ? "Te passo o valor e o prazo agora; prefere por aqui ou numa ligação rápida?" : "Me confirma só uma coisa pra eu te passar certinho?"}`
        : null,
      cta: "Abrir conversa",
    };
  }

  // 3. Objeção real detectada.
  const objection = conv.objections[0];
  if (objection) {
    return {
      title: `Tratar ${objection.label.toLowerCase()}`,
      why: `Objeção identificada na conversa em ${format(new Date(objection.at), "dd/MM", { locale: ptBR })}: “${objection.quote.slice(0, 90)}”.`,
      channel,
      what: objection.key === "PRICE"
        ? "Entender a comparação antes de qualquer desconto e mostrar o retorno em número."
        : "Endereçar diretamente a objeção citada e combinar o próximo passo com data.",
      script: `${hello}, entendi o seu ponto. Posso te mostrar rapidamente como resolvemos exatamente isso${company ? ` em casos como o da ${company}` : ""}?`,
      cta: "Abrir conversa",
    };
  }

  // 4. Alta intenção e conversa viva.
  if ((intent ?? 0) >= 60 || opportunity >= 75) {
    return {
      title: "Levar para o fechamento",
      why: `Intenção e oportunidade altas com base em ${conv.total} mensagens reais e ${conv.intents.length} sinal(is) de intenção na conversa.`,
      channel,
      what: "Enviar proposta com valor, prazo e forma de pagamento e marcar a data da decisão.",
      script: `${hello}! Já consigo montar a proposta com o que conversamos. Consigo te apresentar em 5 minutos hoje?`,
      cta: "Abrir conversa",
    };
  }

  // 5. Conversa parada.
  if (conv.silenceHours !== null && conv.silenceHours > 72) {
    return {
      title: "Reaquecer o contato",
      why: `A última mensagem foi há ${hoursLabel(conv.silenceHours)} e a atividade parou.`,
      channel,
      what: "Retomar com uma pergunta objetiva sobre o problema dele, não sobre o produto.",
      script: `${hello}! Retomando nossa conversa — hoje o que mais atrapalha${niche ? ` na operação de ${niche.toLowerCase()}` : ""} aí?`,
      cta: "Abrir conversa",
    };
  }

  return {
    title: "Qualificar e avançar",
    why: `Existe conversa (${conv.total} mensagens), mas ainda sem sinais claros de decisão de compra.`,
    channel,
    what: "Confirmar necessidade, prazo e quem decide antes de enviar proposta.",
    script: `${hello}! Pra eu te ajudar direito: qual é o prazo que vocês têm em mente e quem mais participa dessa decisão?`,
    cta: "Abrir conversa",
  };
}

/* ------------------------------------------------------------------- panel */

export function LeadIntelligencePanel({ phone, lead, className }: Props) {
  const { data: intel, isLoading } = useLeadIntelligenceProfile(phone);
  const { getScoreForPhone } = useLeadScores();
  const legacy = phone ? getScoreForPhone(phone) : undefined;
  const {
    conversation: conv, conversationLoading, signals, history, deals, prospect, patterns,
  } = useLeadIntelligenceDetail(phone, lead?.id);

  const openChat = () => {
    const p = (phone || lead?.phone || "").replace(/\D/g, "");
    window.location.href = p ? `/chat?phone=${p}` : "/chat";
  };

  /* ---------- valores centrais (mesma fonte do card, ranking e central) ---------- */
  const opportunity = intel ? intel.opportunity_score : toIntel100(legacy?.score_total);
  const hasConversationData = !!conv;
  const hasSignals = signals.length > 0;

  const dim = (raw: number | null | undefined, requires: boolean) => {
    if (!intel || !requires) return null;
    const v = dimensionTo100(raw);
    return v > 0 ? v : null;
  };

  const intent = dim(intel?.intent_score, hasConversationData || hasSignals);
  const engagement = dim(intel?.engagement_score, hasConversationData);
  const quality = dim(intel?.quality_score, true);
  const fit = dim(intel?.fit_score, true);
  const risk = dim(intel?.risk_score, hasConversationData || hasSignals);

  const momentumState = intel?.momentum_state || "";
  const MomentumIcon = momentumState.includes("RISING") ? TrendingUp : momentumState.includes("DECLINING") ? TrendingDown : Minus;
  const momentumLabel = momentumState ? MOMENTUM_LABELS[momentumState] || "Estável" : "Sem dados";

  const classification = bandF(opportunity);

  const lastTouch = conv?.lastMessageAt || lead?.last_response_at || lead?.last_message_sent_at || null;
  const recency = lastTouch ? formatDistanceToNow(new Date(lastTouch), { addSuffix: true, locale: ptBR }) : null;

  /* --------------------------------- resumo executivo baseado só em fato --- */
  const summary = useMemo(() => {
    const parts: string[] = [];
    const company = lead?.company_name || prospect?.company_name;
    const niche = lead?.category || prospect?.category;
    if (conv) {
      parts.push(`${conv.total} mensagens trocadas (${conv.inbound} do contato) em ${conv.activeDays} dia(s)`);
      if (conv.intents.length) parts.push(`${conv.intents.length} sinal(is) de intenção na conversa`);
      else parts.push("ainda sem sinais claros de intenção de compra");
      if (conv.waitingReplyHours !== null) parts.push(`contato aguardando resposta há ${hoursLabel(conv.waitingReplyHours)}`);
    } else {
      parts.push("nenhuma conversa registrada no WhatsApp — intenção e engajamento ainda não podem ser avaliados");
      if (company || niche) parts.push(`avaliação baseada apenas nos dados de prospecção${niche ? ` (${niche})` : ""}`);
    }
    if (deals.length) parts.push(`${deals.length} negociação(ões) no histórico`);
    return parts.join(" · ").replace(/^./, (c) => c.toUpperCase()) + ".";
  }, [conv, deals.length, lead?.company_name, lead?.category, prospect]);

  /* --------------------------------------------- sinais positivos / atenção */
  const positives = useMemo(() => {
    const out: { label: string; quote?: string; at?: string; source?: string }[] = [];
    conv?.intents.forEach((i) => out.push({ label: i.label, quote: i.quote, at: i.at, source: i.source }));
    if (conv && conv.total >= 5) out.push({ label: `Conversa ativa com ${conv.total} mensagens em ${conv.activeDays} dia(s)` });
    if (conv && conv.reciprocity >= 35) out.push({ label: `Reciprocidade de ${conv.reciprocity}% — o contato participa da conversa` });
    if (conv?.leadAvgResponseMinutes != null && conv.leadAvgResponseMinutes <= 60) out.push({ label: `O contato responde em média em ${conv.leadAvgResponseMinutes} min` });
    if (conv?.transcribedAudioCount) out.push({ label: `${conv.transcribedAudioCount} áudio(s) transcrito(s) e analisado(s)` });
    if ((fit ?? 0) >= 60) out.push({ label: "Perfil compatível com o que você vende (fit calculado pelo motor)" });
    if (prospect?.ai_diagnosis) out.push({ label: "Diagnóstico da empresa disponível na prospecção", quote: String(prospect.ai_diagnosis).slice(0, 300), source: "Prospecção" });
    if (prospect?.rating != null) out.push({ label: `Empresa com avaliação pública ${prospect.rating}${prospect.review_count ? ` (${prospect.review_count} avaliações)` : ""}`, source: "Google Maps" });
    (intel?.factors || []).forEach((f) => { if (f.impact > 0) out.push({ label: f.label }); });
    return out;
  }, [conv, fit, prospect, intel]);

  const attention = useMemo(() => {
    const out: { label: string; quote?: string; at?: string; source?: string }[] = [];
    if (!conv) out.push({ label: "Nenhuma conversa registrada para este número (Evolution ou Meta)" });
    if (conv?.waitingReplyHours != null) out.push({ label: `Mensagem do contato sem resposta há ${hoursLabel(conv.waitingReplyHours)}` });
    conv?.objections.forEach((o) => out.push({ label: o.label, quote: o.quote, at: o.at, source: o.source }));
    if (conv && conv.silenceHours != null && conv.silenceHours > 168) out.push({ label: `Sem nenhuma mensagem há ${hoursLabel(conv.silenceHours)}` });
    if (momentumState.includes("DECLINING")) out.push({ label: "Atividade em queda em relação ao período anterior" });
    if (conv && !conv.intents.length) out.push({ label: "Nenhum sinal de intenção comercial identificado na conversa" });
    if (!lead?.email) out.push({ label: "Contato sem e-mail cadastrado" });
    (intel?.risk_factors || []).forEach((r) => out.push({ label: r.label }));
    return out;
  }, [conv, momentumState, lead?.email, intel]);

  const action = buildAction({ conv, prospect, lead, opportunity, intent });

  const wonDeals = deals.filter((d: any) => /ganho|fechad|pago|conclu/i.test(String(d.status || "")));
  const lostDeals = deals.filter((d: any) => /perdid|cancel/i.test(String(d.status || "")));
  const convertedPattern: any = patterns.find((p: any) => p.pattern_kind === "CONVERTED" && (p.sample_size || 0) >= 5);
  const lostPattern: any = patterns.find((p: any) => p.pattern_kind === "LOST" && (p.sample_size || 0) >= 5);

  const chartData = useMemo(
    () =>
      [...history]
        .filter((h) => h.score_after != null)
        .reverse()
        .map((h) => ({
          date: format(new Date(h.created_at), "dd/MM", { locale: ptBR }),
          valor: toIntel100(h.score_after),
        })),
    [history]
  );

  if (isLoading) {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="h-28 rounded-xl border border-border/60 bg-muted/30 animate-pulse" />
        <div className="h-40 rounded-xl border border-border/60 bg-muted/20 animate-pulse" />
      </div>
    );
  }

  const companyName = lead?.company_name || prospect?.company_name || intel?.company_name || lead?.contact_name || "Contato";
  const nicheName = lead?.category || prospect?.category || intel?.niche || null;

  return (
    <div className={cn("space-y-4", className)}>
      {/* ------------------------------------------------------------ header */}
      <header className="rounded-xl border border-border/60 bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Brain className="w-[18px] h-[18px] text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Inteligência Wiize</p>
              <p className="text-sm font-semibold text-foreground truncate">
                {companyName}
                {nicheName && <span className="text-muted-foreground font-normal"> · {nicheName}</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {intel && <Badge variant="outline" className="rounded-md text-[10px]">Prioridade {PRIORITY_LABELS[intel.priority] || intel.priority}</Badge>}
            {intel && <Badge variant="secondary" className="rounded-md text-[10px]">{STAGE_LABELS[intel.stage] || intel.stage}</Badge>}
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Oportunidade</p>
            <div className="flex items-end gap-2 mt-1">
              <p className="text-[34px] leading-none font-bold tabular-nums text-foreground">
                {opportunity}<span className="text-base font-medium text-muted-foreground"> de 100</span>
              </p>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="rounded-md text-[11px]">{classification}</Badge>
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <MomentumIcon className="w-3.5 h-3.5" /> {momentumLabel}
              </span>
              <Badge variant="secondary" className="rounded-md text-[10px] font-normal">{basis.badge}</Badge>
            </div>
            <div className="mt-2.5 h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-[width] duration-700" style={{ width: `${opportunity}%` }} />
            </div>
            <p className="mt-2 text-[12px] text-muted-foreground leading-relaxed">{basis.explain}</p>
          </div>
          <p className="text-[13px] text-muted-foreground leading-relaxed">{summary}</p>
        </div>
      </header>

      {/* -------------------------------------------------------------- tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto rounded-lg">
          <TabsTrigger value="overview" className="text-[12px] gap-1.5"><Target className="w-3.5 h-3.5" />Visão geral</TabsTrigger>
          <TabsTrigger value="conversation" className="text-[12px] gap-1.5"><MessageSquare className="w-3.5 h-3.5" />Conversa</TabsTrigger>
          <TabsTrigger value="company" className="text-[12px] gap-1.5"><Building2 className="w-3.5 h-3.5" />Empresa</TabsTrigger>
          <TabsTrigger value="prospect" className="text-[12px] gap-1.5"><MapPin className="w-3.5 h-3.5" />Prospecção</TabsTrigger>
          <TabsTrigger value="commercial" className="text-[12px] gap-1.5"><DollarSign className="w-3.5 h-3.5" />Comercial</TabsTrigger>
          <TabsTrigger value="evolution" className="text-[12px] gap-1.5"><TrendingUp className="w-3.5 h-3.5" />Evolução</TabsTrigger>
        </TabsList>

        {/* ------------------------------------------------------- visão geral */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <Block icon={Target} title="Dimensões da Inteligência">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <DimensionCard label="Intenção" icon={Target} value={intent} caption={intent !== null ? bandF(intent) : ""} />
              <DimensionCard label="Engajamento" icon={Zap} value={engagement} caption={engagement !== null ? bandM(engagement) : ""} />
              <StateCard
                label="Momentum"
                icon={MomentumIcon}
                value={momentumLabel}
                caption={intel && intel.momentum_value !== 0 ? `${intel.momentum_value > 0 ? "+" : ""}${intel.momentum_value} vs. período anterior` : undefined}
              />
              <DimensionCard label="Risco" icon={ShieldAlert} value={risk} caption={risk !== null ? bandM(risk) : ""} tone="warn" />
              <DimensionCard label="Fit" icon={Building2} value={fit} caption={fit !== null ? bandM(fit) : ""} />
              <DimensionCard label="Qualidade" icon={Sparkles} value={quality} caption={quality !== null ? bandF(quality) : ""} />
              <StateCard label="Recência" icon={Clock} value={recency || "Sem interação"} caption={recency ? "Última interação registrada" : "Nenhuma mensagem registrada"} />
              <StateCard
                label="Comportamento"
                icon={Brain}
                value={intel?.behaviors?.length ? BEHAVIOR_LABELS[intel.behaviors[0]] || intel.behaviors[0] : "Sem dados"}
                caption={intel?.behaviors?.length ? intel.behaviors.slice(1, 3).map((b) => BEHAVIOR_LABELS[b] || b).join(" · ") || undefined : undefined}
              />
            </div>
          </Block>


          <div className="grid gap-3 lg:grid-cols-2">
            <Block icon={Sparkles} title={`Por que a Oportunidade está em ${opportunity}`}>
              {positives.length === 0 && attention.length === 0 ? (
                <Empty title="Ainda sem evidências" description="Quando houver conversa, sinais ou dados de prospecção, a Inteligência explica aqui cada fator que influenciou a Oportunidade." />
              ) : (
                <div className="space-y-3">
                  {positives.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Influências positivas</p>
                      <ul>{positives.slice(0, 7).map((p, i) => <EvidenceRow key={i} {...p} />)}</ul>
                    </div>
                  )}
                  {attention.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Pontos de atenção</p>
                      <ul>{attention.slice(0, 7).map((p, i) => <EvidenceRow key={i} positive={false} {...p} />)}</ul>
                    </div>
                  )}
                </div>
              )}
            </Block>

            <Block
              icon={Lightbulb}
              title="Próxima melhor ação"
              className="border-primary/30"
              action={<Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={openChat}>{action.cta}<ArrowRight className="w-3 h-3" /></Button>}
            >
              <p className="text-sm font-semibold text-foreground">{action.title}</p>
              <p className="text-[13px] text-muted-foreground leading-relaxed mt-1">{action.why}</p>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <Stat label="Canal" value={action.channel} />
                <Stat label="O que fazer" value={action.what.length > 42 ? action.what.slice(0, 42) + "…" : action.what} hint={action.what.length > 42 ? action.what : undefined} />
              </div>
              <div className="mt-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Mensagem sugerida</p>
                {action.script ? (
                  <p className="text-[13px] text-foreground leading-relaxed border-l-2 border-primary/40 pl-2.5 italic">{action.script}</p>
                ) : (
                  <p className="text-[12px] text-muted-foreground leading-relaxed">
                    Não há contexto suficiente para gerar uma mensagem personalizada. Complete os dados da empresa ou registre a primeira conversa.
                  </p>
                )}
              </div>
            </Block>
          </div>
        </TabsContent>

        {/* ---------------------------------------------------------- conversa */}
        <TabsContent value="conversation" className="mt-3 space-y-3">
          {conversationLoading ? (
            <div className="h-32 rounded-xl border border-border/60 bg-muted/20 animate-pulse" />
          ) : !conv ? (
            <Block icon={MessageSquare} title="Conversa">
              <Empty
                title="Não encontramos conversas registradas para este contato"
                description="Quando este contato trocar mensagens pelo WhatsApp (Evolution ou Meta Cloud API), a Inteligência analisa intenção, objeções, reciprocidade e tempo de resposta automaticamente."
                action={<Button size="sm" onClick={openChat}>Iniciar conversa</Button>}
              />
            </Block>
          ) : (
            <>
              <Block icon={MessageSquare} title={`Interações · ${conv.sources.join(" · ")}`}>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <Stat label="Mensagens" value={String(conv.total)} hint={`${conv.turns} idas e vindas`} />
                  <Stat label="Do contato" value={String(conv.inbound)} hint={`${conv.reciprocity}% reciprocidade`} />
                  <Stat label="Suas" value={String(conv.outbound)} />
                  <Stat label="Dias com conversa" value={String(conv.activeDays)} />
                  <Stat label="Sua resposta média" value={conv.avgResponseMinutes != null ? `${conv.avgResponseMinutes} min` : "—"} />
                  <Stat label="Resposta do contato" value={conv.leadAvgResponseMinutes != null ? `${conv.leadAvgResponseMinutes} min` : "—"} />
                  <Stat label="Última mensagem" value={conv.lastMessageAt ? formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true, locale: ptBR }) : "—"} />
                  <Stat
                    label="Áudios"
                    value={String(conv.audioCount)}
                    hint={conv.audioCount ? `${conv.transcribedAudioCount} transcrito(s) e analisado(s)` : undefined}
                  />
                </div>
                {conv.waitingReplyHours !== null && (
                  <div className="mt-2.5 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-[12px] text-muted-foreground leading-relaxed">
                      O contato enviou a última mensagem e aguarda resposta há {hoursLabel(conv.waitingReplyHours)}
                      {conv.inboundStreak > 1 ? ` (${conv.inboundStreak} mensagens seguidas sem resposta)` : ""}.
                    </p>
                  </div>
                )}
              </Block>

              <div className="grid gap-3 lg:grid-cols-2">
                <Block icon={Target} title="Intenção detectada na conversa">
                  {conv.intents.length ? (
                    <ul>{conv.intents.map((i) => <EvidenceRow key={i.key} label={i.label} quote={i.quote} at={i.at} source={i.source} />)}</ul>
                  ) : (
                    <Empty title="Nenhum sinal de intenção identificado" description="As mensagens deste contato ainda não contêm pedidos de preço, proposta, pagamento, urgência ou disponibilidade." />
                  )}
                </Block>

                <Block icon={ShieldAlert} title="Objeções">
                  {conv.objections.length ? (
                    <ul>{conv.objections.map((o) => <EvidenceRow key={o.key} positive={false} label={o.label} quote={o.quote} at={o.at} source={o.source} />)}</ul>
                  ) : (
                    <Empty title="Nenhuma objeção registrada" description="Não identificamos objeções de preço, prazo, confiança ou concorrência nas mensagens deste contato." />
                  )}
                </Block>
              </div>

              {signals.length > 0 && (
                <Block icon={Sparkles} title={`Sinais do motor · ${signals.length}`}>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {signals.slice(0, 10).map((s) => {
                      const evidence = (s.meta as any)?.snippet || (s.meta as any)?.text || (s.meta as any)?.content;
                      return (
                        <div key={s.id} className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                          <p className="text-[13px] font-medium text-foreground truncate">{signalLabel(s.signal_type)}</p>
                          {evidence && <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">“{String(evidence).slice(0, 120)}”</p>}
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {format(new Date(s.occurred_at), "dd/MM 'às' HH:mm", { locale: ptBR })}{s.source ? ` · ${s.source}` : ""}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </Block>
              )}

              {conv.leadMessages.length > 0 && (
                <Block icon={MessageSquare} title="Últimas mensagens do contato">
                  <div className="space-y-1.5">
                    {conv.leadMessages.slice(-4).reverse().map((m, i) => (
                      <div key={i} className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                        <p className="text-[13px] text-foreground leading-relaxed">{m.content.slice(0, 240)}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">{format(new Date(m.at), "dd/MM 'às' HH:mm", { locale: ptBR })}</p>
                      </div>
                    ))}
                  </div>
                </Block>
              )}
            </>
          )}
        </TabsContent>

        {/* ----------------------------------------------------------- empresa */}
        <TabsContent value="company" className="mt-3 space-y-3">
          <Block icon={Building2} title="Dados da empresa">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
              <Field label="Empresa" value={lead?.company_name || prospect?.company_name} />
              <Field label="Contato" value={lead?.contact_name || prospect?.contact_name} />
              <Field label="Segmento" value={lead?.category || prospect?.category} />
              <Field label="Telefone" value={lead?.phone || prospect?.phone} icon={Phone} />
              <Field label="E-mail" value={lead?.email || prospect?.email} icon={Mail} />
              <Field label="Site" value={(lead?.website || prospect?.website)?.replace(/^https?:\/\//, "")} icon={Globe} />
              <Field label="Cidade" value={lead?.city || prospect?.city} icon={MapPin} />
              <Field label="Região" value={lead?.region || prospect?.region} />
              <Field label="Endereço" value={prospect?.address} />
              <Field
                label="Avaliação pública"
                value={prospect?.rating != null ? `${prospect.rating}${prospect.review_count ? ` · ${prospect.review_count} avaliações` : ""}` : undefined}
                icon={Star}
              />
              <Field label="Valor estimado" value={lead?.estimated_value ? `R$ ${Number(lead.estimated_value).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}` : undefined} />
              <Field label="Tags" value={lead?.tags?.length ? lead.tags.join(", ") : undefined} />
            </div>
            {!lead?.company_name && !prospect?.company_name && (
              <Empty title="Sem dados de empresa" description="Este contato não possui dados de empresa preenchidos. Complete o cadastro para que a Inteligência avalie fit e qualidade." />
            )}
          </Block>
        </TabsContent>

        {/* -------------------------------------------------------- prospecção */}
        <TabsContent value="prospect" className="mt-3 space-y-3">
          {prospect ? (
            <>
              <Block icon={MapPin} title="Como este contato chegou">
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
                  <Field label="Origem" value={prospect.origin || lead?.origin} />
                  <Field label="Prospectado em" value={prospect.prospected_at ? format(new Date(prospect.prospected_at), "dd/MM/yyyy", { locale: ptBR }) : undefined} />
                  <Field label="Segmento" value={prospect.category} />
                  <Field label="Região" value={[prospect.city, prospect.region].filter(Boolean).join(" · ") || undefined} />
                  <Field label="Google Maps" value={prospect.google_maps_link ? "Ficha encontrada" : undefined} />
                  <Field label="Nível de oportunidade (prospecção)" value={prospect.opportunity_level} />
                  <Field label="Probabilidade de fechamento (prospecção)" value={prospect.closing_probability} />
                </div>
              </Block>

              {prospect.ai_diagnosis ? (
                <Block icon={Sparkles} title="Diagnóstico da prospecção">
                  <p className="text-[13px] text-muted-foreground leading-relaxed">{prospect.ai_diagnosis}</p>
                  {prospect.ai_recommended_action && (
                    <p className="mt-2 text-[13px] text-foreground leading-relaxed border-l-2 border-primary/40 pl-2.5">
                      {prospect.ai_recommended_action}
                    </p>
                  )}
                </Block>
              ) : (
                <Block icon={Sparkles} title="Diagnóstico da prospecção">
                  <Empty title="Sem diagnóstico registrado" description="Este contato não possui diagnóstico gerado na prospecção. Sem ele, o fit é avaliado apenas por segmento e região." />
                </Block>
              )}

              <Block icon={Building2} title="Fit comercial">
                {fit !== null || prospect.category || prospect.city ? (
                  <ul>
                    {fit !== null && <EvidenceRow label={`Fit calculado pelo motor: ${bandM(fit)} (${fit}/100)`} />}
                    {prospect.category && <EvidenceRow label={`Segmento identificado: ${prospect.category}`} source="Prospecção" />}
                    {(prospect.city || prospect.region) && <EvidenceRow label={`Região atendida: ${[prospect.city, prospect.region].filter(Boolean).join(" · ")}`} source="Prospecção" />}
                    {prospect.ai_diagnosis && <EvidenceRow label="Problema identificado no diagnóstico" quote={String(prospect.ai_diagnosis).slice(0, 300)} source="Prospecção" />}
                    {convertedPattern?.niche && prospect.category && convertedPattern.niche === prospect.category && (
                      <EvidenceRow label={`Mesmo segmento de ${convertedPattern.sample_size} clientes já convertidos`} source="Histórico da conta" />
                    )}
                  </ul>
                ) : (
                  <Empty title="Sem dados para avaliar fit" description="Preencha segmento, região e diagnóstico para que a Inteligência avalie a compatibilidade deste contato." />
                )}
              </Block>
            </>
          ) : (
            <Block icon={MapPin} title="Prospecção">
              <Empty title="Sem dados de prospecção" description="Este contato não possui registro de prospecção associado." />
            </Block>
          )}
        </TabsContent>

        {/* --------------------------------------------------------- comercial */}
        <TabsContent value="commercial" className="mt-3 space-y-3">
          <Block icon={DollarSign} title="Histórico comercial">
            {deals.length ? (
              <>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <Stat label="Negociações" value={String(deals.length)} />
                  <Stat label="Ganhas" value={String(wonDeals.length)} />
                  <Stat label="Perdidas" value={String(lostDeals.length)} />
                </div>
                <div className="space-y-1.5">
                  {deals.map((d: any) => (
                    <div key={d.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-foreground truncate">{d.title || "Negociação"}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {d.status || "—"} · {format(new Date(d.closed_at || d.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </div>
                      <span className="text-[13px] font-semibold tabular-nums text-foreground shrink-0">
                        R$ {Number(d.value || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <Empty title="Este contato ainda não possui histórico comercial" description="Quando uma venda ou negociação for registrada para este contato, ela aparece aqui e passa a alimentar os padrões de ganhos e perdas da sua conta." />
            )}
          </Block>

          <div className="grid gap-3 lg:grid-cols-2">
            <Block icon={CheckCircle2} title="Padrão de clientes convertidos">
              {convertedPattern ? (
                <p className="text-[13px] text-muted-foreground leading-relaxed">
                  Sua conta tem {convertedPattern.sample_size} cliente(s) convertido(s) com perfil semelhante
                  {convertedPattern.niche ? ` no segmento ${convertedPattern.niche}` : ""}
                  {convertedPattern.region ? ` em ${convertedPattern.region}` : ""}.
                  {intel?.pattern_match_score ? ` Este contato tem ${intel.pattern_match_score}% de aderência a esse padrão.` : ""}
                  {convertedPattern.avg_days_to_close ? ` Tempo médio até fechar: ${Math.round(convertedPattern.avg_days_to_close)} dias.` : ""}
                </p>
              ) : (
                <Empty title="Dados insuficientes" description="Ainda não há clientes convertidos suficientes na sua conta para identificar um padrão confiável de conversão." />
              )}
            </Block>

            <Block icon={ShieldAlert} title="Padrões de perda">
              {lostPattern ? (
                <p className="text-[13px] text-muted-foreground leading-relaxed">
                  {lostPattern.sample_size} oportunidade(s) perdida(s) apresentaram padrão parecido
                  {lostPattern.niche ? ` no segmento ${lostPattern.niche}` : ""}.
                  {intel?.loss_pattern_match_score ? ` Aderência atual deste contato: ${intel.loss_pattern_match_score}%.` : ""} Não é previsão — é um alerta para agir antes.
                </p>
              ) : (
                <Empty title="Dados insuficientes" description="Ainda não há oportunidades perdidas suficientes registradas para identificar padrões de perda." />
              )}
            </Block>
          </div>
        </TabsContent>

        {/* ---------------------------------------------------------- evolução */}
        <TabsContent value="evolution" className="mt-3 space-y-3">
          <Block icon={TrendingUp} title="Evolução da Oportunidade">
            {chartData.length >= 2 ? (
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 6, right: 8, bottom: 0, left: -22 }}>
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <RTooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                      formatter={(v: any) => [`${v} de 100`, "Oportunidade"]}
                    />
                    <RLine type="monotone" dataKey="valor" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <Empty title="Sem histórico suficiente" description="A curva de evolução aparece quando a Inteligência registrar pelo menos dois momentos diferentes de leitura deste contato." />
            )}
          </Block>

          <Block icon={Clock} title="Eventos que mudaram a leitura">
            {history.length ? (
              <div className="space-y-0.5">
                {history.slice(0, 20).map((h, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 py-1.5 border-b border-border/40 last:border-0">
                    <div className="min-w-0">
                      <p className="text-[13px] text-foreground truncate">{signalLabel(h.event_type || h.category || "Sinal")}</p>
                      <p className="text-[10px] text-muted-foreground">{format(new Date(h.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={cn("text-[11px] font-medium", h.points_applied >= 0 ? "text-primary" : "text-destructive")}>
                        {h.points_applied >= 0 ? "Reforçou" : "Reduziu"}
                      </span>
                      {h.score_after != null && (
                        <p className="text-[10px] text-muted-foreground tabular-nums">{toIntel100(h.score_after)} de 100</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Empty title="Nenhum evento registrado" description="Assim que houver interações ou sinais, cada mudança na leitura deste contato passa a ser registrada aqui." />
            )}
          </Block>

          {intel && (
            <p className="text-[11px] text-muted-foreground px-1">
              Leitura do motor central em {format(new Date(intel.computed_at), "dd/MM 'às' HH:mm", { locale: ptBR })}. Fontes: WhatsApp (Evolution e Meta Cloud API), CRM, prospecção e módulo comercial.
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
