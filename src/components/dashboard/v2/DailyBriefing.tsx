import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronDown, ChevronUp, Send, Loader2, RotateCcw, Info, Zap } from "lucide-react";
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

interface Snapshot {
  date: string;
  periodDays: number;
  metrics: BriefingMetrics;
  alerts?: { type: string; text: string }[];
}

/** Mantém no navegador um histórico de até 7 dias (métricas + alertas) para dar memória à Wian. */
function persistSnapshot(metrics: BriefingMetrics, periodDays: number, alerts: ExecutiveAlert[]) {
  const today = dayKey();
  const list = readJSON<Snapshot[]>(SNAP_KEY, []).filter((d) => d?.date && d.date !== today);
  list.push({
    date: today,
    periodDays,
    metrics,
    alerts: (alerts || []).map((a) => ({ type: a.type, text: a.text })),
  });
  const trimmed = list.slice(-7);
  writeJSON(SNAP_KEY, trimmed);
  return trimmed;
}

const SUGGESTIONS = [
  { shortcut: "plano", label: "Sim, me explique o plano de ação" },
  { shortcut: "prioridade", label: "O que eu devo priorizar hoje?" },
  { shortcut: "funil", label: "Analise meu funil e aponte o gargalo" },
  { shortcut: "conversao", label: "Por que minha conversão caiu?" },
  { shortcut: "metas", label: "Defina metas para recuperar os números" },
];

