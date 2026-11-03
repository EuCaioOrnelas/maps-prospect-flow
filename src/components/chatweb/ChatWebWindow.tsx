import { useEffect, useMemo, useRef, useState } from "react";
import { Send, Smile, X, Check, CheckCheck, AlertCircle, MessageCircle, Sparkles, Headset, FileText, RotateCcw } from "lucide-react";
import { format, isSameDay, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { EmojiPicker, EmojiPickerSearch, EmojiPickerContent } from "@/components/ui/emoji-picker";
import { contrastText, type ChatWebTheme } from "@/lib/chatweb";
import { cn } from "@/lib/utils";

export interface ChatWebOption { id: string; title: string; description?: string | null }
export interface ChatWebMessage {
  id: string;
  sender_type: "visitor" | "bot" | "agent" | "system";
  message_type: string;
  content: string | null;
  metadata?: { options?: ChatWebOption[]; style?: string; header?: string | null; footer?: string | null; url?: string; filename?: string | null };
  created_at: string;
  local_status?: "sending" | "sent" | "error";
}

interface Props {
  name: string;
  description?: string | null;
  avatarUrl?: string | null;
  theme: ChatWebTheme;
  placeholder?: string | null;
  messages: ChatWebMessage[];
  typing?: boolean;
  status?: string;
  onSend: (text: string) => void;
  onOption?: (opt: ChatWebOption) => void;
  onClose?: () => void;
  onRestart?: () => void;
  disabled?: boolean;
  className?: string;
}

const ICONS = { message: MessageCircle, sparkles: Sparkles, headset: Headset };

/** Só permite links http(s) — evita javascript: e afins. */
function safeUrl(u?: string) {
  try { const x = new URL(String(u || "")); return x.protocol === "https:" || x.protocol === "http:" ? x.href : null; } catch { return null; }
}

/** Texto puro com links clicáveis (sem HTML do remetente). */
function Linkified({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return (
    <>
      {parts.map((p, i) => {
        const url = /^https?:\/\//.test(p) ? safeUrl(p) : null;
        return url ? <a key={i} href={url} target="_blank" rel="noopener noreferrer nofollow" className="underline break-all">{p}</a> : <span key={i}>{p}</span>;
      })}
    </>
  );
}

function dayLabel(d: Date) {
  if (isToday(d)) return "Hoje";
  if (isYesterday(d)) return "Ontem";
  return format(d, "d 'de' MMMM", { locale: ptBR });
}

export function ChatWebWindow(p: Props) {
  const [text, setText] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const t = p.theme;
  const Icon = ICONS[t.icon] || MessageCircle;
  const ended = p.status && !["active", "handoff"].includes(p.status);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [p.messages.length, p.typing]);

  // Botões só ficam clicáveis na última mensagem de opções sem resposta depois dela.
  const activeOptionsId = useMemo(() => {
    for (let i = p.messages.length - 1; i >= 0; i--) {
      const m = p.messages[i];
      if (m.sender_type === "visitor") return null;
      if (m.message_type === "options") return m.id;
    }
    return null;
  }, [p.messages]);

  const submit = () => {
    const v = text.trim();
    if (!v || p.disabled || ended) return;
    p.onSend(v);
    setText("");
    input.current?.focus();
  };

  return (
    <div className={cn("flex flex-col h-full w-full overflow-hidden", p.className)} style={{ background: t.background, color: t.text }}>
      <header className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ background: t.primary, color: contrastText(t.primary) }}>
        <div className="relative">
          {p.avatarUrl ? (
            <img src={p.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" width={40} height={40} />
          ) : (
            <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ background: t.secondary, color: contrastText(t.secondary) }}>
              <Icon size={18} />
            </div>
          )}
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2" style={{ background: "#22c55e", boxShadow: `0 0 0 2px ${t.primary}` }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm truncate">{p.name}</p>
          <p className="text-xs opacity-80 truncate">{p.typing ? "digitando…" : p.description || "Online"}</p>
        </div>
        {p.onClose && (
          <button onClick={p.onClose} aria-label="Fechar chat" className="h-8 w-8 rounded-full flex items-center justify-center hover:opacity-80">
            <X size={18} />
          </button>
        )}
      </header>

      <div ref={scroller} className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5" role="log" aria-live="polite">
        {p.messages.map((m, i) => {
          const d = new Date(m.created_at);
          const prev = p.messages[i - 1];
          const showDay = !prev || !isSameDay(new Date(prev.created_at), d);
          const mine = m.sender_type === "visitor";
          const bg = mine ? t.sentBubble : t.receivedBubble;
          const fg = contrastText(bg);
          return (
            <div key={m.id}>
              {showDay && (
                <div className="flex justify-center my-3">
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-black/5" style={{ color: t.text }}>{dayLabel(d)}</span>
                </div>
              )}
              {m.sender_type === "system" ? (
                <p className="text-center text-xs opacity-70 my-2">{m.content}</p>
              ) : (
                <div className={cn("flex animate-in fade-in slide-in-from-bottom-1 duration-200", mine ? "justify-end" : "justify-start")}>
                  <div
                    className={cn("max-w-[82%] rounded-2xl px-3 py-2 text-sm shadow-sm", mine ? "rounded-br-md" : "rounded-bl-md")}
                    style={{ background: bg, color: fg }}
                  >
                    {m.metadata?.header && <p className="font-semibold mb-1">{m.metadata.header}</p>}
                    {m.message_type === "image" && safeUrl(m.metadata?.url) && (
                      <img src={safeUrl(m.metadata?.url)!} alt="" loading="lazy" className="rounded-lg mb-1 max-h-64 object-cover" />
                    )}
                    {m.message_type === "video" && safeUrl(m.metadata?.url) && (
                      <video src={safeUrl(m.metadata?.url)!} controls preload="metadata" className="rounded-lg mb-1 max-h-64" />
                    )}
                    {(m.message_type === "document" || m.message_type === "audio") && safeUrl(m.metadata?.url) && (
                      <a href={safeUrl(m.metadata?.url)!} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 underline mb-1">
                        <FileText size={16} /> {m.metadata?.filename || "Abrir arquivo"}
                      </a>
                    )}
                    {m.content && <p className="whitespace-pre-wrap break-words"><Linkified text={m.content} /></p>}
                    {m.metadata?.footer && <p className="text-xs opacity-70 mt-1">{m.metadata.footer}</p>}
                    <div className="flex items-center justify-end gap-1 mt-0.5 text-[10px] opacity-70">
                      {format(d, "HH:mm")}
                      {mine && (m.local_status === "sending" ? <Check size={12} /> : m.local_status === "error" ? <AlertCircle size={12} /> : <CheckCheck size={12} />)}
                    </div>
                  </div>
                </div>
              )}
              {m.message_type === "options" && m.metadata?.options?.length ? (
                <div className="flex flex-wrap gap-2 mt-2 mb-1 pl-1">
                  {m.metadata.options.map((o) => (
                    <button
                      key={o.id}
                      disabled={m.id !== activeOptionsId || p.disabled || !!ended}
                      onClick={() => p.onOption?.(o)}
                      className="text-sm px-3.5 py-2 rounded-full border transition-all hover:-translate-y-px disabled:opacity-50 disabled:hover:translate-y-0 text-left"
                      style={{ borderColor: t.primary, color: t.primary, background: t.receivedBubble }}
                      title={o.description || undefined}
                    >
                      {o.title}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
        {p.typing && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md px-3 py-2.5 shadow-sm flex gap-1" style={{ background: t.receivedBubble }} aria-label="digitando">
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-1.5 w-1.5 rounded-full animate-bounce" style={{ background: contrastText(t.receivedBubble), animationDelay: `${i * 120}ms`, opacity: 0.5 }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {ended ? (
        <div className="p-3 text-center text-sm border-t border-black/5 shrink-0" style={{ background: t.receivedBubble, color: contrastText(t.receivedBubble) }}>
          <p className="opacity-80">Este atendimento foi encerrado.</p>
          {p.onRestart && (
            <button onClick={p.onRestart} className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: t.primary }}>
              <RotateCcw size={14} /> Iniciar nova conversa
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-end gap-2 p-2.5 border-t border-black/5 shrink-0" style={{ background: t.receivedBubble }}>
          <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
            <PopoverTrigger asChild>
              <button aria-label="Emojis" className="h-10 w-10 shrink-0 rounded-full flex items-center justify-center opacity-70 hover:opacity-100" style={{ color: contrastText(t.receivedBubble) }}>
                <Smile size={20} />
              </button>
            </PopoverTrigger>
            <PopoverContent side="top" align="start" className="w-[300px] p-0">
              <EmojiPicker className="h-[300px]" onEmojiSelect={({ emoji }) => { setText((v) => v + emoji); input.current?.focus(); }}>
                <EmojiPickerSearch placeholder="Pesquisar emoji" />
                <EmojiPickerContent />
              </EmojiPicker>
            </PopoverContent>
          </Popover>
          <textarea
            ref={input}
            rows={1}
            value={text}
            maxLength={2000}
            disabled={p.disabled}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
            placeholder={p.placeholder || "Digite sua mensagem..."}
            className="flex-1 resize-none bg-transparent outline-none text-sm py-2.5 max-h-32"
            style={{ color: contrastText(t.receivedBubble) }}
            aria-label="Mensagem"
          />
          <button
            onClick={submit}
            disabled={!text.trim() || p.disabled}
            aria-label="Enviar"
            className="h-10 w-10 shrink-0 rounded-full flex items-center justify-center transition-opacity disabled:opacity-40"
            style={{ background: t.primary, color: contrastText(t.primary) }}
          >
            <Send size={17} />
          </button>
        </div>
      )}
    </div>
  );
}
