import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  useLeadIntelligenceProfile,
  NEXT_ACTION_LABELS,
  PRIORITY_LABELS,
  STAGE_LABELS,
  BEHAVIOR_LABELS,
  MOMENTUM_LABELS,
} from "@/hooks/useLeadIntelligence";
import { useLeadIntelligenceDetail, type ConversationAnalysis } from "@/hooks/useLeadIntelligenceDetail";
import { useLeadScores } from "@/hooks/useLeadScores";
import { toIntel100, dimensionTo100 } from "@/lib/intelligence";
import type { Lead } from "@/hooks/useCRM";
import {
  Brain, Target, Flame, TrendingUp, TrendingDown, Minus, AlertTriangle,
  Sparkles, Building2, MessageSquare, Lightbulb, History, Users, ShieldAlert,
  Clock, ChevronDown, Search, CheckCircle2, DollarSign,
} from "lucide-react";

interface Props {
  phone?: string | null;
  lead?: Lead | null;
  className?: string;
}

/* ---------------------------------------------------------------- labels */

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

const GROUP_LABELS: Record<string, string> = {
  intent: "Intenção",
  engagement: "Engajamento",
  interaction: "Interação",
  risk: "Risco",
  fit: "Nicho e perfil",
  niche: "Nicho e perfil",
  quality: "Qualidade dos dados",
  decay: "Perda por tempo",
};

const signalLabel = (t: string) =>
  SIGNAL_LABELS[t] || t.replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase());

const levelLabel = (v: number) =>
  v >= 80 ? "Muito alta" : v >= 60 ? "Alta" : v >= 40 ? "Média" : v >= 20 ? "Baixa" : "Muito baixa";
const levelLabelM = (v: number) =>
  v >= 80 ? "Muito alto" : v >= 60 ? "Alto" : v >= 40 ? "Médio" : v >= 20 ? "Baixo" : "Muito baixo";

/* ------------------------------------------------------------- primitives */

function Section({
  icon: Icon, title, subtitle, children, defaultOpen = true,
}: {
  icon: React.ElementType; title: string; subtitle?: string;
  children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
      >
        <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground leading-none">{title}</p>
          {subtitle && <p className="text-[11px] text-muted-foreground mt-1 truncate">{subtitle}</p>}
        </div>
        <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="px-4 pb-4 pt-1">{children}</div>}
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
      <p className="text-sm font-semibold text-foreground mt-0.5 leading-tight">{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{hint}</p>}
    </div>
  );
}

