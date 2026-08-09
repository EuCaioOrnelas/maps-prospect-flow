import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronDown, ChevronUp, Send, Loader2, RotateCcw, Info, Zap, ShieldCheck, Mic, Trash2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import type { ExecutiveAlert } from "./ExecutiveAlerts";
import { BriefingAudioBubble } from "./BriefingAudioBubble";
import wianAvatar from "@/assets/wian-avatar.png";


export interface BriefingMetrics {
  [label: string]: number | string;
}

export interface BriefingCapabilities {
  planName: string;
  /** Módulo Oportunidades / Prospecção IA liberado no plano */
  opportunities: boolean;
  /** SDR Inteligente (exclusivo Growth IA) */
  sdr: boolean;
  /** Agentes IA */
  agents: boolean;
}

interface DailyBriefingProps {
  alerts: ExecutiveAlert[];
  userName?: string | null;
  periodDays: number;
  metrics?: BriefingMetrics;
  capabilities?: BriefingCapabilities;
  /** Modo demonstração (tour guiado): simula uma conversa real com a Wian, sem chamar a IA. */
  demoConversation?: boolean;
}



type ChatRole = "user" | "assistant";
interface ChatMsg {
  role: ChatRole;
  content: string;
  at: number;
  /** Mensagem de voz do gestor (blob local, válido apenas na sessão atual) */
  audioUrl?: string;
  audioSeconds?: number;
}


const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const dayKey = () => new Date().toISOString().slice(0, 10);
const CHAT_KEY = () => `wiize:briefing:chat:${dayKey()}`;
const SNAP_KEY = "wiize:briefing:snapshots";
const PERSONA_KEY = (uid: string) => `wiize:briefing:persona:${uid}`;

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

/** Perfil individual do gestor — evolui a cada interação para personalizar o tom da Wian. */
interface Persona {
  interactions: number;
  topics: Record<string, number>;
  lastSeen?: string;
}

const TOPIC_MAP: { key: string; match: RegExp }[] = [
  { key: "funil", match: /funil|gargalo|etapa/i },
  { key: "receita", match: /receita|faturamento|ticket|financeiro/i },
  { key: "prospecção", match: /prospec|lead|oportunidade|busca/i },
  { key: "conversão", match: /convers|fechamento|proposta/i },
  { key: "sdr", match: /sdr|agente|reuni|agenda/i },
  { key: "crm", match: /crm|contato|pipeline|negocia/i },
  { key: "campanhas", match: /campanha|disparo|whatsapp|meta/i },
];