export function DailyBriefing({ alerts, userName, periodDays, metrics }: DailyBriefingProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [collapsed, setCollapsed] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  const today = new Date();
  const dateLabel = today.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

  // Conversa do dia + limpeza dos dias anteriores (reset diário do briefing)
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
    if (metrics && Object.keys(metrics).length > 0) persistSnapshot(metrics, periodDays, alerts || []);
  }, [metrics, periodDays, alerts]);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const list = useMemo(() => (alerts || []).filter((a) => !a.text.includes("NaN")), [alerts]);
  const critical = useMemo(() => list.filter((a) => a.type === "danger"), [list]);
  const attention = useMemo(() => list.filter((a) => a.type === "warning"), [list]);
  const positives = useMemo(() => list.filter((a) => a.type === "success"), [list]);

  /** Pontos que estavam críticos/em atenção ontem e não aparecem mais hoje. */
  const resolvedSinceYesterday = useMemo(() => {
    const snaps = readJSON<Snapshot[]>(SNAP_KEY, []);
    const prev = [...snaps].reverse().find((s) => s.date !== dayKey());
    if (!prev?.alerts?.length) return [] as string[];
    const todayTexts = new Set(list.map((a) => a.text));
    return prev.alerts
      .filter((a) => (a.type === "danger" || a.type === "warning") && !todayTexts.has(a.text))
      .map((a) => a.text)
      .slice(0, 3);
  }, [list]);

  /** Briefing inicial: exatamente 4 mensagens no formato de chat. */
  const briefing = useMemo<string[]>(() => {
    const name = firstName(userName);
    const bullets = (items: ExecutiveAlert[]) => items.slice(0, 5).map((a) => `• ${a.text}`).join("\n");

    const m1 = `${greeting(today.getHours())}${name ? `, ${name}` : ""}. Este é o seu briefing comercial de hoje, ${dateLabel}, com base nos últimos ${periodDays} dias de operação. Analisei ${list.length} indicadores: ${critical.length} crítico(s), ${attention.length} em atenção e ${positives.length} positivo(s).`;

    const parts2: string[] = [];
    if (critical.length > 0) {
      parts2.push(`🔴 Identifiquei ${critical.length} ponto(s) crítico(s) na operação:\n${bullets(critical)}`);
    }
    if (attention.length > 0) {
      parts2.push(`🟡 E ${attention.length} ponto(s) de atenção:\n${bullets(attention)}`);
    }
    const m2 =
      parts2.length > 0
        ? parts2.join("\n\n")
        : "🟢 Não identifiquei pontos críticos nem de atenção nesta janela. A operação está dentro do esperado.";

    const parts3: string[] = [];
    if (positives.length > 0) {
      parts3.push(`🟢 No lado positivo, registrei ${positives.length} evolução(ões):\n${bullets(positives)}`);
    }
    if (resolvedSinceYesterday.length > 0) {
      parts3.push(
        `✅ Comparando com o briefing de ontem, estes pontos foram resolvidos:\n${resolvedSinceYesterday
          .map((t) => `• ${t}`)
          .join("\n")}\nBom trabalho — vale sustentar o ritmo.`,
      );
    }
    const m3 =
      parts3.length > 0
        ? parts3.join("\n\n")
        : "🟢 Ainda não há indicadores de crescimento relevantes nesta janela. Assim que houver evolução consistente, eu destaco aqui.";

    const priority = critical[0] || attention[0] || positives[0];
    const m4 = priority
      ? `Preparei um plano de ação pronto para começarmos a resolver as pendências, priorizando "${priority.text}". Quer que eu te explique melhor?`
      : "Preparei um plano de ação para ampliar volume e acelerar o pipeline nesta semana. Quer que eu te explique melhor?";

    return [m1, m2, m3, m4];
  }, [list, critical, attention, positives, resolvedSinceYesterday, userName, periodDays, dateLabel]);

  const send = async (raw?: string) => {
    const question = (raw ?? input).trim();
    if (!question || sending) return;

    const next = [...messages, { role: "user" as ChatRole, content: question, at: Date.now() }];
    setMessages(next);
    writeJSON(CHAT_KEY(), next);
    setInput("");
    setSending(true);

    try {
      const snapshots = readJSON<Snapshot[]>(SNAP_KEY, []);
      const { data, error } = await supabase.functions.invoke("briefing-chat", {
        body: {
          message: question,
          // O briefing lido pelo gestor entra como memória inicial da conversa
          messages: [
            ...briefing.map((content) => ({ role: "assistant", content })),
            ...next.slice(-10).map((m) => ({ role: m.role, content: m.content })),
          ],
          snapshot: {
            periodDays,
            metrics: metrics ?? {},
            alerts: list.map((a) => ({ type: a.type, text: a.text })),
            resolvedSinceYesterday,
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

  const Avatar = () => (
    <div className="w-7 h-7 shrink-0 rounded-sm bg-primary/10 text-primary flex items-center justify-center text-[11px] font-semibold">
      W
    </div>
  );

  const Bubble = ({ text }: { text: string }) => (
    <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-muted/60 px-3.5 py-2.5 text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap">
      {text}
    </div>
  );

  return (
    <>
      <Card className="border-border/40 rounded-2xl overflow-hidden">
        <CardHeader className="pb-3 flex flex-row items-start justify-between gap-3 space-y-0">
          <div className="min-w-0">
            <CardTitle className="text-base font-semibold">Briefing do dia com a Wian</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {dateLabel} • últimos {periodDays} dias
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs text-muted-foreground"
              onClick={() => setShowInfo(true)}
            >
              <Info size={14} />
            </Button>
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
          <CardContent className="space-y-3 pb-5">
            <div ref={threadRef} className="max-h-[520px] overflow-y-auto space-y-3 pr-1">
              {briefing.map((text, i) => (
                <div key={`b-${i}`} className="flex gap-2.5">
                  <Avatar />
                  <Bubble text={text} />
                </div>
              ))}

              {messages.map((m, i) => (
                <div key={`m-${i}`} className={cn("flex gap-2.5", m.role === "user" && "justify-end")}>
                  {m.role === "assistant" && <Avatar />}
                  {m.role === "assistant" ? (
                    <Bubble text={m.content} />
                  ) : (
                    <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap">
                      {m.content}
                    </div>
                  )}
                </div>
              ))}

              {sending && (
                <div className="flex gap-2.5 items-center">
                  <Avatar />
                  <div className="rounded-2xl rounded-tl-sm bg-muted/60 px-3.5 py-2.5 text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 size={13} className="animate-spin" /> Analisando seus dados...
                  </div>
                </div>
              )}
            </div>

            {/* Mensagens rápidas — mesmo padrão do chat */}
            <div className="rounded-xl border border-border/60 overflow-hidden">
              <div className="px-3 py-2 border-b border-border/60 flex items-center gap-2">
                <Zap size={12} className="text-primary shrink-0" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Mensagens rápidas
                </span>
              </div>
              <div>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.shortcut}
                    type="button"
                    disabled={sending}
                    onClick={() => send(s.label)}
                    className="w-full text-left px-3 py-2 flex items-start gap-2.5 transition-colors border-b border-border/40 last:border-b-0 hover:bg-muted/60 disabled:opacity-50"
                  >
                    <code className="shrink-0 mt-0.5 px-1.5 py-0.5 rounded-sm bg-primary/15 text-primary text-[11px] font-mono font-semibold">
                      /{s.shortcut}
                    </code>
                    <span className="flex-1 min-w-0 text-xs text-foreground/80">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>

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
                placeholder="Responda à Wian ou pergunte sobre suas métricas..."
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
          </CardContent>
        )}
      </Card>

      <Dialog open={showInfo} onOpenChange={setShowInfo}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Como funciona o Briefing do dia</DialogTitle>
            <DialogDescription>
              Uma leitura executiva da sua operação, atualizada todos os dias.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              Todo dia a Wian analisa os indicadores do seu cockpit na janela selecionada e organiza a leitura em
              quatro mensagens: apresentação, pontos críticos e de atenção, evoluções positivas e o plano de ação.
            </p>
            <p>
              Os emojis indicam severidade: 🔴 crítico, 🟡 atenção, 🟢 positivo e ✅ ponto que estava pendente ontem e
              foi resolvido.
            </p>
            <p>
              O histórico dos últimos 7 dias fica salvo neste navegador para que a Wian compare tendências e reconheça
              melhorias. A conversa é reiniciada todos os dias junto com o novo briefing.
            </p>
            <p>
              Ela responde exclusivamente sobre os dados da sua operação na Wiize — prospecção, funil, CRM, campanhas,
              SDR e agenda.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
