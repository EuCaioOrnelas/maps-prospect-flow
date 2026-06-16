import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, RotateCcw, Loader2, FlaskConical } from "lucide-react";
import coreMarkAsset from "@/assets/equipe-core-mark.png.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ChatMsg { role: "user" | "assistant"; content: string }

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  equipeId: string;
  equipeName: string;
}

export function EquipeTestChatDialog({ open, onOpenChange, equipeId, equipeName }: Props) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending]);

  function reset() {
    setMessages([]);
    setInput("");
  }

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("equipe-ia-test", {
        body: { equipeId, messages: next },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setMessages((m) => [...m, { role: "assistant", content: data?.reply || "(sem resposta)" }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao enviar");
      setMessages((m) => m.slice(0, -1));
      setInput(text);
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden bg-card border-border/60">
        <DialogHeader className="px-5 py-3 border-b flex flex-row items-center justify-between gap-2 space-y-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center shrink-0 shadow-[0_4px_12px_-4px_hsl(var(--primary)/0.5)]">
              <img src={coreMarkAsset.url} alt="" className="size-7 select-none" draggable={false} />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-sm font-semibold truncate">{equipeName}</DialogTitle>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <FlaskConical className="size-3" /> Modo teste
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={reset} className="text-xs">
            <RotateCcw className="size-3.5 mr-1" /> Resetar
          </Button>
        </DialogHeader>

        <ScrollArea className="h-[420px]">
          <div ref={scrollRef} className="p-4 space-y-3 scrollbar-thin">
            {messages.length === 0 && (
              <div className="text-center py-10 text-muted-foreground">
                <Brain className="size-8 mx-auto opacity-30" />
                <p className="text-xs mt-2">Inicie uma conversa com o colaborador.</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm",
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-muted text-muted-foreground rounded-2xl rounded-bl-sm px-3.5 py-2 text-sm flex items-center gap-2">
                  <Loader2 className="size-3.5 animate-spin" /> pensando…
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-3 border-t flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Digite uma mensagem…"
            disabled={sending}
            className="text-sm"
          />
          <Button onClick={send} disabled={sending || !input.trim()} size="icon">
            <Send className="size-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