function bumpPersona(uid: string, question: string): Persona {
  const current = readJSON<Persona>(PERSONA_KEY(uid), { interactions: 0, topics: {} });
  const topics = { ...(current.topics || {}) };
  TOPIC_MAP.forEach((t) => {
    if (t.match.test(question)) topics[t.key] = (topics[t.key] ?? 0) + 1;
  });
  const next: Persona = {
    interactions: (current.interactions ?? 0) + 1,
    topics,
    lastSeen: dayKey(),
  };
  writeJSON(PERSONA_KEY(uid), next);
  return next;
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

interface Suggestion {
  shortcut: string;
  label: string;
  /** Só aparece se o plano tiver o módulo correspondente */
  requires?: "opportunities" | "sdr";
}

const SUGGESTIONS: Suggestion[] = [
  { shortcut: "plano", label: "Sim, me explique o plano de ação" },
  { shortcut: "prioridade", label: "O que eu devo priorizar hoje?" },
  { shortcut: "funil", label: "Analise meu funil e aponte o gargalo" },
  { shortcut: "receita", label: "Como aumentar a receita projetada?" },
  { shortcut: "crm", label: "Quais oportunidades do CRM valem atacar?" },
  { shortcut: "atendimento", label: "Como está o atendimento e as respostas?" },
  { shortcut: "campanhas", label: "Minhas campanhas estão performando?" },
  { shortcut: "prospeccao", label: "Como melhorar minha prospecção?", requires: "opportunities" },
  { shortcut: "sdr", label: "Como está a performance do SDR Inteligente?", requires: "sdr" },
];

/** Termos que só fazem sentido para quem tem prospecção / SDR no plano. */
const OPPORTUNITY_TERMS = /prospec|oportunidade|captaç|captad|busca de empresas|diagn[óo]stico/i;
const SDR_TERMS = /\bsdr\b|agente ia|agentes ia|copiloto/i;

const timeLabel = (ts: number) =>
  new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

export function DailyBriefing({ alerts, userName, periodDays, metrics, capabilities }: DailyBriefingProps) {
  const caps: BriefingCapabilities = capabilities ?? {
    planName: "—",
    opportunities: true,
    sdr: true,
    agents: true,
  };

  const { toast, dismiss } = useToast();
  const { user, profile } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showQuick, setShowQuick] = useState(true);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  // ---- Gravação de voz ----
  const [recording, setRecording] = useState(false);
  const [locked, setLocked] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const cancelRef = useRef(false);
  const startedAtRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const lastToastRef = useRef<string | null>(null);

  const initials = useMemo(() => {
    const n = (profile?.name || userName || "").trim();
    if (!n) return "EU";
    const parts = n.split(/\s+/);
    return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "EU";
  }, [profile?.name, userName]);

  /** Aviso único: sempre apaga o anterior quando chega uma nova mensagem da Wian. */
  const notify = (title: string, description: string, variant?: "destructive") => {
    if (lastToastRef.current) dismiss(lastToastRef.current);
    const t = toast({ title, description, variant });
    lastToastRef.current = t.id;
  };

  const today = new Date();
  const dateLabel = today.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const briefingAt = useMemo(() => today.getTime(), []); // horário base das mensagens do briefing

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

  // Auto-altura do input (limite + scroll interno, igual WhatsApp)
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [input]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);


  // Remove indicadores de módulos que o plano do usuário não possui (ex.: Atendimento sem prospecção/SDR)
  const list = useMemo(
    () =>
      (alerts || []).filter((a) => {
        if (a.text.includes("NaN")) return false;
        if (!caps.opportunities && OPPORTUNITY_TERMS.test(a.text)) return false;
        if (!caps.sdr && SDR_TERMS.test(a.text)) return false;
        return true;
      }),
    [alerts, caps.opportunities, caps.sdr],
  );
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

  /** Briefing inicial: exatamente 4 mensagens no formato de chat, personalizado pelo perfil do gestor. */
  const briefing = useMemo<string[]>(() => {
    const name = firstName(userName);
    const persona = user?.id
      ? readJSON<Persona>(PERSONA_KEY(user.id), { interactions: 0, topics: {} })
      : { interactions: 0, topics: {} };
    const veteran = (persona.interactions ?? 0) >= 8;
    const topTopic = Object.entries(persona.topics || {}).sort((a, b) => b[1] - a[1])[0]?.[0];
    const bullets = (items: ExecutiveAlert[]) => items.slice(0, 5).map((a) => `• ${a.text}`).join("\n");

    const m1 = veteran
      ? `${greeting(today.getHours())}${name ? `, ${name}` : ""}. Briefing de ${dateLabel} — janela de ${periodDays} dias. ${list.length} indicadores analisados: ${critical.length} crítico(s), ${attention.length} em atenção, ${positives.length} positivo(s).${topTopic ? ` Já deixei ${topTopic} mapeado, como você costuma acompanhar.` : ""}`
      : `${greeting(today.getHours())}${name ? `, ${name}` : ""}. Este é o seu briefing comercial de hoje, ${dateLabel}, com base nos últimos ${periodDays} dias de operação. Analisei ${list.length} indicadores: ${critical.length} crítico(s), ${attention.length} em atenção e ${positives.length} positivo(s).`;

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
  }, [list, critical, attention, positives, resolvedSinceYesterday, userName, periodDays, dateLabel, user?.id]);

  /** Envia texto ou áudio para a Wian. Quando há áudio, ela transcreve e responde ao conteúdo falado. */
  const send = async (raw?: string, voice?: { blob: Blob; seconds: number }) => {
    const question = voice ? "" : (raw ?? input).trim();
    if ((!question && !voice) || sending) return;

    let audioUrl: string | undefined;
    let audioB64: string | undefined;
    if (voice) {
      audioUrl = URL.createObjectURL(voice.blob);
      audioB64 = await new Promise<string>((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result).split(",")[1] || "");
        fr.onerror = () => reject(new Error("Falha ao ler o áudio"));
        fr.readAsDataURL(voice.blob);
      });
    }

    const userMsg: ChatMsg = {
      role: "user",
      content: question || "🎤 Mensagem de voz",
      at: Date.now(),
      ...(audioUrl ? { audioUrl, audioSeconds: voice?.seconds } : {}),
    };
    const next = [...messages, userMsg];
    setMessages(next);
    writeJSON(CHAT_KEY(), next.map((m) => ({ ...m, audioUrl: undefined })));
    if (!voice) setInput("");
    setSending(true);

    try {
      const snapshots = readJSON<Snapshot[]>(SNAP_KEY, []);
      const persona = user?.id ? bumpPersona(user.id, question || "audio") : undefined;
      const { data, error } = await supabase.functions.invoke("briefing-chat", {
        body: {
          message: question,
          audio: audioB64,
          audio_mime: voice ? voice.blob.type || "audio/webm" : undefined,
          persona,
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
            capabilities: caps,
          },
          history: snapshots.slice(0, -1),
        },
      });

      if (error) throw error;
      if ((data as any)?.error === "daily_limit") {
        notify(
          "Limite diário atingido",
          "Você já usou as consultas de hoje com a Wian. Ela volta amanhã com o novo briefing.",
          "destructive",
        );
        return;
      }

      const reply = (data as any)?.reply?.trim();
      if (!reply) throw new Error("Resposta vazia");

      const transcript = (data as any)?.transcript?.trim();
      const base = transcript
        ? next.map((m, i) => (i === next.length - 1 && m.audioUrl ? { ...m, content: transcript } : m))
        : next;
      const withReply = [...base, { role: "assistant" as ChatRole, content: reply, at: Date.now() }];
      setMessages(withReply);
      writeJSON(CHAT_KEY(), withReply.map((m) => ({ ...m, audioUrl: undefined })));
      notify("Wian respondeu", reply.replace(/\s+/g, " ").slice(0, 110) + (reply.length > 110 ? "…" : ""));
    } catch (e: any) {
      notify(
        "Não consegui responder agora",
        e?.message ? String(e.message) : "Tente novamente em instantes.",
        "destructive",
      );
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  // ---- Controles de gravação (segurar para enviar · toque rápido para travar) ----
  const stopTimer = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const startRecording = async () => {
    if (recording || sending) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      cancelRef.current = false;
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const seconds = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        chunksRef.current = [];
        if (cancelRef.current || seconds < 1 || blob.size < 1200) return;
        void send(undefined, { blob, seconds });
      };
      recorderRef.current = rec;
      startedAtRef.current = Date.now();
      setElapsed(0);
      rec.start();
      setRecording(true);
      stopTimer();
      timerRef.current = window.setInterval(() => {
        const s = Math.round((Date.now() - startedAtRef.current) / 1000);
        setElapsed(s);
        if (s >= 120) finishRecording();
      }, 250);
    } catch {
      notify("Microfone bloqueado", "Autorize o acesso ao microfone para enviar áudios à Wian.", "destructive");
    }
  };

  const finishRecording = () => {
    stopTimer();
    setRecording(false);
    setLocked(false);
    try {
      recorderRef.current?.state !== "inactive" && recorderRef.current?.stop();
    } catch {
      /* ignore */
    }
  };

  const cancelRecording = () => {
    cancelRef.current = true;
    finishRecording();
  };

  const onMicDown = () => {
    if (recording) return;
    void startRecording();
  };

  const onMicUp = () => {
    if (!recording) return;
    // Toque rápido trava a gravação (mãos livres); segurar envia ao soltar.
    if (Date.now() - startedAtRef.current < 500) {
      setLocked(true);
      return;
    }
    if (!locked) finishRecording();
  };

  const clearChat = () => {
    setMessages([]);
    writeJSON(CHAT_KEY(), []);
    inputRef.current?.focus();
  };

  const Avatar = ({ size = 30 }: { size?: number }) => (
    <img
      src={wianAvatar}
      alt="Wian, analista comercial da Wiize"
      width={size}
      height={size}
      loading="lazy"
      style={{ width: size, height: size }}
      className="shrink-0 rounded-sm object-cover ring-1 ring-border/60"
    />
  );

  const AssistantRow = ({ text, at, first }: { text: string; at: number; first: boolean }) => (
    <div className="flex gap-2.5 items-start">
      <div className={cn("w-[30px] shrink-0", !first && "opacity-0")}>{first ? <Avatar /> : <div />}</div>
      <div className="max-w-[86%] min-w-0">
        <div
          className={cn(
            "bg-muted/70 px-3.5 py-2.5 text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap break-words",
            "rounded-2xl",
            first ? "rounded-tl-sm" : "rounded-tl-sm",
          )}
        >
          {text}
        </div>
        <span className="mt-1 block text-[10px] text-muted-foreground/70">{timeLabel(at)}</span>
      </div>

    </div>
  );

  return (
    <>
      <section className="rounded-2xl border border-border/50 bg-card overflow-hidden shadow-sm">
        {/* Header estilo chat */}
        <header className="flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-card">
          <div className="relative shrink-0">
            <Avatar size={38} />
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-sm font-semibold text-foreground truncate">Wian — Briefing do dia</h2>
              <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-primary/10 text-primary text-[10px] font-semibold uppercase tracking-wide">
                <ShieldCheck size={10} /> Executivo
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground truncate">
              Analista comercial • {dateLabel} • últimos {periodDays} dias
            </p>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground" onClick={() => setShowInfo(true)} aria-label="Como funciona o briefing">
              <Info size={14} />
            </Button>
            {messages.length > 0 && !collapsed && (
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground" onClick={clearChat} aria-label="Limpar conversa">
                <RotateCcw size={13} />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground"
              onClick={() => setCollapsed((v) => !v)}
              aria-label={collapsed ? "Abrir briefing" : "Fechar briefing"}
            >
              {collapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
            </Button>
          </div>
        </header>

        {!collapsed && (
          <>
            {/* Thread */}
            <div
              ref={threadRef}
              className="max-h-[520px] overflow-y-auto scrollbar-thin px-4 py-4 space-y-3 bg-background/40"
            >
              <div className="flex justify-center">
                <span className="px-2.5 py-1 rounded-sm bg-muted/70 text-[10px] font-medium text-muted-foreground">
                  Hoje • {dateLabel}
                </span>
              </div>

              {briefing.map((text, i) => (
                <AssistantRow key={`b-${i}`} text={text} at={briefingAt} first={i === 0} />
              ))}

              {messages.map((m, i) =>
                m.role === "assistant" ? (
                  <AssistantRow key={`m-${i}`} text={m.content} at={m.at} first />
                ) : (
                  <div key={`m-${i}`} className="flex justify-end">
                    <div className="max-w-[86%] min-w-0">
                      <div className="rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words">
                        {m.audioUrl ? (
                          <BriefingAudioBubble
                            src={m.audioUrl}
                            seconds={m.audioSeconds}
                            avatarUrl={profile?.avatar_url}
                            initials={initials}
                            transcript={m.content?.startsWith("🎤") ? null : m.content}
                          />
                        ) : (
                          m.content
                        )}
                      </div>
                      <span className="mt-1 block text-right text-[10px] text-muted-foreground/70">{timeLabel(m.at)}</span>
                    </div>
                  </div>
                ),
              )}

              {sending && (
                <div className="flex gap-2.5 items-start">
                  <Avatar />
                  <div className="rounded-2xl rounded-tl-sm bg-muted/70 px-3.5 py-3 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" />
                  </div>
                </div>
              )}
            </div>


            {/* Composer */}
            <div className="border-t border-border/50 bg-card">
              {/* Mensagens rápidas — somem enquanto o gestor digita ou grava */}
              {!input.trim() && !recording && (
                <div className="px-3 pt-2.5">
                  <button
                    type="button"
                    onClick={() => setShowQuick((v) => !v)}
                    className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Zap size={12} className="text-primary" />
                    Mensagens rápidas
                    {showQuick ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                  {showQuick && (
                    <div className="mt-2 flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
                      {SUGGESTIONS.filter(
                        (s) =>
                          !s.requires ||
                          (s.requires === "opportunities" ? caps.opportunities : caps.sdr),
                      ).map((s) => (
                        <button
                          key={s.shortcut}
                          type="button"
                          disabled={sending}
                          onClick={() => send(s.label)}
                          className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm border border-border/60 bg-muted/40 hover:bg-muted hover:border-primary/40 transition-colors disabled:opacity-50"
                        >
                          <code className="text-[10px] font-mono font-semibold text-primary">/{s.shortcut}</code>
                          <span className="text-xs text-foreground/80 whitespace-nowrap">{s.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
                className="p-3 pt-2.5 flex items-end gap-2"
              >
                {recording ? (
                  <div className="flex-1 min-w-0 h-10 flex items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/5 px-3">
                    <button
                      type="button"
                      onClick={cancelRecording}
                      className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                      aria-label="Cancelar gravação"
                    >
                      <Trash2 size={16} />
                    </button>
                    <span className="w-2 h-2 rounded-full bg-destructive animate-pulse shrink-0" />
                    <span className="text-sm font-mono tabular-nums text-foreground/80 shrink-0">
                      {Math.floor(elapsed / 60)}:{(elapsed % 60).toString().padStart(2, "0")}
                    </span>
                    <div className="flex-1 min-w-0 flex items-center gap-[2px] overflow-hidden">
                      {Array.from({ length: 28 }).map((_, i) => (
                        <span
                          key={i}
                          className="flex-1 rounded-full bg-destructive/50 animate-pulse"
                          style={{
                            height: `${6 + ((i * 7 + elapsed * 3) % 16)}px`,
                            animationDelay: `${(i % 6) * 0.08}s`,
                          }}
                        />
                      ))}
                    </div>
                    <span className="hidden sm:flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
                      {locked ? (
                        <>
                          <Lock size={10} /> Travado
                        </>
                      ) : (
                        "Solte para enviar"
                      )}
                    </span>
                  </div>
                ) : (
                  <div className="flex-1 min-w-0 rounded-xl border border-border/60 bg-background focus-within:border-primary/50 transition-colors">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          send();
                        }
                      }}
                      rows={1}
                      placeholder="Pergunte à Wian sobre suas métricas, CRM, vendas ou SDR..."
                      className="w-full resize-none bg-transparent px-3 py-2.5 text-sm leading-relaxed outline-none placeholder:text-muted-foreground/70 max-h-[120px] overflow-y-auto scrollbar-thin"
                      disabled={sending}
                      maxLength={600}
                    />
                  </div>
                )}

                {input.trim() && !recording ? (
                  <Button
                    type="submit"
                    size="sm"
                    className="h-10 w-10 p-0 rounded-sm shrink-0"
                    disabled={sending}
                    aria-label="Enviar"
                  >
                    {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant={recording ? "destructive" : "default"}
                    className={cn("h-10 w-10 p-0 rounded-sm shrink-0 transition-transform", recording && "scale-110")}
                    disabled={sending}
                    onPointerDown={onMicDown}
                    onPointerUp={onMicUp}
                    onPointerLeave={() => {
                      if (recording && !locked) onMicUp();
                    }}
                    onClick={() => {
                      if (recording && locked) finishRecording();
                    }}
                    aria-label={recording ? "Enviar áudio" : "Gravar áudio"}
                    title="Segure para gravar e solte para enviar · toque rápido para travar"
                  >
                    {sending ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : recording && locked ? (
                      <Send size={15} />
                    ) : (
                      <Mic size={15} />
                    )}
                  </Button>
                )}
              </form>

              <p className="px-3 pb-3 -mt-1 text-[10px] text-muted-foreground/80">
                A Wian analisa cockpit, CRM, atendimento, campanhas{caps.opportunities ? ", prospecção" : ""}
                {caps.sdr ? ", SDR Inteligente" : ""} e agenda desta conta ({caps.planName}). Disponível apenas para
                owner e administradores.
              </p>
            </div>
          </>
        )}
      </section>

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
              Na conversa ela enxerga também o CRM (contatos, etapas, score e pipeline em R$), as vendas registradas,
              a performance do SDR Inteligente, os próximos compromissos da Agenda e o score de maturidade da conta.
            </p>
            <p>
              Os emojis indicam severidade: 🔴 crítico, 🟡 atenção, 🟢 positivo e ✅ ponto que estava pendente ontem e
              foi resolvido.
            </p>
            <p>
              O histórico dos últimos 7 dias fica salvo neste navegador para comparar tendências, e o estilo das
              respostas se adapta ao seu perfil conforme você conversa com ela.
            </p>
            <p>
              Por conter dados financeiros e estratégicos, o briefing é exclusivo para o owner e administradores da
              conta.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
