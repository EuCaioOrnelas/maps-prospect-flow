import { useEffect, useMemo, useRef, useState } from "react";
import { Send, Smile, X, Check, CheckCheck, AlertCircle, MessageCircle, Sparkles, Headset, FileText, RotateCcw, Reply, List, CheckCircle2 } from "lucide-react";
import { format, isSameDay, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { EmojiPicker, EmojiPickerSearch, EmojiPickerContent } from "@/components/ui/emoji-picker";
import { contrastText, type ChatWebTheme } from "@/lib/chatweb";
import { cn } from "@/lib/utils";
import doodle from "@/assets/chatweb-doodle.webp";

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

  // Texto escolhido logo após cada mensagem de opções (para marcar a opção selecionada).
  const chosen = useMemo(() => {
    const map: Record<string, string> = {};
    p.messages.forEach((m, i) => {
      if (m.message_type !== "options") return;
      const next = p.messages.slice(i + 1).find((x) => x.sender_type === "visitor");
      if (next?.content) map[m.id] = next.content;
    });
    return map;
  }, [p.messages]);
  const [listFor, setListFor] = useState<ChatWebMessage | null>(null);

  const submit = () => {
    const v = text.trim();
    if (!v || p.disabled || ended) return;
    p.onSend(v);
    setText("");
    input.current?.focus();
  };

  return (
    <div className={cn("flex flex-col h-full w-full overflow-hidden", p.className)} style={{ background: t.background, color: t.text }}>
      <header className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ background: t.header, color: contrastText(t.header) }}>
        <div className="relative">
          {p.avatarUrl ? (
            <img src={p.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" width={40} height={40} />
          ) : (
            <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ background: t.secondary, color: contrastText(t.secondary) }}>
              <Icon size={18} />
            </div>
          )}
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2" style={{ background: "#22c55e", boxShadow: `0 0 0 2px ${t.header}` }} />
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

      <div className="relative flex-1 min-h-0 flex flex-col">
      {t.pattern && <div aria-hidden className="pointer-events-none absolute inset-0" style={{
        backgroundColor: contrastText(t.background), opacity: contrastText(t.background) === "#ffffff" ? 0.06 : 0.07,
        WebkitMaskImage: `url(${doodle})`, maskImage: `url(${doodle})`, WebkitMaskSize: "360px", maskSize: "360px",
      }} />}
      <div ref={scroller} className="relative flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-1.5" role="log" aria-live="polite">
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
                    className={cn("max-w-[82%] rounded-xl text-[14px] leading-snug shadow-[0_1px_0.5px_rgba(0,0,0,0.13)]", mine ? "rounded-tr-sm" : "rounded-tl-sm", ["image", "video"].includes(m.message_type) ? "p-1" : "px-2.5 py-1.5")}
                    style={{ background: bg, color: fg }}
                  >
                    {m.metadata?.header && <p className="font-semibold mb-1">{m.metadata.header}</p>}
                    {m.message_type === "image" && safeUrl(m.metadata?.url) && (
                      <a href={safeUrl(m.metadata?.url)!} target="_blank" rel="noopener noreferrer" className="block">
                        <img src={safeUrl(m.metadata?.url)!} alt="" loading="lazy" className="rounded-lg w-full max-w-[280px] max-h-72 object-cover bg-black/5" />
                      </a>
                    )}
                    {m.message_type === "video" && safeUrl(m.metadata?.url) && (
                      <video src={safeUrl(m.metadata?.url)!} controls preload="metadata" className="rounded-lg w-full max-w-[280px] max-h-72 bg-black" />
                    )}
                    {(m.message_type === "document" || m.message_type === "audio") && safeUrl(m.metadata?.url) && (
                      <a href={safeUrl(m.metadata?.url)!} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 underline mb-1">
                        <FileText size={16} /> {m.metadata?.filename || "Abrir arquivo"}
                      </a>
                    )}
                    {m.content && <p className={cn("whitespace-pre-wrap break-words", ["image", "video"].includes(m.message_type) && "px-1.5 pt-1")}><Linkified text={m.content} /></p>}
                    {m.metadata?.footer && <p className="text-xs opacity-70 mt-1">{m.metadata.footer}</p>}
                    <div className={cn("flex items-center justify-end gap-1 mt-0.5 text-[10px] opacity-60", ["image", "video"].includes(m.message_type) && "px-1.5 pb-0.5")}>
                      {format(d, "HH:mm")}
                      {mine && (m.local_status === "sending" ? <Check size={12} /> : m.local_status === "error" ? <AlertCircle size={12} /> : <CheckCheck size={12} />)}
                    </div>
                  </div>
                </div>
              )}
              {m.message_type === "options" && m.metadata?.options?.length ? (() => {
                const open = m.id === activeOptionsId && !p.disabled && !ended;
                const picked = chosen[m.id];
                if (m.metadata?.style === "list") {
                  return (
                    <div className="mt-[3px] mb-1 max-w-[82%] min-w-[220px] w-fit">
                      <button disabled={!open} onClick={() => setListFor(m)}
                        className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[14px] font-semibold shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] transition-colors enabled:hover:brightness-[0.97] disabled:cursor-default"
                        style={{ background: t.receivedBubble, color: t.primary }}>
                        <List size={16} />{picked ? `Selecionado: ${picked}` : "Ver opções"}
                      </button>
                    </div>
                  );
                }
                return t.optionStyle === "whatsapp" ? (
                  <div className="flex flex-col gap-[3px] mt-[3px] mb-1 max-w-[82%] min-w-[220px] w-fit">
                    {m.metadata!.options!.map((o) => {
                      const sel = picked === o.title;
                      return (
                        <button key={o.id} disabled={!open} onClick={() => p.onOption?.(o)} title={o.description || undefined}
                          className="flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[14px] font-semibold shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] transition-all enabled:hover:brightness-[0.96] enabled:active:scale-[0.99] disabled:cursor-default"
                          style={{ background: t.receivedBubble, color: t.primary, opacity: !open && picked && !sel ? 0.75 : 1 }}>
                          {sel ? <CheckCircle2 size={16} /> : <Reply size={16} />}{o.title}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 mt-2 mb-1 pl-1">
                    {m.metadata!.options!.map((o) => {
                      const sel = picked === o.title;
                      return (
                        <button key={o.id} disabled={!open} onClick={() => p.onOption?.(o)} title={o.description || undefined}
                          className="text-sm px-4 py-2 rounded-full border-[1.5px] font-semibold transition-all enabled:hover:-translate-y-px disabled:cursor-default text-left"
                          style={sel ? { borderColor: t.primary, color: contrastText(t.primary), background: t.primary } : { borderColor: t.primary, color: t.primary, background: t.receivedBubble, opacity: !open && picked ? 0.75 : 1 }}>
                          {o.title}
                        </button>
                      );
                    })}
                  </div>
                );
              })() : null}
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

      {listFor && (
        <div className="absolute inset-0 z-20 flex flex-col justify-end bg-black/40 animate-in fade-in duration-150" onClick={() => setListFor(null)}>
          <div className="rounded-t-2xl max-h-[75%] flex flex-col animate-in slide-in-from-bottom-4 duration-200" style={{ background: t.inputBackground, color: contrastText(t.inputBackground) }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 px-4 py-3 border-b border-black/10">
              <button onClick={() => setListFor(null)} aria-label="Fechar" className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-black/5"><X size={18} /></button>
              <p className="font-semibold text-[15px] truncate">{listFor.metadata?.header || "Escolha uma opção"}</p>
            </div>
            <div className="overflow-y-auto py-1">
              {listFor.metadata?.options?.map((o) => (
                <button key={o.id} onClick={() => { setListFor(null); p.onOption?.(o); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-black/5 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-medium truncate">{o.title}</p>
                    {o.description && <p className="text-xs opacity-60 line-clamp-2">{o.description}</p>}
                  </div>
                  <span className="h-5 w-5 rounded-full border-2 shrink-0" style={{ borderColor: t.primary }} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {ended ? (
        <div className="relative m-3 mt-1 p-3 text-center text-sm rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] shrink-0" style={{ background: t.inputBackground, color: contrastText(t.inputBackground) }}>
          <p className="opacity-80">Este atendimento foi encerrado.</p>
          {t.whatsapp && (
            <a href={`https://wa.me/${t.whatsapp}`} target="_blank" rel="noopener noreferrer"
              className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ background: "#25D366", color: "#ffffff" }}>
              <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.05 21.5h-.01a9.4 9.4 0 0 1-4.8-1.32l-.34-.2-3.57.94.95-3.48-.22-.36a9.4 9.4 0 1 1 7.99 4.42m8.02-17.43A11.27 11.27 0 0 0 12.04.75C5.8.75.72 5.83.72 12.08c0 2 .52 3.95 1.52 5.67L.62 23.25l5.64-1.48a11.3 11.3 0 0 0 5.78 1.47h.01c6.25 0 11.33-5.08 11.33-11.33 0-3.03-1.18-5.87-3.31-8.01"/></svg>
              Voltar para o WhatsApp
            </a>
          )}
          {p.onRestart && (
            <button onClick={p.onRestart} className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: t.primary }}>
              <RotateCcw size={14} /> Iniciar nova conversa
            </button>
          )}
        </div>
      ) : (
        <div className="relative flex items-end gap-2 px-3 pb-3 pt-1 shrink-0">
          <div className="flex-1 flex items-center gap-1 rounded-[24px] pl-1.5 pr-3 min-h-[46px] shadow-[0_1px_2px_rgba(0,0,0,0.08),0_2px_8px_-2px_rgba(0,0,0,0.06)]" style={{ background: t.inputBackground }}>
          <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
            <PopoverTrigger asChild>
              <button aria-label="Emojis" className="h-[38px] w-[38px] self-end mb-1 shrink-0 rounded-full flex items-center justify-center opacity-70 hover:opacity-100" style={{ color: contrastText(t.inputBackground) }}>
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
            className="flex-1 resize-none bg-transparent outline-none text-[15px] leading-5 py-[13px] max-h-32 block"
            style={{ color: contrastText(t.inputBackground) }}
            aria-label="Mensagem"
          />
          </div>
          <button
            onClick={submit}
            disabled={!text.trim() || p.disabled}
            aria-label="Enviar"
            className="h-[46px] w-[46px] shrink-0 rounded-full flex items-center justify-center shadow-[0_1px_3px_rgba(0,0,0,0.15)] transition-all hover:brightness-105 active:scale-95 disabled:opacity-90"
            style={{ background: t.primary, color: contrastText(t.primary) }}
          >
            <Send size={18} className="ml-0.5" />
          </button>
        </div>
      )}
      </div>
    </div>
  );
}
