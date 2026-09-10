import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LineChart, Line as RLine, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import {
  useLeadIntelligenceProfile,
  PRIORITY_LABELS,
  STAGE_LABELS,
  MOMENTUM_LABELS,
} from "@/hooks/useLeadIntelligence";
import {
  useLeadIntelligenceDetail,
  type ConversationAnalysis,
  type ProspectData,
} from "@/hooks/useLeadIntelligenceDetail";
import type { Lead } from "@/hooks/useCRM";
import {
  Brain, Target, Zap, TrendingUp, TrendingDown, Minus, AlertTriangle,
  MessageSquare, MapPin, DollarSign, CheckCircle2, Clock, Star, Globe,
  ShieldAlert, Sparkles, Copy, Building2, ArrowRight, Compass, ListChecks, HelpCircle, Ban, Flag,
} from "lucide-react";

interface Props {
  phone?: string | null;
  lead?: Lead | null;
  className?: string;
}

/* ------------------------------------------------------------------ helpers */

const SIGNAL_LABELS: Record<string, string> = {
  INTENT_PRICE: "Perguntou preço",
  INTENT_BUY: "Falou em comprar",
  INTENT_BUY_NOW: "Disse que quer comprar",
  INTENT_PAYMENT: "Falou sobre pagamento",
  INTENT_PROPOSAL: "Pediu proposta",
  INTENT_URGENCY: "Demonstrou urgência",
  INTENT_URGENT: "Demonstrou urgência",
  INTENT_AVAILABILITY: "Perguntou disponibilidade",
  INTENT_DEMO: "Pediu demonstração",
  INTENT_DECISION: "Falou sobre decisão",
  INTENT_CONTRACT: "Falou sobre contrato",
  OBJECTION: "Registrou objeção",
  OBJECTION_PRICE: "Objeção de preço",
  OBJECTION_TIME: "Objeção de tempo",
  PROBLEM_DETECTED: "Reconheceu um problema",
  NEED_DETECTED: "Declarou uma necessidade",
  NEGATIVE_INTENT: "Sinal negativo",
  AUDIO_RECEIVED: "Áudio recebido",
  DIAGNOSIS_GAP: "Diagnóstico indica necessidade",
};
const signalLabel = (t: string) =>
  SIGNAL_LABELS[t] || t.replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase());

const bandF = (v: number) => (v >= 80 ? "Muito alta" : v >= 60 ? "Alta" : v >= 40 ? "Média" : v >= 20 ? "Baixa" : "Muito baixa");
const bandM = (v: number) => (v >= 80 ? "Muito alto" : v >= 60 ? "Alto" : v >= 40 ? "Médio" : v >= 20 ? "Baixo" : "Muito baixo");
const hoursLabel = (h: number) => (h < 1 ? "menos de 1 hora" : h < 48 ? `${Math.round(h)} h` : `${Math.round(h / 24)} dias`);
const ago = (d?: string | null) =>
  d ? formatDistanceToNow(new Date(d), { addSuffix: true, locale: ptBR }) : null;

type AnalysisState = "NO_DATA" | "PARTIAL" | "COMPLETE";

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

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium truncate">{label}</p>
      <p className="text-sm font-semibold text-foreground mt-0.5 tabular-nums leading-tight">{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{hint}</p>}
    </div>
  );
}

function Empty({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border/70 bg-muted/10 px-4 py-5 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed max-w-md mx-auto">{description}</p>
    </div>
  );
}

interface Dim {
  key: string;
  label: string;
  icon: React.ElementType;
  value: number | null;
  status: string;
  basis: string[];
  tone?: "primary" | "warn";
  partial?: boolean;
  /** Explicacao curta exibida no tooltip "?" do card. */
  hint: string;
}

