import { useEffect, useMemo, useRef, useState } from "react";
import { format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CornerUpLeft, Loader2, Send, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLeadNotes, type LeadNoteAuthor, type LeadNoteMessage } from "@/hooks/useLeadNotes";
import { getChatAvatarColor, getChatInitials } from "@/lib/chatAvatar";
import waChatBgUrl from "@/assets/wa-chat-bg.png";

interface Props {
  leadId?: string | null;
  className?: string;
  emptyHint?: string;
  heightClass?: string;
}

const authorLabel = (author?: LeadNoteAuthor) =>
  author?.name || author?.email?.split("@")[0] || "Usuário";

export function LeadNotesChat({ leadId, className, emptyHint, heightClass = "h-[420px]" }: Props) {
  const { notes, authors, loading, sending, currentUserId, send, remove } = useLeadNotes(leadId);
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<LeadNoteMessage | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const byId = useMemo(() => Object.fromEntries(notes.map((n) => [n.id, n])), [notes]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [notes.length]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    if (!leadId) {
      toast.error("Salve o contato no CRM antes de escrever notas");
      return;
    }
    try {
      await send(text, replyTo?.id || null);
      setDraft("");
      setReplyTo(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível enviar a nota");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await remove(id);
      toast.success("Nota removida");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível remover");
    }
  };

  const scrollToNote = (id: string) => {
    const el = document.querySelector<HTMLElement>(`[data-note-id="${id}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-primary/50");
      setTimeout(() => el.classList.remove("ring-2", "ring-primary/50"), 1200);
    }
  };

  return (
    <div className={cn("flex flex-col rounded-lg border wa-border-light wa-app-bg overflow-hidden", className)}>
      <div
        ref={scrollRef}
        className={cn("flex-1 overflow-y-auto px-3 sm:px-5 py-3 space-y-1 wa-chat-bg wa-scrollbar", heightClass)}
        style={{ ["--wa-chat-bg-pattern" as string]: `url(${waChatBgUrl})` }}
      >
        <div className="wa-chat-glow" />
        {loading && notes.length === 0 && (
          <div className="flex justify-center py-8 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        )}

        {!loading && notes.length === 0 && (
          <div className="flex justify-center py-10">
            <p className="wa-date-badge max-w-sm rounded-lg px-3 py-2 text-center text-xs leading-relaxed shadow-sm">
              {emptyHint || "Nenhuma mensagem interna ainda. Inicie a conversa com sua equipe sobre este contato."}
            </p>
          </div>
        )}

        {notes.map((note, index) => {
          const prev = notes[index - 1];
          const mine = note.user_id === currentUserId;
          const author = authors[note.user_id];
          const newDay = !prev || !isSameDay(new Date(prev.created_at), new Date(note.created_at));
          const firstOfGroup = newDay || !prev || prev.user_id !== note.user_id;
          const parent = note.reply_to_id ? byId[note.reply_to_id] : undefined;

          return (
            <div key={note.id}>
              {newDay && (
                <div className="flex justify-center my-3">
                   <span className="wa-date-badge text-[10px] uppercase tracking-wide px-2.5 py-1 rounded-lg shadow-sm">
                    {format(new Date(note.created_at), "dd 'de' MMMM yyyy", { locale: ptBR })}
                  </span>
                </div>
              )}

              <div
                className={cn(
                  "flex items-end gap-2 group",
                  mine ? "justify-end" : "justify-start",
                  firstOfGroup ? "mt-2" : "mt-0.5",
                )}
              >
                {!mine && (
                  <div className="w-7 shrink-0">
                    {firstOfGroup && (
                      <Avatar className="w-7 h-7">
                        {author?.avatar_url && <AvatarImage src={author.avatar_url} alt={authorLabel(author)} />}
                         <AvatarFallback className={cn("text-[10px] text-primary-foreground", getChatAvatarColor(note.user_id))}>
                          {getChatInitials(authorLabel(author), note.user_id)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                )}

                <div
                  data-note-id={note.id}
                  className={cn(
                     "max-w-[84%] sm:max-w-[68%] min-w-0 rounded-[7.5px] px-[9px] pt-[5px] pb-[3px] shadow-[0_1px_0.5px_rgba(11,20,26,.13)] transition-shadow",
                    mine
                       ? "wa-bubble-out"
                       : "wa-bubble-in",
                  )}
                >
                  {firstOfGroup && (
                    <p
                      className={cn(
                        "text-[11px] font-semibold mb-0.5",
                         mine ? "text-emerald-100" : "text-primary",
                      )}
                    >
                      {mine ? "Você" : authorLabel(author)}
                    </p>
                  )}

                  {parent && (
                    <button
                      type="button"
                      onClick={() => scrollToNote(parent.id)}
                      className={cn(
                        "w-full text-left mb-1 rounded-md border-l-2 px-2 py-1 text-[11px] line-clamp-2",
                        mine
                           ? "border-primary-foreground/50 bg-primary-foreground/10 wa-text-muted"
                           : "border-primary/60 bg-foreground/5 wa-text-muted",
                      )}
                    >
                      <span className="font-medium">
                        {parent.user_id === currentUserId ? "Você" : authorLabel(authors[parent.user_id])}
                      </span>
                      : {parent.content}
                    </button>
                  )}

                   <p className="text-[14.2px] leading-[18px] whitespace-pre-wrap break-words wa-text-primary">{note.content}</p>

                  <div
                    className={cn(
                      "flex items-center gap-2 mt-1",
                       "justify-end wa-text-timestamp",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setReplyTo(note)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Responder"
                    >
                      <CornerUpLeft className="w-3 h-3" />
                    </button>
                    {mine && (
                      <button
                        type="button"
                        onClick={() => handleDelete(note.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Excluir"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                    <span className="text-[10px] tabular-nums">
                      {format(new Date(note.created_at), "HH:mm")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

       <div className="border-t wa-border-light wa-input-bar p-2.5 sm:p-3">
        {replyTo && (
          <div className="flex items-start gap-2 mb-2 rounded-md bg-muted/60 border-l-2 border-primary px-2 py-1.5">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-primary">
                Respondendo {replyTo.user_id === currentUserId ? "você mesmo" : authorLabel(authors[replyTo.user_id])}
              </p>
              <p className="text-[11px] text-muted-foreground line-clamp-1">{replyTo.content}</p>
            </div>
            <button type="button" onClick={() => setReplyTo(null)} aria-label="Cancelar resposta">
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        )}

         <div className="flex items-end gap-2 rounded-lg border wa-input-border wa-input-field p-1.5">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, 4000))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={leadId ? "Escreva para a equipe..." : "Salve o contato no CRM para escrever"}
            disabled={!leadId}
             className="min-h-[40px] max-h-32 border-0 bg-transparent text-sm resize-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!draft.trim() || sending || !leadId}
             className="shrink-0 rounded-lg"
            aria-label="Enviar nota"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default LeadNotesChat;