function Bar({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
        <p className="text-sm font-semibold tabular-nums text-foreground">{value}<span className="text-[10px] font-normal text-muted-foreground"> de 100</span></p>
      </div>
      <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full bg-primary transition-[width] duration-700" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
      {hint && <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Line({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm text-foreground/90">
      {ok
        ? <CheckCircle2 className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
        : <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />}
      <span className="leading-relaxed">{children}</span>
    </li>
  );
}

/* -------------------------------------------------- próxima melhor ação */

function buildAction(ctx: {
  opportunity: number;
  intent: number;
  engagement: number;
  conv: ConversationAnalysis | null;
  firstName: string;
  lastLeadMessage?: string;
  hasPriceObjection: boolean;
  channel: string;
}) {
  const { opportunity, intent, conv, firstName, lastLeadMessage, hasPriceObjection, channel } = ctx;
  const waiting = conv?.waitingReplyHours ?? null;
  const name = firstName || "tudo bem";

  if (waiting !== null && waiting >= 0) {
    return {
      title: "Responder agora",
      why: `O contato mandou a última mensagem e está sem resposta há ${waiting < 1 ? "menos de 1 hora" : `${Math.round(waiting)} h`}.`,
      when: waiting > 4 ? "Imediatamente — o contato já esperou demais" : "Nas próximas horas",
      channel,
      steps: [
        `Responda diretamente ao que ele escreveu${lastLeadMessage ? `: “${lastLeadMessage.slice(0, 90)}”` : ""}.`,
        intent >= 50 ? "Ele já demonstrou interesse comercial: leve valores, prazo e próximo passo na mesma mensagem." : "Confirme a necessidade dele antes de falar de preço.",
        "Termine com uma pergunta que exija resposta (dia, horário ou confirmação).",
      ],
      script: lastLeadMessage
        ? `Oi ${name}! Sobre o que você me perguntou, já consigo te responder agora. ${intent >= 50 ? "Te mando os valores e o prazo — prefere por aqui ou numa ligação rápida?" : "Só me confirma uma coisa pra eu te passar certinho: qual é a sua prioridade hoje?"}`
        : `Oi ${name}! Vi sua mensagem, já estou com tudo aqui. Posso te responder por aqui mesmo?`,
      avoid: "Não deixe passar mais um dia: contato esperando resposta é o principal motivo de perda.",
    };
  }

  if (hasPriceObjection) {
    return {
      title: "Tratar a objeção de preço",
      why: "Foi detectada uma objeção ligada a preço na conversa.",
      when: "Nas próximas 24 horas",
      channel,
      steps: [
        "Não baixe o preço de imediato: pergunte com o que ele está comparando.",
        "Traga o retorno em número (o que ele ganha ou economiza).",
        "Ofereça formato alternativo (parcelamento, escopo menor) em vez de desconto.",
      ],
      script: `Oi ${name}, entendo a questão do investimento. Posso te mostrar rapidinho o retorno que isso costuma gerar e uma condição de pagamento que cabe melhor aí?`,
      avoid: "Não dê desconto antes de entender a real objeção.",
    };
  }

  if (opportunity >= 75 || intent >= 70) {
    return {
      title: "Levar para o fechamento",
      why: "Oportunidade e intenção altas com base nos sinais reais da conversa.",
      when: "Hoje",
      channel,
      steps: [
        "Envie a proposta com valor, prazo e forma de pagamento definidos.",
        "Marque data e hora da decisão junto com ele.",
        "Deixe uma condição com validade curta para gerar decisão.",
      ],
      script: `Oi ${name}, preparei a proposta do jeito que conversamos. Consigo te explicar em 5 minutos hoje e já deixamos definido?`,
      avoid: "Não mande só texto e espere: contato quente esfria em poucos dias.",
    };
  }

  if (opportunity >= 45) {
    return {
      title: "Qualificar e avançar",
      why: "Há interação real, mas ainda faltam sinais claros de decisão de compra.",
      when: "Nas próximas 48 horas",
      channel,
      steps: [
        "Confirme necessidade, prazo e quem decide.",
        "Mostre um caso do mesmo segmento com resultado em número.",
        "Combine a data exata do próximo contato.",
      ],
      script: `Oi ${name}! Pelo que conversamos dá pra resolver isso rápido. Tem 10 minutinhos essa semana pra eu te mostrar como ficaria?`,
      avoid: "Evite proposta genérica antes de confirmar o que ele precisa.",
    };
  }

  return {
    title: conv ? "Reaquecer o contato" : "Iniciar a conversa",
    why: conv
      ? "A atividade caiu e os sinais recentes são fracos."
      : "Ainda não há conversa registrada com este contato.",
    when: "Esta semana",
    channel,
    steps: conv
      ? [
          "Retome com uma pergunta objetiva sobre o problema dele, não sobre o produto.",
          "Traga uma prova rápida (caso, número, print) ligada ao que ele falou.",
          "Se não houver resposta, espace os contatos e priorize quem responde.",
        ]
      : [
          "Faça a primeira abordagem citando algo específico da empresa dele.",
          "Pergunte apenas uma coisa na primeira mensagem.",
          "Espere 48h antes do segundo contato.",
        ],
    script: `Oi ${name}! ${conv ? "Passando pra retomar nossa conversa." : "Vi o trabalho da sua empresa e queria te fazer uma pergunta rápida."} Hoje o que mais te atrapalha nisso?`,
    avoid: "Não insista com follow-up vazio do tipo “e aí, pensou?”.",
  };
}

/* ------------------------------------------------------------------ panel */

export function LeadIntelligencePanel({ phone, lead, className }: Props) {
  const { data: intel, isLoading } = useLeadIntelligenceProfile(phone);
  const { getScoreForPhone } = useLeadScores();
  const legacy = phone ? getScoreForPhone(phone) : undefined;
  const { conversation: conv, signals, history, deals, patterns } =
    useLeadIntelligenceDetail(phone, lead?.id);

  if (isLoading) {
    return (
      <div className={cn("rounded-xl border border-border/60 bg-card p-4", className)}>
        <div className="h-4 w-40 rounded bg-muted animate-pulse" />
      </div>
    );
  }

  /* ---- valores centrais (mesma fonte do card, do ranking e da central) ---- */
  const opportunity = intel ? intel.opportunity_score : toIntel100(legacy?.score_total);
  const intent = intel ? dimensionTo100(intel.intent_score) : 0;
  const engagement = intel ? dimensionTo100(intel.engagement_score) : 0;
  const quality = intel ? dimensionTo100(intel.quality_score) : 0;
  const fit = intel ? dimensionTo100(intel.fit_score) : 0;
  const risk = intel ? dimensionTo100(intel.risk_score) : 0;
  const similarity = intel?.pattern_match_score ?? 0;
  const lossSimilarity = intel?.loss_pattern_match_score ?? 0;

  const momentumState = intel?.momentum_state || "";
  const MomentumIcon = momentumState.includes("RISING")
    ? TrendingUp
    : momentumState.includes("DECLINING")
    ? TrendingDown
    : Minus;

  const intentSignals = signals.filter((s) => (s.signal_group || "").toLowerCase() === "intent" || s.signal_type.startsWith("INTENT"));
  const hasPriceObjection = signals.some((s) => s.signal_type.includes("OBJECTION_PRICE"));
  const channel = conv?.sources?.[0] || "WhatsApp";
  const firstName = (lead?.contact_name || "").trim().split(/\s+/)[0] || "";
  const lastLeadMessage = conv?.leadMessages?.[conv.leadMessages.length - 1]?.content;

  const lastTouch = conv?.lastMessageAt || lead?.last_response_at || null;
  const recency = lastTouch
    ? formatDistanceToNow(new Date(lastTouch), { addSuffix: true, locale: ptBR })
    : null;

  const action = buildAction({
    opportunity, intent, engagement, conv, firstName, lastLeadMessage, hasPriceObjection, channel,
  });

  const classification =
    opportunity >= 80 ? "Muito alta" : opportunity >= 60 ? "Alta" : opportunity >= 40 ? "Moderada" : opportunity >= 20 ? "Baixa" : "Muito baixa";

  // Resumo executivo montado apenas com o que existe de real
  const summaryParts: string[] = [];
  if (conv) {
    summaryParts.push(
      `${conv.total} mensagens trocadas (${conv.inbound} do contato) em ${conv.activeDays} dia(s) de conversa`
    );
    if (conv.avgResponseMinutes !== null) summaryParts.push(`resposta média em ${conv.avgResponseMinutes} min`);
  }
  if (intentSignals.length) summaryParts.push(`${intentSignals.length} sinal(is) de intenção comercial`);
  if (conv?.waitingReplyHours != null) summaryParts.push("contato aguardando resposta");
  if (!conv && !signals.length) summaryParts.push("ainda sem conversa registrada para analisar");
  const summary = summaryParts.length
    ? summaryParts.join(" · ").replace(/^./, (c) => c.toUpperCase()) + "."
    : "Sem dados suficientes para um resumo comercial.";

  const positives: string[] = [];
  const attention: string[] = [];
  if (conv && conv.total >= 5) positives.push(`Conversa ativa: ${conv.total} mensagens registradas`);
  if (conv && conv.reciprocity >= 35) positives.push(`Boa reciprocidade: ${conv.reciprocity}% das mensagens são do contato`);
  if (conv?.avgResponseMinutes != null && conv.avgResponseMinutes <= 30) positives.push("Respostas rápidas na conversa");
  if (intentSignals.length) positives.push(`Sinais de interesse comercial: ${intentSignals.slice(0, 3).map((s) => signalLabel(s.signal_type).toLowerCase()).join(", ")}`);
  if (fit >= 60) positives.push("Perfil da empresa compatível com o que você vende");
  if ((lead as any)?.ai_diagnosis) positives.push("Diagnóstico da empresa disponível na prospecção");
  if (conv?.waitingReplyHours != null) attention.push(`Última mensagem do contato sem resposta há ${Math.max(1, Math.round(conv.waitingReplyHours))}h`);
  if (hasPriceObjection) attention.push("Objeção de preço detectada na conversa");
  if (momentumState.includes("DECLINING")) attention.push("Atividade em queda em relação ao período anterior");
  if (!conv) attention.push("Nenhuma conversa de WhatsApp encontrada para este número");
  if (!lead?.email) attention.push("Contato sem e-mail cadastrado");
  (intel?.risk_factors || []).forEach((r) => attention.push(r.label));
  (intel?.factors || []).forEach((f) => { if (f.impact > 0) positives.push(f.label); });

  const won = deals.filter((d: any) => (d.status || "").toLowerCase() !== "cancelado");
  const convertedPattern = patterns.find((p: any) => p.pattern_kind === "CONVERTED" && (p.sample_size || 0) >= 5);
  const lostPattern = patterns.find((p: any) => p.pattern_kind === "LOST" && (p.sample_size || 0) >= 5);

  return (
    <div className={cn("space-y-3", className)}>
      {/* 1. Resumo da inteligência */}
      <div className="rounded-xl border border-border/60 bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Brain className="w-[18px] h-[18px] text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Inteligência Wiize</p>
              <p className="text-sm font-semibold text-foreground truncate">
                {lead?.company_name || intel?.company_name || lead?.contact_name || "Contato"}
                {(lead?.category || intel?.niche) && (
                  <span className="text-muted-foreground font-normal"> · {lead?.category || intel?.niche}</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {intel?.is_hot && (
              <Badge className="bg-primary text-primary-foreground gap-1 rounded-md"><Flame className="w-3 h-3" /> Quente</Badge>
            )}
            {intel && <Badge variant="outline" className="rounded-md">{PRIORITY_LABELS[intel.priority] || intel.priority}</Badge>}
          </div>
        </div>

        <div className="mt-4 flex items-end gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Oportunidade</p>
            <p className="text-3xl font-bold tabular-nums text-foreground leading-none mt-1">
              {opportunity}<span className="text-base font-medium text-muted-foreground"> de 100</span>
            </p>
          </div>
          <Badge variant="outline" className="rounded-md mb-1">{classification}</Badge>
        </div>
        <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-primary transition-[width] duration-700" style={{ width: `${opportunity}%` }} />
        </div>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{summary}</p>
      </div>

      {/* 2. Painel de métricas */}
      <Section icon={Target} title="Análise do lead" subtitle="Dimensões calculadas pelo motor central">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <Bar label="Oportunidade" value={opportunity} />
          {intel && <Bar label="Intenção" value={intent} hint={levelLabel(intent)} />}
          {intel && <Bar label="Engajamento" value={engagement} hint={levelLabelM(engagement)} />}
          {intel && <Bar label="Qualidade" value={quality} hint={levelLabel(quality)} />}
          {intel && <Bar label="Fit comercial" value={fit} hint={levelLabelM(fit)} />}
          {intel && <Bar label="Risco" value={risk} hint={levelLabelM(risk)} />}
          {intel && (
            <Metric
              label="Momentum"
              value={MOMENTUM_LABELS[momentumState] || "Estável"}
              hint={intel.momentum_value !== 0 ? `${intel.momentum_value > 0 ? "+" : ""}${intel.momentum_value} vs. período anterior` : undefined}
            />
          )}
          {intel && <Metric label="Estágio comercial" value={STAGE_LABELS[intel.stage] || intel.stage} />}
          {recency && <Metric label="Recência" value={recency} hint="Última interação registrada" />}
        </div>
        {intel && (
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <MomentumIcon className="w-3.5 h-3.5" />
            <span>Leitura do motor em {format(new Date(intel.computed_at), "dd/MM 'às' HH:mm", { locale: ptBR })}.</span>
          </div>
        )}
        {!intel && (
          <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed">
            As dimensões detalhadas aparecem quando o motor consegue analisar conversa e sinais deste contato.
            Hoje faltam: {(!conv ? "conversa registrada" : "")}{!conv && !signals.length ? " e " : ""}{!signals.length ? "sinais detectados" : ""}.
          </p>
        )}
      </Section>

      {/* 3. Por que a oportunidade está nesse nível */}
      <Section icon={Sparkles} title={`Por que a Oportunidade está em ${opportunity}`} subtitle="Fatores reais encontrados nos dados">
        {positives.length > 0 && (
          <>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">Fatores positivos</p>
            <ul className="space-y-1.5 mb-3">{positives.slice(0, 8).map((p, i) => <Line key={i} ok>{p}</Line>)}</ul>
          </>
        )}
        {attention.length > 0 && (
          <>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">Pontos de atenção</p>
            <ul className="space-y-1.5">{attention.slice(0, 8).map((p, i) => <Line key={i} ok={false}>{p}</Line>)}</ul>
          </>
        )}
        {!positives.length && !attention.length && (
          <p className="text-sm text-muted-foreground">Ainda não há sinais registrados para explicar a leitura.</p>
        )}
        <p className="mt-3 text-[11px] text-muted-foreground leading-relaxed">
          Cada sinal soma ou desconta pontos. Sinais repetidos valem menos a cada repetição e sinais antigos
          perdem peso com o tempo. O total é convertido para a escala de 0 a 100 exibida como Oportunidade.
        </p>
      </Section>

      {/* 4. Análise da conversa */}
      {conv && (
        <Section icon={MessageSquare} title="Análise da conversa" subtitle={conv.sources.join(" · ")}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <Metric label="Mensagens" value={String(conv.total)} />
            <Metric label="Do contato" value={String(conv.inbound)} />
            <Metric label="Suas" value={String(conv.outbound)} />
            <Metric label="Reciprocidade" value={`${conv.reciprocity}%`} hint="Parte da conversa que vem do contato" />
            <Metric label="Resposta média" value={conv.avgResponseMinutes != null ? `${conv.avgResponseMinutes} min` : "—"} hint="Seu tempo de resposta" />
            <Metric label="Dias com conversa" value={String(conv.activeDays)} />
            {conv.inboundStreak > 1 && <Metric label="Mensagens seguidas" value={String(conv.inboundStreak)} hint="Sem resposta sua" />}
            {conv.audioCount > 0 && <Metric label="Áudios" value={String(conv.audioCount)} hint="Transcritos e analisados" />}
            {conv.lastInboundAt && (
              <Metric label="Última do contato" value={formatDistanceToNow(new Date(conv.lastInboundAt), { addSuffix: true, locale: ptBR })} />
            )}
          </div>
          {conv.leadMessages.length > 0 && (
            <div className="mt-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">Últimas mensagens do contato</p>
              <div className="space-y-1.5">
                {conv.leadMessages.slice(-4).reverse().map((m, i) => (
                  <div key={i} className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                    <p className="text-sm text-foreground leading-relaxed">{m.content.slice(0, 220)}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {format(new Date(m.at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>
      )}

      {/* 5. Sinais detectados (evidência) */}
      {signals.length > 0 && (
        <Section icon={Flame} title="Sinais detectados" subtitle={`${signals.length} sinais registrados pelo motor`}>
          <div className="space-y-1.5">
            {signals.slice(0, 12).map((s) => {
              const evidence = (s.meta as any)?.snippet || (s.meta as any)?.text || (s.meta as any)?.content;
              return (
                <div key={s.id} className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground truncate">{signalLabel(s.signal_type)}</span>
                    <Badge variant="outline" className="rounded-md text-[10px] shrink-0">
                      {GROUP_LABELS[(s.signal_group || "").toLowerCase()] || s.signal_group || "Sinal"}
                    </Badge>
                  </div>
                  {evidence && <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">“{String(evidence).slice(0, 180)}”</p>}
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {format(new Date(s.occurred_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                    {s.source ? ` · ${s.source}` : ""}
                    {s.confidence ? ` · confiança ${Math.round(Number(s.confidence) * 100)}%` : ""}
                  </p>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* 6. Comportamento */}
      {intel && intel.behaviors?.length > 0 && (
        <Section icon={Users} title="Comportamento" subtitle="Padrões observados nas interações">
          <div className="flex flex-wrap gap-1.5">
            {intel.behaviors.map((b) => (
              <Badge key={b} variant="secondary" className="rounded-md text-[11px]">{BEHAVIOR_LABELS[b] || b}</Badge>
            ))}
          </div>
        </Section>
      )}

      {/* 7. Empresa e prospecção */}
      {(lead?.company_name || lead?.category || lead?.city || lead?.website || (lead as any)?.ai_diagnosis || lead?.origin) && (
        <Section icon={Building2} title="Empresa e prospecção" subtitle="Dados coletados na origem do contato" defaultOpen={false}>
          <div className="grid grid-cols-2 gap-2">
            {lead?.company_name && <Metric label="Empresa" value={lead.company_name} />}
            {lead?.category && <Metric label="Nicho" value={lead.category} />}
            {(lead?.city || lead?.region) && <Metric label="Região" value={[lead?.city, lead?.region].filter(Boolean).join(" · ")} />}
            {lead?.website && <Metric label="Site" value={String(lead.website).replace(/^https?:\/\//, "")} />}
            {lead?.origin && <Metric label="Origem" value={String(lead.origin)} />}
            {(lead as any)?.rating != null && (
              <Metric label="Avaliação pública" value={`${(lead as any).rating}${(lead as any).review_count ? ` (${(lead as any).review_count} avaliações)` : ""}`} />
            )}
            {(lead as any)?.prospected_at && (
              <Metric label="Prospectado" value={format(new Date((lead as any).prospected_at), "dd/MM/yyyy", { locale: ptBR })} />
            )}
          </div>
          {(lead as any)?.ai_diagnosis && (
            <div className="mt-2.5 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <Search className="w-3.5 h-3.5 text-primary" />
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Diagnóstico da prospecção</p>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{String(lead.ai_diagnosis)}</p>
            </div>
          )}
          {intel?.diagnosis_summary && (
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{intel.diagnosis_summary}</p>
          )}
        </Section>
      )}

      {/* 8. Histórico comercial */}
      {deals.length > 0 && (
        <Section icon={DollarSign} title="Histórico comercial" subtitle={`${deals.length} negociação(ões) registradas`} defaultOpen={false}>
          <div className="space-y-1.5">
            {deals.map((d: any) => (
              <div key={d.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{d.title || "Negociação"}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {d.status || "—"} · {format(new Date(d.closed_at || d.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums text-foreground shrink-0">
                  R$ {Number(d.value || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                </span>
              </div>
            ))}
          </div>
          {won.length > 0 && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Resultados registrados aqui alimentam os padrões de clientes ganhos e perdidos da sua conta.
            </p>
          )}
        </Section>
      )}

      {/* 9. Semelhança com clientes convertidos / perdidos */}
      {(convertedPattern || lostPattern) && (
        <Section icon={Users} title="Comparação com o histórico da sua conta" subtitle="Padrões calculados com resultados reais" defaultOpen={false}>
          {convertedPattern && (
            <div className="rounded-lg border border-primary/25 bg-primary/5 px-3 py-2.5">
              <p className="text-sm font-semibold text-foreground">Semelhança com clientes convertidos</p>
              <p className="text-sm text-muted-foreground leading-relaxed mt-1">
                {(convertedPattern as any).sample_size} clientes convertidos com perfil
                {(convertedPattern as any).niche ? ` no nicho ${(convertedPattern as any).niche}` : ""}
                {(convertedPattern as any).region ? ` em ${(convertedPattern as any).region}` : ""}.
                {similarity > 0 && ` Este contato tem ${similarity}% de aderência a esse padrão.`}
                {(convertedPattern as any).avg_days_to_close ? ` Tempo médio até fechar: ${Math.round((convertedPattern as any).avg_days_to_close)} dias.` : ""}
              </p>
            </div>
          )}
          {lostPattern && (
            <div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2.5">
              <div className="flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                <p className="text-sm font-semibold text-foreground">Sinais semelhantes a oportunidades perdidas</p>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mt-1">
                {(lostPattern as any).sample_size} oportunidades perdidas apresentaram padrão parecido.
                {lossSimilarity > 0 && ` Aderência atual: ${lossSimilarity}%.`} Não é previsão: é um alerta para agir antes.
              </p>
            </div>
          )}
        </Section>
      )}

      {/* 10. Histórico da inteligência */}
      {history.length > 0 && (
        <Section icon={History} title="Histórico da Inteligência" subtitle="Como a leitura evoluiu" defaultOpen={false}>
          <div className="space-y-1">
            {history.slice(0, 15).map((h, i) => (
              <div key={i} className="flex items-center justify-between gap-3 py-1.5 border-b border-border/40 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm text-foreground truncate">
                    {signalLabel(h.event_type || h.category || "Sinal")}
                  </p>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {format(new Date(h.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className={cn("text-sm font-semibold tabular-nums", h.points_applied >= 0 ? "text-primary" : "text-destructive")}>
                    {h.points_applied > 0 ? "+" : ""}{Math.round(h.points_applied / 10)}
                  </span>
                  {h.score_after != null && (
                    <p className="text-[10px] text-muted-foreground tabular-nums">{toIntel100(h.score_after)} de 100</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* 11. Próxima melhor ação */}
      <div className="rounded-xl border border-primary/25 bg-card overflow-hidden">
        <div className="flex items-center gap-2 bg-primary/10 border-b border-primary/20 px-4 py-3">
          <div className="w-7 h-7 rounded-md bg-primary/15 flex items-center justify-center shrink-0">
            <Lightbulb className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-primary/80 font-medium leading-none">Próxima melhor ação</p>
            <p className="text-sm font-semibold text-foreground mt-1 truncate">
              {intel ? NEXT_ACTION_LABELS[intel.next_best_action] || action.title : action.title}
            </p>
          </div>
        </div>
        <div className="p-4 space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">{action.why}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Metric label="Quando agir" value={action.when} />
            <Metric label="Melhor canal" value={action.channel} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Passo a passo</p>
            <ol className="space-y-2">
              {action.steps.map((l, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/90">
                  <span className="mt-0.5 w-5 h-5 rounded-md bg-primary/10 text-primary text-[11px] font-semibold flex items-center justify-center shrink-0 tabular-nums">{i + 1}</span>
                  <span className="leading-relaxed">{l}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Mensagem sugerida</p>
            <p className="text-sm text-foreground leading-relaxed border-l-2 border-primary/40 pl-3 italic">{action.script}</p>
          </div>
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2.5 flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400 font-medium">O que evitar</p>
              <p className="text-sm text-muted-foreground leading-relaxed mt-0.5">{action.avoid}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
