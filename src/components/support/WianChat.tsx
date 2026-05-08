import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Star, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const AiAvatar = () => (
  <div className="w-7 h-7 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0">
    <User className="w-4 h-4" />
  </div>
);

type Msg = { role: "user" | "ai"; content: string };
type Phase = "chat" | "ask-resolved" | "rate" | "collect-info" | "done-resolved" | "done-escalated";

const STORAGE_KEY = "wian_chat_v1";

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveState(s: { ticketId: string | null; messages: Msg[] }) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {}
}

export function WianChat() {
  const initial = loadState();
  const [ticketId, setTicketId] = useState<string | null>(initial?.ticketId ?? null);
  const [messages, setMessages] = useState<Msg[]>(
    initial?.messages?.length
      ? initial.messages
      : [{ role: "ai", content: "Olá! Eu sou o Wian, atendente virtual da Wiize. Como posso ajudar você hoje?" }]
  );
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<Phase>("chat");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [extra, setExtra] = useState("");
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    saveState({ ticketId, messages });
  }, [ticketId, messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, phase]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("support-chat", {
        body: { ticketId, message: text, history: messages.slice(-8) },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.ticketId) setTicketId(data.ticketId);
      setMessages((prev) => [...prev, { role: "ai", content: data.answer }]);
      if (data.escalate) {
        setPhase("collect-info");
      } else {
        setPhase("ask-resolved");
      }
    } catch (e: any) {
      toast({
        title: "Erro no atendimento",
        description: e?.message || "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const onResolved = (resolved: boolean) => {
    if (resolved) {
      setPhase("rate");
    } else {
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: "Sem problema. Vou conectar você com o nosso time. Preciso só de alguns dados rápidos." },
      ]);
      setPhase("collect-info");
    }
  };

  const submitRating = async () => {
    if (!stars || !ticketId) return;
    try {
      await supabase.from("support_ratings").insert({ ticket_id: ticketId, stars, comment, resolved_by: "ai" });
      await supabase.from("support_tickets").update({ status: "resolved", resolved_by: "ai", resolved_at: new Date().toISOString() }).eq("id", ticketId);
      toast({ title: "Obrigado pela avaliação!" });
      setPhase("done-resolved");
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const submitEscalation = async () => {
    if (!ticketId || !name.trim() || !email.trim()) {
      toast({ title: "Preencha nome e email", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("support-escalate", {
        body: { ticketId, name: name.trim(), email: email.trim(), phone: phone.trim() || null, extra: extra.trim() || null },
      });
      if (error) throw error;
      setPhase("done-escalated");
    } catch (e: any) {
      toast({ title: "Erro ao abrir chamado", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const restart = () => {
    localStorage.removeItem(STORAGE_KEY);
    setTicketId(null);
    setMessages([{ role: "ai", content: "Olá! Eu sou o Wian. Como posso ajudar?" }]);
    setPhase("chat");
    setStars(0); setComment(""); setName(""); setEmail(""); setPhone(""); setExtra("");
  };

  return (
    <div className="flex flex-col h-full min-h-[420px]">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-background/30">
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex items-end gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {m.role === "ai" && <AiAvatar />}
              <div
                className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-100 rounded-br-md"
                    : "bg-muted text-foreground rounded-bl-md"
                }`}
              >
                {m.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-end gap-2">
            <img src={logoIcon} alt="Wian" className="w-7 h-7 rounded-md" />
            <div className="bg-muted rounded-2xl rounded-bl-md px-3.5 py-2.5">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-foreground/50 rounded-full animate-bounce" />
                <span className="w-1.5 h-1.5 bg-foreground/50 rounded-full animate-bounce [animation-delay:120ms]" />
                <span className="w-1.5 h-1.5 bg-foreground/50 rounded-full animate-bounce [animation-delay:240ms]" />
                <span className="ml-2 text-xs text-muted-foreground">Wian está digitando…</span>
              </div>
            </div>
          </motion.div>
        )}

        {phase === "ask-resolved" && !loading && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center gap-2 pt-1">
            <Button size="sm" variant="default" onClick={() => onResolved(true)}>Sim, resolveu</Button>
            <Button size="sm" variant="outline" onClick={() => onResolved(false)}>Não resolveu</Button>
          </motion.div>
        )}

        {phase === "rate" && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card p-4 space-y-3">
            <p className="text-sm font-medium">Como foi o atendimento?</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setStars(n)} className="p-1">
                  <Star className={`w-6 h-6 ${n <= stars ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                </button>
              ))}
            </div>
            <Textarea placeholder="Comentário (opcional)" value={comment} onChange={(e) => setComment(e.target.value)} rows={2} />
            <Button size="sm" onClick={submitRating} disabled={!stars}>Enviar avaliação</Button>
          </motion.div>
        )}

        {phase === "collect-info" && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card p-4 space-y-2.5">
            <p className="text-sm font-medium">Para abrir seu chamado precisamos de:</p>
            <Input placeholder="Seu nome*" value={name} onChange={(e) => setName(e.target.value)} />
            <Input type="email" placeholder="Seu email*" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input placeholder="Telefone (opcional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <Textarea placeholder="Algum detalhe adicional? (opcional)" value={extra} onChange={(e) => setExtra(e.target.value)} rows={2} />
            <Button size="sm" onClick={submitEscalation} disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Abrir chamado
            </Button>
          </motion.div>
        )}

        {phase === "done-resolved" && (
          <div className="text-center py-4 text-sm text-muted-foreground">
            Atendimento finalizado. <button onClick={restart} className="text-primary underline">Iniciar novo</button>
          </div>
        )}

        {phase === "done-escalated" && (
          <div className="rounded-xl bg-primary/10 border border-primary/20 p-4 text-center text-sm">
            ✅ Chamado aberto! Nossa equipe entrará em contato pelo email informado em até 24h úteis.
            <div className="mt-2"><button onClick={restart} className="text-primary underline">Novo atendimento</button></div>
          </div>
        )}
      </div>

      {/* Input */}
      {(phase === "chat" || phase === "ask-resolved") && (
        <div className="border-t border-border p-3 bg-background">
          <div className="flex gap-2">
            <Input
              placeholder="Digite sua mensagem…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              disabled={loading}
            />
            <Button onClick={send} disabled={loading || !input.trim()} size="icon">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