function DimensionCard({ dim }: { dim: Dim }) {
  const [open, setOpen] = useState(false);
  const empty = dim.value === null;
  const accent = dim.tone === "warn" ? "text-amber-500" : "text-primary";
  return (
    <div className="rounded-lg border border-border/60 bg-card px-3 py-2.5 transition-colors hover:border-border">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "w-5 h-5 rounded-md flex items-center justify-center shrink-0",
            dim.tone === "warn" ? "bg-amber-500/12" : "bg-primary/12",
          )}
        >
          <dim.icon className={cn("w-3 h-3", accent)} />
        </span>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold truncate flex-1">{dim.label}</p>
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={`O que é ${dim.label}`}
                className="w-4 h-4 rounded-full border border-border/70 text-muted-foreground text-[9px] font-semibold flex items-center justify-center shrink-0 hover:text-foreground hover:border-border"
              >
                ?
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[240px] text-[11.5px] leading-relaxed">
              {dim.hint}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        {!empty && (
          <span className={cn("text-[11px] font-medium shrink-0", dim.tone === "warn" ? "text-amber-600" : "text-muted-foreground")}>
            {dim.status}
          </span>
        )}
      </div>

      {empty ? (
        <>
          <p className="text-[13px] font-semibold text-muted-foreground mt-2">{dim.status}</p>
          <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
            <div className={cn("h-full w-full rounded-full", dim.tone === "warn" ? "bg-amber-500/15" : "bg-primary/15")} />
          </div>
        </>
      ) : (
        <>
          <div className="mt-2 flex items-end gap-2">
            <p className="text-[19px] font-semibold text-foreground leading-none tabular-nums">
              {dim.value}
              <span className="text-[10px] font-normal text-muted-foreground"> de 100</span>
            </p>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-[width] duration-700", dim.tone === "warn" ? "bg-amber-500" : "bg-primary")}
              style={{ width: `${Math.max(2, Math.min(100, dim.value))}%` }}
            />
          </div>
          {dim.partial && <p className="mt-1.5 text-[10px] text-muted-foreground">Análise parcial</p>}
          {dim.basis.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="mt-2 inline-flex items-center gap-1 text-[10.5px] font-medium text-primary hover:underline"
              >
                {open ? "Ocultar base" : "Base da análise"}
                <ArrowRight className={cn("w-3 h-3 transition-transform", open && "rotate-90")} />
              </button>
              {open && (
                <ul className="mt-1.5 space-y-1 border-t border-border/50 pt-1.5">
                  {dim.basis.map((b, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[11px] text-muted-foreground leading-snug">
                      <span className="w-1 h-1 rounded-full bg-primary/60 mt-1.5 shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}


function StateCard({ label, icon: Icon, value, caption }: { label: string; icon: React.ElementType; value: string; caption?: string }) {
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

function EvidenceRow({
  label, quote, at, source, positive = true,
}: { label: string; quote?: string; at?: string; source?: string; positive?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="border-b border-border/40 last:border-0">
      <button
        type="button"
        disabled={!quote}
        onClick={() => setOpen((o) => !o)}
        className={cn("w-full flex items-start gap-2 py-1.5 text-left", quote && "hover:opacity-80 cursor-pointer")}
      >
        {positive
          ? <CheckCircle2 className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
          : <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />}
        <span className="text-[13px] text-foreground/90 leading-snug flex-1 min-w-0">{label}</span>
        {quote && <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">{open ? "ocultar" : "evidência"}</span>}
      </button>
      {open && quote && (
        <div className="ml-5 mb-2 rounded-md border-l-2 border-primary/40 bg-muted/30 px-2.5 py-1.5">
          <p className="text-[12px] text-foreground leading-relaxed">“{quote}”</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            {[source, at ? ago(at) : null].filter(Boolean).join(" · ")}
          </p>
        </div>
      )}
    </li>
  );
}

/* ------------------------------------------------------- próxima melhor ação */

interface Playbook {
  code: string;
  title: string;
  priority: string;
  channel: string;
  when: string;
  why: string;
  objective: string;
  steps: string[];
  question: string;
  avoid: string;
  expected: string;
  message: string | null;
  messageOrigin: string | null;
}

function firstName(v?: string | null) {
  const n = (v || "").trim().split(/\s+/)[0];
  return n && n.length > 1 ? n : null;
}

function buildMessage(prospect: ProspectData | null, lead: Lead | null, conv: ConversationAnalysis | null): { text: string | null; origin: string | null } {
  const name = firstName(prospect?.contact_name || (lead as any)?.name || (lead as any)?.contact_name);
  const company = prospect?.company_name || (lead as any)?.company_name || null;
  const niche = prospect?.category || null;
  const city = prospect?.city || null;

  // Sem conversa: usa a mensagem já preparada pela prospecção quando existir.
  if (!conv || conv.total === 0) {
    if (prospect?.ai_approach_message) return { text: prospect.ai_approach_message, origin: "Mensagem gerada na prospecção" };
    if (!company && !name) return { text: null, origin: null };
    const parts: string[] = [];
    parts.push(`Oi${name ? `, ${name}` : ""}! Tudo bem?`);
    if (company) {
      parts.push(
        `Vi a ${company}${niche ? ` (${niche})` : ""}${city ? ` em ${city}` : ""} e analisei rapidamente a presença comercial de vocês.`
      );
    }
    if (prospect?.rating != null && prospect?.review_count != null) {
      parts.push(`Vocês estão com ${prospect.rating} de nota e ${prospect.review_count} avaliações no Google.`);
    }
    if (!prospect?.website) parts.push("Não encontrei um site ativo, o que costuma custar contatos que chegam pela busca.");
    parts.push("Posso te mostrar em poucos minutos como empresas desse perfil estão captando mais clientes?");
    return { text: parts.join(" "), origin: "Gerada com os dados reais da prospecção" };
  }

  // Com conversa: só monta retomada quando há contexto real do que o lead falou.
  const lastIntent = conv.intents[0];
  const lastObjection = conv.objections[0];
  if (lastObjection) {
    return {
      text: `Oi${name ? `, ${name}` : ""}! Sobre o ponto que você levantou (${lastObjection.label.toLowerCase()}), separei uma alternativa que costuma resolver isso. Posso te explicar em 2 minutos?`,
      origin: "Baseada na objeção registrada na conversa",
    };
  }
  if (lastIntent) {
    return {
      text: `Oi${name ? `, ${name}` : ""}! Voltando ao ponto do nosso contato (${lastIntent.label.toLowerCase()}), consigo te passar tudo hoje. Prefere que eu envie por aqui ou marcamos uma conversa rápida?`,
      origin: "Baseada no último sinal identificado na conversa",
    };
  }
  return { text: null, origin: null };
}

function buildPlaybook(
  state: AnalysisState,
  profile: any,
  conv: ConversationAnalysis | null,
  prospect: ProspectData | null,
  lead: Lead | null,
  signalNames: string[] = [],
): Playbook {
  const msg = buildMessage(prospect, lead, conv);
  const priority = profile?.priority ? PRIORITY_LABELS[profile.priority] || profile.priority : "Média";
  const silenceH = conv?.silenceHours ?? null;
  const waiting = conv?.waitingReplyHours ?? null;
  const hasObjection = !!conv?.objections.length;
  const intents = conv?.intents || [];
  const has = (k: string) => intents.some((i) => i.key === k);

  const base = {
    priority,
    channel: "WhatsApp",
    avoid: "Não repetir mensagens genéricas nem cobrar resposta de forma agressiva.",
    message: msg.text,
    messageOrigin: msg.origin,
  };

  if (state === "NO_DATA") {
    return {
      ...base,
      code: "FIRST_CONTACT",
      title: "Iniciar o primeiro contato",
      priority: "Média",
      when: "Assim que possível, em horário comercial",
      why: "Não existe nenhuma conversa nem sinal comercial registrado para este contato. Não há base para qualquer outra recomendação.",
      objective: "Abrir a conversa e gerar a primeira resposta para que a Inteligência passe a ter dados reais.",
      steps: [
        "Enviar a primeira mensagem citando apenas informações que você realmente conhece da empresa.",
        "Fazer uma única pergunta simples que gere resposta.",
        "Aguardar até 48 horas antes de qualquer novo contato.",
      ],
      question: "Vocês estão buscando atrair mais clientes agora ou isso é algo para os próximos meses?",
      avoid: "Não afirmar que já conversaram antes. Nenhuma interação foi registrada.",
      expected: "Primeira resposta do contato, que libera o cálculo das dimensões.",
    };
  }

  // Sem nenhuma mensagem trocada: nunca afirmar que existe conversa, mesmo com sinais do motor.
  if (!conv || conv.total === 0) {
    const empresa = prospect?.company_name || lead?.company_name || null;
    const nicho = prospect?.category || lead?.category || null;
    const cidade = prospect?.city || lead?.city || null;
    const contexto = [
      empresa ? `${empresa}${nicho ? `, do segmento ${nicho.toLowerCase()}` : ""}${cidade ? `, em ${cidade}` : ""}` : null,
      prospect?.rating != null ? `nota ${prospect.rating} no Google com ${prospect.review_count || 0} avaliações` : null,
      prospect && !prospect.website ? "sem site ativo encontrado" : null,
      signalNames.length ? `sinais já registrados: ${signalNames.slice(0, 3).join(", ").toLowerCase()}` : null,
    ].filter(Boolean) as string[];

    return {
      ...base,
      code: "FIRST_CONTACT",
      title: "Iniciar o primeiro contato",
      priority: profile?.priority ? PRIORITY_LABELS[profile.priority] || priority : "Média",
      when: "Hoje, em horário comercial",
      why: signalNames.length
        ? `Nenhuma mensagem foi trocada com este contato. O que existe são sinais do diagnóstico e da prospecção (${signalNames.slice(0, 2).join(", ").toLowerCase()}), que indicam necessidade, mas não interação.`
        : "Nenhuma mensagem foi trocada com este contato nos canais conectados. A pontuação atual vem apenas do perfil da empresa.",
      objective: empresa
        ? `Abrir a conversa com a ${empresa} usando um gancho específico do negócio dela e conseguir a primeira resposta.`
        : "Abrir a conversa e conseguir a primeira resposta, que é o que libera a análise real.",
      steps: [
        contexto.length
          ? `Citar um dado concreto que você já tem: ${contexto[0]}.`
          : "Apresentar-se em uma frase e dizer por que está falando com esta empresa.",
        prospect && !prospect.website
          ? "Mostrar o impacto prático da ausência de site ou presença digital fraca em captação de clientes."
          : "Apontar um ganho concreto e mensurável para o negócio dele.",
        "Fazer uma única pergunta fechada, fácil de responder.",
        "Aguardar 48 horas antes de qualquer nova tentativa.",
      ],
      question: nicho
        ? `Vocês estão querendo atrair mais clientes de ${nicho.toLowerCase()} agora ou isso fica para os próximos meses?`
        : "Vocês estão buscando atrair mais clientes agora ou isso é algo para os próximos meses?",
      avoid: "Não dizer que já conversaram, não citar retomada e não mandar mensagem genérica. Nenhuma mensagem foi trocada até aqui.",
      expected: "Primeira resposta do contato, que libera engajamento, intenção e momentum reais.",
    };
  }



  if (waiting != null && waiting >= 0.25) {
    return {
      ...base,
      code: "RESPOND_NOW",
      title: "Responder agora",
      priority: "Alta",
      when: "Imediatamente",
      why: `O contato enviou a última mensagem e está sem resposta há ${hoursLabel(waiting)}.`,
      objective: "Retomar o controle da conversa antes que o interesse caia.",
      steps: [
        "Ler a última mensagem do contato.",
        "Responder diretamente ao que foi perguntado, sem rodeios.",
        "Encerrar com uma pergunta que avance a etapa.",
      ],
      question: "Consigo te enviar isso ainda hoje. Faz sentido para você?",
      expected: "Resposta rápida e retomada do ritmo da conversa.",
    };
  }

  if (hasObjection) {
    const obj = conv!.objections[0];
    return {
      ...base,
      code: "HANDLE_OBJECTION",
      title: "Tratar a objeção",
      when: "Nas próximas horas",
      why: `O contato registrou uma objeção: ${obj.label.toLowerCase()}.`,
      objective: "Remover o bloqueio antes de avançar para proposta ou fechamento.",
      steps: [
        "Reconhecer a objeção sem discutir.",
        "Trazer um caso ou dado que responda especificamente a ela.",
        "Oferecer uma alternativa (formato, escopo ou condição).",
        "Confirmar se o ponto foi resolvido.",
      ],
      question: "Se esse ponto estivesse resolvido, teria mais alguma coisa te impedindo de avançar?",
      expected: "Objeção neutralizada e caminho livre para a proposta.",
    };
  }

  if (has("PAYMENT") || profile?.stage === "CLOSING" || profile?.stage === "READY_TO_BUY") {
    return {
      ...base,
      code: "REQUEST_PAYMENT",
      title: "Conduzir para o fechamento",
      priority: "Alta",
      when: "Agora",
      why: "O contato já falou sobre pagamento ou decisão, indicando etapa final.",
      objective: "Transformar o interesse declarado em contratação.",
      steps: [
        "Recapitular em uma frase o que foi combinado.",
        "Enviar o link ou os dados de pagamento.",
        "Definir uma data de início.",
      ],
      question: "Prefere começar por PIX ou cartão?",
      expected: "Pagamento realizado ou data de início confirmada.",
    };
  }

  if (has("PROPOSAL")) {
    return {
      ...base,
      code: "SEND_PROPOSAL",
      title: "Enviar a proposta",
      priority: "Alta",
      when: "Hoje",
      why: "O contato pediu uma proposta ou material.",
      objective: "Entregar a proposta ainda com o interesse quente.",
      steps: [
        "Montar a proposta com o escopo já conversado.",
        "Enviar com um resumo curto no WhatsApp.",
        "Combinar quando vocês retomam.",
      ],
      question: "Te envio a proposta agora. Podemos conversar sobre ela amanhã?",
      expected: "Proposta enviada e retorno agendado.",
    };
  }

  if (has("PRICE")) {
    return {
      ...base,
      code: "QUALIFY",
      title: "Qualificar e avançar para proposta",
      priority: "Alta",
      when: "Nas próximas horas",
      why: "O contato perguntou sobre preço, mas ainda faltam prazo, decisão e escopo.",
      objective: "Entender a necessidade real antes de apresentar valores.",
      steps: [
        "Confirmar a necessidade principal.",
        "Identificar o prazo de decisão.",
        "Identificar quem decide junto.",
        "Confirmar a faixa de investimento.",
        "Conduzir para proposta ou demonstração.",
      ],
      question: "Você está querendo resolver isso ainda este mês ou está avaliando opções?",
      expected: "Necessidade, prazo e orçamento identificados.",
    };
  }

  if (silenceH != null && silenceH >= 24 * 7) {
    return {
      ...base,
      code: "REACTIVATE",
      title: "Reativar o contato",
      when: "Hoje",
      why: `A conversa está parada há ${hoursLabel(silenceH)}.`,
      objective: "Reabrir a conversa com um motivo novo, sem cobrança.",
      steps: [
        "Trazer uma novidade concreta (condição, caso, disponibilidade).",
        "Mensagem curta, com uma única pergunta.",
        "Se não houver resposta, encerrar a cadência por agora.",
      ],
      question: "Faz sentido retomarmos isso agora ou prefere que eu volte mais para frente?",
      expected: "Retomada da conversa ou definição clara de que não é o momento.",
    };
  }

  if (silenceH != null && silenceH >= 48) {
    return {
      ...base,
      code: "FOLLOW_UP",
      title: "Fazer follow-up contextualizado",
      when: "Hoje",
      why: `Sem interação há ${hoursLabel(silenceH)} após uma conversa já iniciada.`,
      objective: "Retomar do ponto exato onde a conversa parou.",
      steps: [
        "Relembrar em uma frase o último ponto tratado.",
        "Trazer uma informação nova que ajude a decidir.",
        "Fazer uma pergunta objetiva.",
      ],
      question: "Ficou alguma dúvida do que conversamos?",
      expected: "Resposta do contato e retomada da negociação.",
    };
  }

  return {
    ...base,
    code: "QUALIFY",
    title: "Qualificar o contato",
    when: "Nas próximas horas",
    why: "A conversa está ativa, mas ainda faltam sinais de necessidade, prazo e decisão.",
    objective: "Descobrir se existe intenção real de compra e avançar a qualificação.",
    steps: [
      "Confirmar a necessidade principal.",
      "Identificar o prazo de decisão.",
      "Identificar quem participa da decisão.",
      "Confirmar a faixa de investimento.",
      "Conduzir para proposta ou demonstração quando houver fit.",
    ],
    question: "Você está buscando resolver isso ainda este mês ou está apenas avaliando as opções?",
    expected: "Qualificação concluída com prazo e orçamento identificados.",
  };
}

/* -------------------------------------------------------------------- panel */

export function LeadIntelligencePanel({ phone, lead, className }: Props) {
  const { data: profile, isLoading: profileLoading } = useLeadIntelligenceProfile(phone);
  const detail = useLeadIntelligenceDetail(phone, (lead as any)?.id || null);
  const { conversation: conv, signals, history, deals, prospect, patterns } = detail;

  const engineFeatures = ((profile as any)?.features || {}) as Record<string, any>;
  const engineSignals = Number(engineFeatures.signals_count || 0);
  const engineMessages = Number(engineFeatures.messages_count || 0);

  const state: AnalysisState = useMemo(() => {
    const msgs = Math.max(conv?.total || 0, engineMessages);
    const sigs = Math.max(signals.length, engineSignals);
    // O estado gravado pelo motor manda; o frontend so complementa quando ele nao existe.
    const stored = engineFeatures.analysis_state as AnalysisState | undefined;
    if (stored && msgs === 0 && sigs === 0) return stored;
    if (msgs === 0 && sigs === 0) return "NO_DATA";
    if (msgs < 4 || sigs < 2) return "PARTIAL";
    return "COMPLETE";
  }, [conv, signals.length, engineMessages, engineSignals, engineFeatures.analysis_state]);

  const opportunity = profile ? Math.round(Number(profile.opportunity_score || 0)) : null;
  const hasConv = !!conv && conv.total > 0;
  // O motor legado (revenue) pode ter engajamento sem mensagens espelhadas no chat.
  const hasEngagementData = hasConv || (history.length > 0 && Number(profile?.engagement_score || 0) > 0);

  // "Não analisado" != "baixa oportunidade": sem perfil ou sem evidência, o número é 0 e neutro.
  const notAnalyzed = !profile || state === "NO_DATA" || opportunity === null;
  const analyzedMessages = Math.max(conv?.total || 0, engineMessages);
  const analyzedSignals = Math.max(signals.length, engineSignals);
  const confidence = Math.max(
    0,
    Math.min(100, Number(engineFeatures.analysis_confidence || 0) || analyzedMessages * 6 + analyzedSignals * 10 + (prospect ? 10 : 0)),
  );

  // Etapa comercial: com conversa vem do motor; sem conversa vem do CRM/prospecção.
  const stageLabel = useMemo(() => {
    if (hasConv && profile?.stage) return STAGE_LABELS[profile.stage] || profile.stage;
    if ((lead as any)?.archived_at) return "Arquivado";
    const st = (lead as any)?.status || (lead as any)?.stage_name || null;
    if (st) return String(st);
    if (deals.some((d: any) => ["ganho", "won"].includes(String(d.status || "").toLowerCase()))) return "Fechado";
    if (deals.length) return "Negociação";
    if (prospect) return "Prospecção";
    return "Novo";
  }, [hasConv, profile, lead, deals, prospect]);



  const dims: Dim[] = useMemo(() => {
    const d: Dim[] = [];
    const partial = state === "PARTIAL";

    d.push({
      key: "intent",
      label: "Intenção",
      icon: Target,
      value: profile && (hasConv || signals.length > 0) ? Math.round(Number(profile.intent_score || 0)) : null,
      status: profile && (hasConv || signals.length > 0) ? bandF(Number(profile.intent_score || 0)) : "Sem sinais de intenção",
      partial,
      basis: [
        ...(conv?.intents || []).map((i) => i.label),
        ...signals.slice(0, 4).map((s) => signalLabel(s.signal_type)),
      ].slice(0, 6),
    });

    d.push({
      key: "engagement",
      label: "Engajamento",
      icon: Zap,
      value: profile && hasEngagementData ? Math.round(Number(profile.engagement_score || 0)) : null,
      status: hasEngagementData ? bandM(Number(profile?.engagement_score || 0)) : "Sem interação registrada",
      partial,
      basis: hasConv
        ? [
            `${conv!.total} mensagens trocadas`,
            `${conv!.inbound} respostas do contato`,
            conv!.lastMessageAt ? `última interação ${ago(conv!.lastMessageAt)}` : "",
            `${conv!.activeDays} dia(s) com conversa`,
          ].filter(Boolean)
        : hasEngagementData
        ? [`${history.length} evento(s) de pontuação registrados pelo motor`, "sem mensagens espelhadas no chat deste número"]
        : [],

    });

    const momentumKnown = history.length > 1 && hasConv;
    d.push({
      key: "momentum",
      label: "Momentum",
      icon: profile?.momentum_state?.includes("RISING") ? TrendingUp : profile?.momentum_state?.includes("DECLINING") ? TrendingDown : Minus,
      value: null,
      status: momentumKnown ? MOMENTUM_LABELS[profile!.momentum_state] || "Estável" : "Sem histórico suficiente",
      basis: [],
    });

    d.push({
      key: "risk",
      label: "Risco",
      icon: ShieldAlert,
      tone: "warn",
      value: profile && hasConv ? Math.round(Number(profile.risk_score || 0)) : null,
      status: hasConv ? bandM(Number(profile?.risk_score || 0)) : "Sem dados para avaliar risco",
      partial,
      basis: ((profile?.risk_factors as any[]) || []).map((r: any) => r.label),
    });

    const fitKnown = !!prospect || !!profile?.niche || !!profile?.city;
    d.push({
      key: "fit",
      label: "Fit",
      icon: Building2,
      value: profile && fitKnown ? Math.round(Number(profile.fit_score || 0)) : null,
      status: fitKnown ? bandF(Number(profile?.fit_score || 0)) : "Sem dados da empresa",
      basis: [
        prospect?.category ? `segmento: ${prospect.category}` : "",
        prospect?.city ? `cidade: ${prospect.city}` : "",
        prospect?.rating != null ? `nota ${prospect.rating} no Google` : "",
        prospect?.website ? "possui site" : prospect ? "sem site identificado" : "",
      ].filter(Boolean),
    });

    d.push({
      key: "quality",
      label: "Qualidade",
      icon: Sparkles,
      value: profile && hasConv ? Math.round(Number(profile.quality_score || 0)) : null,
      status: hasConv ? bandF(Number(profile?.quality_score || 0)) : "Sem conversa para avaliar",
      partial,
      basis: hasConv
        ? [
            `reciprocidade de ${conv!.reciprocity}%`,
            `${conv!.turns} idas e vindas`,
            conv!.leadAvgResponseMinutes != null ? `contato responde em ~${conv!.leadAvgResponseMinutes} min` : "",
          ].filter(Boolean)
        : [],
    });

    d.push({
      key: "recency",
      label: "Recência",
      icon: Clock,
      value: null,
      status: hasConv && conv!.lastMessageAt ? `Última interação ${ago(conv!.lastMessageAt)}` : "Sem interação",
      basis: [],
    });

    d.push({
      key: "stage",
      label: "Etapa",
      icon: ArrowRight,
      value: null,
      status: stageLabel,
      basis: [],
    });

    return d;
  }, [profile, conv, signals, history, prospect, hasConv, hasEngagementData, state, stageLabel]);

  const playbook = useMemo(
    () => buildPlaybook(state, profile, conv, prospect, lead || null, signals.map((s) => signalLabel(s.signal_type))),
    [state, profile, conv, prospect, lead, signals]
  );

  const positives = ((profile?.factors as any[]) || []).filter((f) => f?.label);
  const negatives = ((profile?.risk_factors as any[]) || []).filter((f) => f?.label);

  const chartData = useMemo(
    () =>
      [...history]
        .reverse()
        .filter((h) => h.score_after != null)
        .map((h) => ({
          at: format(new Date(h.created_at), "dd/MM HH:mm"),
          value: Math.max(0, Math.min(100, Math.round(Number(h.score_after) / 10))),
        })),
    [history]
  );

  if (profileLoading || detail.isLoading) {
    return (
      <div className={cn("space-y-4 animate-fade-in", className)}>
        <section className="rounded-xl border border-border/60 bg-card overflow-hidden">
          <header className="flex items-center gap-2 px-4 py-2.5 border-b border-border/50">
            <Brain className="w-4 h-4 text-primary animate-pulse" />
            <h3 className="text-[12px] font-semibold uppercase tracking-wider text-foreground">Inteligência Wiize</h3>
            <span className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="w-3 h-3 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
              Analisando o contato
            </span>
          </header>
          <div className="px-4 py-4 space-y-3">
            <div className="h-3 w-24 rounded bg-muted/70 overflow-hidden relative">
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-foreground/10 to-transparent animate-shimmer" />
            </div>
            <div className="h-9 w-32 rounded-lg bg-muted/60" />
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div className="h-full w-1/3 rounded-full bg-primary/50 animate-pulse" />
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-14 rounded-lg border border-border/50 bg-muted/25 animate-pulse"
                  style={{ animationDelay: `${i * 90}ms` }}
                />
              ))}
            </div>
          </div>
        </section>
        <p className="text-[11px] text-muted-foreground text-center">
          Cruzando conversas, sinais, prospecção e histórico comercial deste contato.
        </p>
      </div>
    );
  }


  return (
    <div className={cn("space-y-4", className)}>
      {/* ---------------------------------------------------------- header */}
      <section className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm">
        <header className="flex items-center gap-2 px-4 py-2.5 bg-muted/25 border-b border-border/50">
          <span className="w-6 h-6 rounded-lg bg-primary/12 flex items-center justify-center shrink-0">
            <Brain className="w-3.5 h-3.5 text-primary" />
          </span>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-foreground flex-1">Inteligência Wiize</h3>
          <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
            Beta
          </span>
        </header>

        <div className="px-4 pt-4 pb-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Oportunidade</p>
          <div className="flex items-end justify-between gap-3 mt-1">
            <div className="flex items-baseline gap-1.5">
              <span
                className={cn(
                  "text-[40px] font-semibold leading-none tabular-nums tracking-tight",
                  notAnalyzed ? "text-muted-foreground/50" : "text-foreground",
                )}
              >
                {notAnalyzed ? 0 : opportunity}
              </span>
              <span className="text-[13px] text-muted-foreground">de 100</span>
            </div>
            <span
              className={cn(
                "text-[12px] font-medium pb-1",
                notAnalyzed ? "text-muted-foreground" : "text-foreground",
              )}
            >
              {notAnalyzed ? "Não analisado" : bandF(opportunity!)}
            </span>
          </div>

          <div className="mt-2.5 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-700",
                notAnalyzed ? "bg-muted-foreground/25" : "bg-primary",
              )}
              style={{ width: notAnalyzed ? "100%" : `${Math.max(2, opportunity!)}%` }}
            />
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {notAnalyzed ? (
              <Badge variant="outline" className="text-[10px] font-medium text-muted-foreground">
                Sem sinais suficientes para pontuar
              </Badge>
            ) : (
              <>
                {state === "PARTIAL" && <Badge variant="outline" className="text-[10px] font-medium">Análise parcial</Badge>}
                {profile?.priority && (
                  <Badge variant="outline" className="text-[10px] font-medium">
                    Prioridade {PRIORITY_LABELS[profile.priority] || profile.priority}
                  </Badge>
                )}
                <Badge variant="outline" className="text-[10px] font-medium">Etapa: {stageLabel}</Badge>
              </>
            )}
          </div>
        </div>

        {/* resumo da análise */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border/50 border-t border-border/50 bg-muted/15">
          {[
            { l: "Estado", v: notAnalyzed ? "Não analisado" : state === "PARTIAL" ? "Parcial" : "Completa" },
            { l: "Confiança", v: `${confidence}%` },
            { l: "Mensagens", v: String(analyzedMessages) },
            { l: "Sinais", v: String(analyzedSignals) },
          ].map((s, i) => (
            <div key={i} className={cn("px-3 py-2", i > 1 && "border-t sm:border-t-0 border-border/50")}>
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium truncate">{s.l}</p>
              <p className="text-[12px] font-semibold text-foreground mt-0.5 tabular-nums truncate">{s.v}</p>
            </div>
          ))}
        </div>
        {profile?.computed_at && (
          <p className="px-4 py-1.5 text-[10px] text-muted-foreground border-t border-border/50">
            Última análise {ago(profile.computed_at)}
          </p>
        )}
      </section>



      {/* ------------------------------------------------------------ tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full grid grid-cols-5 h-auto p-1">
          {[
            { v: "overview", l: "Visão geral", i: Target },
            { v: "conversa", l: "Conversa", i: MessageSquare },
            { v: "prospeccao", l: "Prospecção", i: MapPin },
            { v: "comercial", l: "Comercial", i: DollarSign },
            { v: "evolucao", l: "Evolução", i: TrendingUp },
          ].map((t) => (
            <TabsTrigger key={t.v} value={t.v} className="text-[11px] gap-1.5 py-1.5">
              <t.i className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.l}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ------------------------------------------------------- overview */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <Block icon={Target} title="Dimensões da inteligência">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {dims.map((d) =>
                d.value === null && d.basis.length === 0 && ["momentum", "recency", "stage"].includes(d.key) ? (
                  <StateCard key={d.key} label={d.label} icon={d.icon} value={d.status} />
                ) : (
                  <DimensionCard key={d.key} dim={d} />
                )
              )}
            </div>
          </Block>

          <section className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm">
            <header className="flex items-center gap-2 px-3.5 py-2.5 bg-muted/25 border-b border-border/50">
              <span className="w-6 h-6 rounded-lg bg-primary/12 flex items-center justify-center shrink-0">
                <Brain className="w-3.5 h-3.5 text-primary" />
              </span>
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-foreground flex-1 min-w-0 truncate">
                {notAnalyzed ? "Por que ainda não há pontuação" : `Por que a oportunidade está em ${opportunity}`}
              </h4>
            </header>

            <div className="px-3.5 py-3.5 space-y-3.5">
              {/* resumo causal */}
              <p className="text-[12.5px] text-foreground/90 leading-relaxed">
                {notAnalyzed
                  ? prospect
                    ? "Não existe conversa nem sinal comercial registrado para este contato. Os dados da empresa vindos da prospecção ficam disponíveis para montar a abordagem, mas não geram pontuação de oportunidade."
                    : "Não existe conversa, sinal comercial nem dado de prospecção para este contato. A pontuação só é calculada quando houver evidência real."
                  : `A oportunidade é o resultado das dimensões calculadas: ${[
                      profile?.fit_score != null ? `fit ${Math.round(Number(profile.fit_score))}` : null,
                      profile?.intent_score != null ? `intenção ${Math.round(Number(profile.intent_score))}` : null,
                      hasEngagementData ? `engajamento ${Math.round(Number(profile?.engagement_score || 0))}` : null,
                      hasConv ? `qualidade ${Math.round(Number(profile?.quality_score || 0))}` : null,
                      profile?.risk_score != null ? `risco ${Math.round(Number(profile.risk_score))}` : null,
                    ]
                      .filter(Boolean)
                      .join(", ")}.`}
              </p>

              <div className="grid grid-cols-1 gap-2">
                {/* fatores que aumentam */}
                <div className="rounded-lg border border-border/60 overflow-hidden">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/[0.06] border-b border-border/50">
                    <TrendingUp className="w-3.5 h-3.5 text-primary" />
                    <p className="text-[10px] uppercase tracking-wider text-primary font-semibold">Fatores que aumentam</p>
                  </div>
                  <div className="px-3 py-2">
                    {positives.length ? (
                      <ul>
                        {positives.map((f: any, i: number) => (
                          <EvidenceRow
                            key={i}
                            label={`${f.label}${f.impact ? ` (+${Math.round(f.impact)} pts)` : ""}`}
                            quote={conv?.intents.find((x) => f.label?.toLowerCase().includes("pre") && x.key === "PRICE")?.quote}
                            at={conv?.intents[0]?.at}
                            source={conv?.sources[0]}
                          />
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[12px] text-muted-foreground">Nenhum fator positivo identificado até agora.</p>
                    )}
                  </div>
                </div>

                {/* fatores que reduzem */}
                <div className="rounded-lg border border-border/60 overflow-hidden">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/[0.08] border-b border-border/50">
                    <TrendingDown className="w-3.5 h-3.5 text-amber-500" />
                    <p className="text-[10px] uppercase tracking-wider text-amber-600 font-semibold">Fatores que reduzem</p>
                  </div>
                  <div className="px-3 py-2">
                    {negatives.length || notAnalyzed ? (
                      <ul>
                        {notAnalyzed ? (
                          <>
                            <EvidenceRow label="Nenhuma conversa registrada nos canais conectados" positive={false} />
                            <EvidenceRow label="Nenhum sinal de intenção identificado" positive={false} />
                            <EvidenceRow label="Nenhuma interação recente" positive={false} />
                          </>
                        ) : (
                          negatives.map((f: any, i: number) => (
                            <EvidenceRow
                              key={i}
                              label={`${f.label}${f.weight ? ` (-${Math.round(f.weight)} pts)` : ""}`}
                              positive={false}
                            />
                          ))
                        )}
                      </ul>
                    ) : (
                      <p className="text-[12px] text-muted-foreground">Nenhum fator de risco identificado.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* evidências */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Evidências</p>
                {conv && (conv.intents.length || conv.objections.length) ? (
                  <ul className="rounded-lg border border-border/60 px-3 py-1">
                    {conv.intents.map((e) => (
                      <EvidenceRow key={`i-${e.key}`} label={e.label} quote={e.quote} at={e.at} source={e.source} />
                    ))}
                    {conv.objections.map((e) => (
                      <EvidenceRow key={`o-${e.key}`} label={e.label} quote={e.quote} at={e.at} source={e.source} positive={false} />
                    ))}
                  </ul>
                ) : (
                  <p className="text-[12px] text-muted-foreground rounded-lg border border-dashed border-border/70 px-3 py-2.5">
                    Nenhuma conversa disponível para análise.
                  </p>
                )}
              </div>
            </div>
          </section>


          <section className="rounded-xl border border-primary/25 bg-card overflow-hidden shadow-sm">
            <header className="flex items-center gap-2 px-3.5 py-2.5 bg-primary/[0.07] border-b border-primary/20">
              <span className="w-6 h-6 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
              </span>
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-primary flex-1">Próxima melhor ação</h4>
              <Badge variant="outline" className="text-[10px] border-primary/30 text-primary bg-primary/5">
                Prioridade {playbook.priority}
              </Badge>
            </header>

            <div className="px-3.5 py-3.5 space-y-3.5">
              <div>
                <p className="text-[17px] font-semibold text-foreground leading-tight tracking-tight">{playbook.title}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-primary/70" /> {playbook.channel}
                  </span>
                  <span className="w-px h-3 bg-border" />
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary/70" /> {playbook.when}
                  </span>
                </div>
              </div>

              <div className="rounded-lg bg-muted/25 border border-border/50 divide-y divide-border/50">
                <div className="flex items-start gap-2.5 px-3 py-2.5">
                  <Brain className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Por que agora</p>
                    <p className="text-[12.5px] text-foreground mt-0.5 leading-relaxed">{playbook.why}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 px-3 py-2.5">
                  <Compass className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Objetivo desta ação</p>
                    <p className="text-[12.5px] text-foreground mt-0.5 leading-relaxed">{playbook.objective}</p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2 flex items-center gap-1.5">
                  <ListChecks className="w-3.5 h-3.5 text-primary/70" /> Roteiro da abordagem
                </p>
                <ol className="relative pl-1">
                  {playbook.steps.map((s, i) => (
                    <li key={i} className="relative flex items-start gap-2.5 pb-2.5 last:pb-0">
                      {i < playbook.steps.length - 1 && (
                        <span className="absolute left-[9px] top-5 bottom-0 w-px bg-border/70" />
                      )}
                      <span className="relative z-10 w-[19px] h-[19px] rounded-md bg-primary/10 border border-primary/20 text-primary text-[10px] font-semibold flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-[13px] text-foreground/90 leading-snug pt-0.5">{s}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="rounded-lg border-l-2 border-primary bg-primary/[0.06] px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-wider text-primary font-semibold flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5" /> Pergunta que destrava
                </p>
                <p className="text-[13.5px] text-foreground mt-1 leading-relaxed italic">“{playbook.question}”</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="rounded-lg border border-border/60 bg-card px-3 py-2.5">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1.5">
                    <Ban className="w-3.5 h-3.5 text-destructive/70" /> O que evitar
                  </p>
                  <p className="text-[12px] text-foreground/90 mt-1 leading-relaxed">{playbook.avoid}</p>
                </div>
                <div className="rounded-lg border border-border/60 bg-card px-3 py-2.5">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1.5">
                    <Flag className="w-3.5 h-3.5 text-primary/70" /> Resultado esperado
                  </p>
                  <p className="text-[12px] text-foreground/90 mt-1 leading-relaxed">{playbook.expected}</p>
                </div>
              </div>

              {playbook.message ? (
                <div className="rounded-lg border border-border/60 bg-muted/20 overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex-1">
                      Mensagem sugerida
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 text-[11px]"
                      onClick={() => {
                        navigator.clipboard.writeText(playbook.message!);
                        toast.success("Mensagem copiada");
                      }}
                    >
                      <Copy className="w-3 h-3 mr-1" /> Copiar
                    </Button>
                  </div>
                  <div className="px-3 py-2.5">
                    <p className="text-[13px] text-foreground leading-relaxed whitespace-pre-wrap">{playbook.message}</p>
                    {playbook.messageOrigin && (
                      <p className="text-[10px] text-muted-foreground mt-2">{playbook.messageOrigin}</p>
                    )}
                  </div>
                </div>
              ) : (
                <Empty
                  title="Sem contexto para sugerir uma mensagem"
                  description="Não há dados suficientes da empresa nem da conversa para escrever uma mensagem específica. Escrever algo genérico reduziria a chance de resposta."
                />
              )}
            </div>
          </section>

        </TabsContent>

        {/* -------------------------------------------------------- conversa */}
        <TabsContent value="conversa" className="mt-4 space-y-4">
          {!hasConv ? (
            <Empty
              title="Nenhuma conversa registrada"
              description="Não existem mensagens deste número nos canais conectados (WhatsApp via Evolution ou Meta Cloud API). Assim que a primeira mensagem for trocada, a análise de conversa aparece aqui."
            />
          ) : (
            <>
              <Block icon={MessageSquare} title={`Conversa · ${conv!.sources.join(" + ")}`}>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <Stat label="Mensagens" value={String(conv!.total)} hint={`${conv!.inbound} do contato · ${conv!.outbound} suas`} />
                  <Stat label="Idas e vindas" value={String(conv!.turns)} />
                  <Stat label="Reciprocidade" value={`${conv!.reciprocity}%`} />
                  <Stat
                    label="Resposta do contato"
                    value={conv!.leadAvgResponseMinutes != null ? `${conv!.leadAvgResponseMinutes} min` : "Sem dados"}
                  />
                  <Stat
                    label="Sua resposta"
                    value={conv!.avgResponseMinutes != null ? `${conv!.avgResponseMinutes} min` : "Sem dados"}
                  />
                  <Stat
                    label="Silêncio"
                    value={conv!.silenceHours != null ? hoursLabel(conv!.silenceHours) : "Sem dados"}
                  />
                  <Stat label="Dias com conversa" value={String(conv!.activeDays)} />
                  <Stat
                    label="Áudios"
                    value={String(conv!.audioCount)}
                    hint={conv!.audioCount ? `${conv!.transcribedAudioCount} transcrito(s)` : undefined}
                  />
                  <Stat
                    label="Primeira mensagem"
                    value={conv!.firstMessageAt ? format(new Date(conv!.firstMessageAt), "dd/MM/yy") : "Sem dados"}
                  />
                </div>
              </Block>

              <Block icon={Target} title="Sinais identificados na conversa">
                {conv!.intents.length || conv!.objections.length ? (
                  <ul>
                    {conv!.intents.map((e) => (
                      <EvidenceRow key={`ci-${e.key}`} label={e.label} quote={e.quote} at={e.at} source={e.source} />
                    ))}
                    {conv!.objections.map((e) => (
                      <EvidenceRow key={`co-${e.key}`} label={e.label} quote={e.quote} at={e.at} source={e.source} positive={false} />
                    ))}
                  </ul>
                ) : (
                  <p className="text-[12px] text-muted-foreground">
                    Nenhuma intenção ou objeção identificada nas mensagens do contato até agora.
                  </p>
                )}
              </Block>

              {signals.length > 0 && (
                <Block icon={Zap} title="Sinais registrados pelo motor">
                  <ul className="space-y-1">
                    {signals.slice(0, 12).map((s) => (
                      <li key={s.id} className="flex items-center gap-2 py-1 border-b border-border/40 last:border-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="text-[13px] text-foreground/90 flex-1 min-w-0 truncate">{signalLabel(s.signal_type)}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">{ago(s.occurred_at)}</span>
                      </li>
                    ))}
                  </ul>
                </Block>
              )}
            </>
          )}
        </TabsContent>

        {/* ------------------------------------------------------ prospecção */}
        <TabsContent value="prospeccao" className="mt-4 space-y-4">
          {!prospect ? (
            <Empty
              title="Sem dados de prospecção"
              description="Este contato não veio da prospecção da Wiize ou os dados da empresa ainda não foram enriquecidos."
            />
          ) : (
            <>
              <Block icon={MapPin} title="Empresa prospectada">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Empresa" value={prospect.company_name} icon={Building2} />
                  <Field label="Segmento" value={prospect.category} />
                  <Field label="Cidade" value={[prospect.city, prospect.region].filter(Boolean).join(" · ")} icon={MapPin} />
                  <Field label="Site" value={prospect.website} icon={Globe} />
                  <Field
                    label="Reputação"
                    value={prospect.rating != null ? `${prospect.rating} (${prospect.review_count || 0} avaliações)` : null}
                    icon={Star}
                  />
                  <Field label="Origem" value={prospect.origin} />
                  <Field
                    label="Valor estimado"
                    value={prospect.estimated_value != null ? `R$ ${Number(prospect.estimated_value).toLocaleString("pt-BR")}` : null}
                    icon={DollarSign}
                  />
                  <Field
                    label="Prospectado em"
                    value={prospect.prospected_at ? format(new Date(prospect.prospected_at), "dd/MM/yyyy") : null}
                  />
                </div>
              </Block>

              {prospect.ai_diagnosis && (
                <Block icon={Brain} title="Diagnóstico da prospecção">
                  <p className="text-[13px] text-foreground/90 leading-relaxed whitespace-pre-wrap">{prospect.ai_diagnosis}</p>
                </Block>
              )}

              {prospect.ai_recommended_action && (
                <Block icon={ArrowRight} title="Ação recomendada na prospecção">
                  <p className="text-[13px] text-foreground/90 leading-relaxed whitespace-pre-wrap">{prospect.ai_recommended_action}</p>
                </Block>
              )}
            </>
          )}
        </TabsContent>

        {/* -------------------------------------------------------- comercial */}
        <TabsContent value="comercial" className="mt-4 space-y-4">
          {(() => {
            const norm = (s: string | null) => (s || "").toLowerCase();
            const won = deals.filter((d: any) => ["ganho", "won", "fechado", "closed_won"].includes(norm(d.status)));
            const lost = deals.filter((d: any) => ["perdido", "lost", "closed_lost"].includes(norm(d.status)));
            const open = deals.filter((d: any) => !won.includes(d) && !lost.includes(d));
            const sum = (arr: any[]) => arr.reduce((t, d) => t + Number(d.value || 0), 0);
            const brl = (v: number) => `R$ ${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
            const statusLabel = (s: string | null) =>
              won.some((d: any) => norm(d.status) === norm(s)) ? "Ganha"
              : lost.some((d: any) => norm(d.status) === norm(s)) ? "Perdida"
              : s || "Em aberto";

            return (
              <>
                <Block icon={DollarSign} title="Resumo comercial deste contato">
                  {deals.length ? (
                    <div className="grid grid-cols-3 gap-2">
                      <Stat label="Em aberto" value={String(open.length)} hint={open.length ? brl(sum(open)) : undefined} />
                      <Stat label="Ganhas" value={String(won.length)} hint={won.length ? brl(sum(won)) : undefined} />
                      <Stat label="Perdidas" value={String(lost.length)} hint={lost.length ? brl(sum(lost)) : undefined} />
                    </div>
                  ) : (
                    <p className="text-[12px] text-muted-foreground">
                      Nenhuma negociação registrada. Ao criar uma venda na aba Vendas deste contato, ela aparece aqui e
                      passa a alimentar os padrões da sua conta.
                    </p>
                  )}
                </Block>

                {deals.length > 0 && (
                  <Block icon={DollarSign} title="Negociações">
                    <ul className="space-y-1.5">
                      {deals.map((d: any) => (
                        <li key={d.id} className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-medium text-foreground truncate">{d.title || "Negociação"}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {[
                                statusLabel(d.status),
                                d.sale_type || null,
                                format(new Date(d.closed_at || d.created_at), "dd/MM/yyyy"),
                              ].filter(Boolean).join(" · ")}
                            </p>
                          </div>
                          {d.value != null && (
                            <span className="text-[13px] font-semibold tabular-nums text-foreground shrink-0">
                              {brl(Number(d.value))}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </Block>
                )}

                <Block icon={TrendingUp} title="Padrões históricos da sua conta">
                  {patterns.length ? (
                    <ul className="space-y-1">
                      {patterns.slice(0, 6).map((p: any, i: number) => (
                        <li key={i} className="flex items-center gap-2 py-1.5 border-b border-border/40 last:border-0">
                          <span className="text-[13px] text-foreground/90 flex-1 min-w-0 truncate">
                            {signalLabel(p.pattern_key)}
                            {p.niche ? <span className="text-muted-foreground"> · {p.niche}</span> : null}
                          </span>
                          <span className="text-[11px] tabular-nums text-muted-foreground shrink-0">
                            {Math.round(Number(p.rate || 0) * 100)}% de conversão · {p.sample_size} caso(s)
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[12px] text-muted-foreground">
                      Ainda não há padrões suficientes. Eles aparecem conforme você registra vendas ganhas e perdidas.
                    </p>
                  )}
                </Block>
              </>
            );
          })()}

        </TabsContent>

        {/* --------------------------------------------------------- evolução */}
        <TabsContent value="evolucao" className="mt-4 space-y-4">
          {chartData.length > 1 ? (
            <Block icon={TrendingUp} title="Evolução da oportunidade">
              {(() => {
                const first = chartData[0].value;
                const last = chartData[chartData.length - 1].value;
                const delta = last - first;
                const peak = Math.max(...chartData.map((c) => c.value));
                return (
                  <>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <Stat label="Atual" value={`${last} de 100`} />
                      <Stat
                        label="Variação no período"
                        value={`${delta > 0 ? "+" : ""}${delta} pts`}
                        hint={delta > 0 ? "em crescimento" : delta < 0 ? "em queda" : "estável"}
                      />
                      <Stat label="Pico" value={`${peak} de 100`} />
                    </div>
                    <div className="h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 6, right: 8, left: -22, bottom: 0 }}>
                          <XAxis dataKey="at" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
                          <RTooltip
                            contentStyle={{ fontSize: 11, borderRadius: 8 }}
                            formatter={(v: any) => [`${v} de 100`, "Oportunidade"]}
                          />
                          <RLine type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                );
              })()}
            </Block>
          ) : (

            <Empty
              title="Sem histórico suficiente"
              description="A evolução aparece a partir da segunda variação registrada pelo motor para este contato."
            />
          )}

          {history.length > 0 && (
            <Block icon={Clock} title="Histórico da inteligência">
              <ul className="space-y-1">
                {history.slice(0, 20).map((h, i) => (
                  <li key={i} className="flex items-start gap-2 py-1.5 border-b border-border/40 last:border-0">
                    <span className={cn("text-[11px] font-semibold tabular-nums shrink-0 w-10", Number(h.points_applied) >= 0 ? "text-primary" : "text-destructive")}>
                      {Number(h.points_applied) >= 0 ? "+" : ""}{Math.round(Number(h.points_applied))}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] text-foreground/90 leading-snug">{signalLabel(h.event_type || "Atualização")}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {format(new Date(h.created_at), "dd/MM HH:mm")}
                        {h.score_after != null ? ` · oportunidade ${Math.round(Number(h.score_after) / 10)} de 100` : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </Block>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default LeadIntelligencePanel;
