import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Send,
  Loader2,
  RotateCcw,
  TrendingUp,
  AlertTriangle,
  Target,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { ExecutiveAlert } from "./ExecutiveAlerts";

export interface BriefingMetrics {
  [label: string]: number | string;
}

interface DailyBriefingProps {
  alerts: ExecutiveAlert[];
  userName?: string | null;
  periodDays: number;
  metrics?: BriefingMetrics;
}

type ChatRole = "user" | "assistant";
interface ChatMsg {
  role: ChatRole;
  content: string;
  at: number;
}

interface BriefingBlock {
  id: string;
  title?: string;
  tone: "neutral" | "success" | "danger" | "warning";
  text: string;
  items?: { text: string; route: string; tone: ExecutiveAlert["type"] }[];
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const dayKey = () => new Date().toISOString().slice(0, 10);
const CHAT_KEY = () => `wiize:briefing:chat:${dayKey()}`;
const SNAP_KEY = "wiize:briefing:snapshots";

function greeting(hour: number) {
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function firstName(name?: string | null) {
  if (!name) return null;
  const clean = name.trim().split(/\s+/)[0];
  return clean ? capitalize(clean.toLowerCase()) : null;
}

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

/** Mantém no navegador um histórico de até 7 dias de métricas para dar contexto de tendência à Wian. */
function persistSnapshot(metrics: BriefingMetrics, periodDays: number) {
  const today = dayKey();
  const list = readJSON<any[]>(SNAP_KEY, []).filter((d) => d?.date && d.date !== today);
  list.push({ date: today, periodDays, metrics });
  writeJSON(SNAP_KEY, list.slice(-7));
  return list.slice(-7);
}

const SUGGESTIONS = [
  "O que eu devo priorizar hoje?",
  "Por que minha conversão caiu?",
  "Como aumentar as respostas dos leads?",
  "Analise meu funil e aponte o gargalo",
];

export function DailyBriefing({ alerts, userName, periodDays, metrics }: DailyBriefingProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [collapsed, setCollapsed] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  const today = new Date();
  const dateLabel = capitalize(
    today.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }),
  );

  // Carrega conversa do dia e limpa dias anteriores (reset diário do briefing)
  useEffect(() => {
    setMessages(readJSON<ChatMsg[]>(CHAT_KEY(), []));
    try {
      const prefix = "wiize:briefing:chat:";
      const keep = CHAT_KEY();
      Object.keys(localStorage)
        .filter((k) => k.startsWith(prefix) && k !== keep)
        .forEach((k) => localStorage.removeItem(k));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (metrics && Object.keys(metrics).length > 0) persistSnapshot(metrics, periodDays);
  }, [metrics, periodDays]);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const list = useMemo(() => (alerts || []).filter((a) => !a.text.includes("NaN")), [alerts]);
  const critical = list.filter((a) => a.type === "danger");
  const attention = list.filter((a) => a.type === "warning");
  const positives = list.filter((a) => a.type === "success");
  const infos = list.filter((a) => a.type === "info");

  const blocks = useMemo<BriefingBlock[]>(() => {
    const name = firstName(userName);
    const out: BriefingBlock[] = [
      {
        id: "hello",
        tone: "neutral",
        text: `${greeting(today.getHours())}${name ? `, ${name}` : ""}. Este é o seu briefing comercial de hoje, com base nos últimos ${periodDays} dias de operação. Analisei ${list.length} indicadores: ${critical.length} crítico(s), ${attention.length} em atenção e ${positives.length} positivo(s).`,
      },
    ];

    if (positives.length > 0) {
      out.push({
        id: "positives",
        title: "O que está funcionando",
        tone: "success",
        text:
          positives.length === 1
            ? "Um destaque positivo para sustentar o ritmo:"
            : `${positives.length} destaques positivos que valem ser mantidos e ampliados:`,
        items: positives.slice(0, 4).map((a) => ({ text: a.text, route: a.route, tone: a.type })),
      });
    }

    if (critical.length > 0) {
      out.push({
        id: "critical",
        title: "Risco imediato",
        tone: "danger",
        text:
          critical.length === 1
            ? "Um ponto crítico está travando resultado agora:"
            : `${critical.length} pontos críticos estão travando resultado agora:`,
        items: critical.slice(0, 4).map((a) => ({ text: a.text, route: a.route, tone: a.type })),
      });
    }

    if (attention.length > 0) {
      out.push({
        id: "attention",
        title: "Pontos de atenção",
        tone: "warning",
        text:
          attention.length === 1
            ? "Mais um ponto para acompanhar de perto nesta semana:"
            : `${attention.length} pontos para acompanhar de perto nesta semana:`,
        items: attention.slice(0, 4).map((a) => ({ text: a.text, route: a.route, tone: a.type })),
      });
    }

    if (critical.length === 0 && attention.length === 0) {
      out.push({
        id: "clean",
        tone: "success",
        text: "Nenhum risco crítico hoje. Os indicadores estão dentro do esperado — foco em volume e follow-up.",
      });
    }

    if (infos.length > 0) {
      out.push({
        id: "infos",
        title: "Leitura de contexto",
        tone: "neutral",
        text: "Observações que ajudam no planejamento dos envios:",
        items: infos.slice(0, 2).map((a) => ({ text: a.text, route: a.route, tone: a.type })),
      });
    }

    const priority = critical[0] || attention[0] || positives[0];
    out.push({
      id: "closing",
      title: "Plano do dia",
      tone: "neutral",
      text: priority
        ? `Comece por: "${priority.text}". Resolver esse item primeiro é o que mais move o resultado hoje. Depois, avance no follow-up dos leads de maior score e confirme as reuniões da semana.`
        : "Mantenha o ritmo de prospecção, responda as conversas abertas no mesmo dia e confirme as reuniões da semana para sustentar o pipeline.",
    });

    return out;
  }, [list, critical, attention, positives, infos, userName, periodDays]);

  const send = async (raw?: string) => {
    const question = (raw ?? input).trim();
    if (!question || sending) return;

    const next = [...messages, { role: "user" as ChatRole, content: question, at: Date.now() }];
    setMessages(next);
    writeJSON(CHAT_KEY(), next);
    setInput("");
    setSending(true);

    try {
      const snapshots = readJSON<any[]>(SNAP_KEY, []);
      const { data, error } = await supabase.functions.invoke("briefing-chat", {
        body: {
          message: question,
          messages: next.slice(-10).map((m) => ({ role: m.role, content: m.content })),
          snapshot: {
            periodDays,
            metrics: metrics ?? {},
            alerts: list.map((a) => ({ type: a.type, text: a.text })),
          },
          history: snapshots.slice(0, -1),
        },
      });

      if (error) throw error;
      if ((data as any)?.error === "daily_limit") {
        toast({
          title: "Limite diário atingido",
          description: "Você já usou as consultas de hoje com a Wian. Ela volta amanhã com o novo briefing.",
          variant: "destructive",
        });
        return;
      }

      const reply = (data as any)?.reply?.trim();
      if (!reply) throw new Error("Resposta vazia");

      const withReply = [...next, { role: "assistant" as ChatRole, content: reply, at: Date.now() }];
      setMessages(withReply);
      writeJSON(CHAT_KEY(), withReply);
    } catch (e: any) {
      toast({
        title: "Não consegui responder agora",
        description: e?.message ? String(e.message) : "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const clearChat = () => {
    setMessages([]);
    writeJSON(CHAT_KEY(), []);
    inputRef.current?.focus();
  };

  const toneIcon = (tone: BriefingBlock["tone"]) => {
    if (tone === "danger") return <AlertTriangle size={13} className="text-destructive" />;
    if (tone === "warning") return <AlertTriangle size={13} className="text-yellow-500" />;
    if (tone === "success") return <TrendingUp size={13} className="text-primary" />;
    return <Target size={13} className="text-muted-foreground" />;
  };

  return (
    <Card className="border-border/40 rounded-2xl overflow-hidden">
      <CardHeader className="pb-3 flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="min-w-0">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <span className="w-7 h-7 rounded-sm bg-primary/10 text-primary flex items-center justify-center">
              <Sparkles size={14} />
            </span>
            Briefing do dia com a Wian
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {dateLabel} • últimos {periodDays} dias
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {messages.length > 0 && !collapsed && (
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground" onClick={clearChat}>
              <RotateCcw size={13} /> Limpar
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs text-muted-foreground"
            onClick={() => setCollapsed((v) => !v)}
          >
            {collapsed ? <>Abrir <ChevronDown size={14} /></> : <>Fechar <ChevronUp size={14} /></>}
          </Button>
        </div>
      </CardHeader>

      {!collapsed && (
        <CardContent className="space-y-4 pb-5">
          {/* Resumo executivo */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="rounded-sm border-destructive/30 text-destructive bg-destructive/5">
              {critical.length} crítico(s)
            </Badge>
            <Badge variant="outline" className="rounded-sm border-yellow-500/30 text-yellow-600 bg-yellow-500/5">
              {attention.length} atenção
            </Badge>
            <Badge variant="outline" className="rounded-sm border-primary/30 text-primary bg-primary/5">
              {positives.length} positivo(s)
            </Badge>
          </div>

          {/* Briefing */}
          <div className="space-y-3">
            {blocks.map((b) => (
              <div key={b.id} className="flex gap-2.5">
                <div className="w-7 h-7 shrink-0 rounded-sm bg-primary/10 text-primary flex items-center justify-center text-[11px] font-semibold">
                  W
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  {b.title && (
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {toneIcon(b.tone)}
                      {b.title}
                    </div>
                  )}
                  <div className="inline-block max-w-full rounded-2xl rounded-tl-sm bg-muted/60 px-3.5 py-2.5 text-sm text-foreground/85 leading-relaxed">
                    {b.text}
                  </div>
                  {b.items && b.items.length > 0 && (
                    <div className="space-y-1.5">
                      {b.items.map((it, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => navigate(it.route)}
                          className={cn(
                            "w-full text-left flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm transition-colors group",
                            it.tone === "danger"
                              ? "bg-destructive/[0.06] border-destructive/20 hover:bg-destructive/10"
                              : it.tone === "warning"
                              ? "bg-yellow-500/[0.06] border-yellow-500/20 hover:bg-yellow-500/10"
                              : it.tone === "success"
                              ? "bg-primary/[0.06] border-primary/20 hover:bg-primary/10"
                              : "bg-muted/50 border-border/30 hover:bg-muted/80",
                          )}
                        >
                          <span className="flex-1 text-foreground/80">{it.text}</span>
                          <ArrowRight
                            size={14}
                            className="shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Conversa com a Wian */}
          <div className="pt-2 border-t border-border/40 space-y-3">
            <p className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">
              Converse com a Wian sobre estes números
            </p>

            {(messages.length > 0 || sending) && (
              <div ref={threadRef} className="max-h-[320px] overflow-y-auto space-y-3 pr-1">
                {messages.map((m, i) => (
                  <div key={i} className={cn("flex gap-2.5", m.role === "user" && "justify-end")}>
                    {m.role === "assistant" && (
                      <div className="w-7 h-7 shrink-0 rounded-sm bg-primary/10 text-primary flex items-center justify-center text-[11px] font-semibold">
                        W
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[85%] px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
                        m.role === "assistant"
                          ? "rounded-2xl rounded-tl-sm bg-muted/60 text-foreground/85"
                          : "rounded-2xl rounded-tr-sm bg-primary text-primary-foreground",
                      )}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}
                {sending && (
                  <div className="flex gap-2.5 items-center">
                    <div className="w-7 h-7 shrink-0 rounded-sm bg-primary/10 text-primary flex items-center justify-center text-[11px] font-semibold">
                      W
                    </div>
                    <div className="rounded-2xl rounded-tl-sm bg-muted/60 px-3.5 py-2.5 text-sm text-muted-foreground flex items-center gap-2">
                      <Loader2 size={13} className="animate-spin" /> Analisando seus dados...
                    </div>
                  </div>
                )}
              </div>
            )}

            {messages.length === 0 && (
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    disabled={sending}
                    className="px-3 py-1.5 rounded-sm border border-border/40 bg-muted/40 text-xs text-foreground/75 hover:bg-muted/70 transition-colors disabled:opacity-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="flex items-center gap-2"
            >
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Pergunte sobre suas métricas, funil, campanhas ou próximos passos..."
                className="h-10 text-sm rounded-sm"
                disabled={sending}
                maxLength={600}
              />
              <Button type="submit" size="sm" className="h-10 px-3 rounded-sm" disabled={sending || !input.trim()}>
                {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              </Button>
            </form>
            <p className="text-[11px] text-muted-foreground">
              A Wian responde apenas sobre os dados da sua operação na Wiize.
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
