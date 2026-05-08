import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Star, Loader2, User, Paperclip, X, ImageIcon } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const AiAvatar = () => (
  <div className="w-7 h-7 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0">
    <User className="w-4 h-4" />
  </div>
);

type Msg = { role: "user" | "ai"; content: string; image?: string };
type Phase = "chat" | "ask-resolved" | "rate" | "collect-info" | "done-resolved" | "done-escalated";

const STORAGE_KEY = "wian_chat_v2";
const RESPONSE_DELAY_MS = 10000;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4MB

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveState(s: { ticketId: string | null; messages: Msg[]; imageUsed: boolean }) {
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
      : [{ role: "ai", content: "Olá! Eu sou o Wian, atendente virtual da Wiize. Como posso ajudar você hoje? Você pode anexar **uma imagem** para mostrar o problema." }]
  );
  const [imageUsed, setImageUsed] = useState<boolean>(initial?.imageUsed ?? false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<Phase>("chat");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [extra, setExtra] = useState("");
  const [category, setCategory] = useState<string>("");
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [isAuthed, setIsAuthed] = useState(false);
  const [waitingSeconds, setWaitingSeconds] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const queueRef = useRef<{ texts: string[]; image: string | null }>({ texts: [], image: null });
  const { toast } = useToast();

  useEffect(() => {
    saveState({ ticketId, messages, imageUsed });
  }, [ticketId, messages, imageUsed]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setIsAuthed(true);
      const { data: profile } = await supabase
        .from("profiles")
        .select("name, email, phone")
        .eq("id", user.id)
        .maybeSingle();
      setName(profile?.name ?? "");
      setEmail(profile?.email ?? user.email ?? "");
      setPhone(profile?.phone ?? "");
    })();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, phase, waitingSeconds]);

  useEffect(() => {
    const handler = () => restart();
    window.addEventListener("wian:reset", handler);
    return () => window.removeEventListener("wian:reset", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const handleFile = async (file: File) => {
    if (imageUsed) {
      toast({ title: "Limite atingido", description: "Apenas 1 imagem por chamado.", variant: "destructive" });
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast({ title: "Arquivo inválido", description: "Selecione uma imagem.", variant: "destructive" });
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast({ title: "Imagem muito grande", description: "Máximo 4MB.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPendingImage(String(reader.result));
    reader.readAsDataURL(file);
  };

  const startCountdown = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setWaitingSeconds(Math.ceil(RESPONSE_DELAY_MS / 1000));
    countdownRef.current = setInterval(() => {
      setWaitingSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
  };

  const stopCountdown = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = null;
    setWaitingSeconds(0);
  };

  const flushQueue = async () => {
    const { texts, image } = queueRef.current;
    if (!texts.length && !image) return;
    queueRef.current = { texts: [], image: null };
    stopCountdown();
    setLoading(true);
    const combined = texts.join("\n\n").trim();
    try {
      const { data, error } = await supabase.functions.invoke("support-chat", {
        body: {
          ticketId,
          message: combined || "(usuário enviou apenas uma imagem)",
          history: messages.slice(-12).map((m) => ({ role: m.role, content: m.content })),
          imageDataUrl: image,
        },
      });
      if (error) {
        let serverMsg = "";
        try {
          const ctx: any = (error as any).context;
          if (ctx && typeof ctx.json === "function") {
            const j = await ctx.json();
            serverMsg = j?.error || "";
          }
        } catch {}
        throw new Error(serverMsg || error.message || "Falha ao contatar o atendimento.");
      }
      if (data?.error) throw new Error(data.error);
      if (data?.ticketId) setTicketId(data.ticketId);
      if (image) setImageUsed(true);
      setMessages((prev) => [...prev, { role: "ai", content: data.answer }]);
      if (data.escalate) setPhase("collect-info");
      else setPhase("ask-resolved");
    } catch (e: any) {
      const msg: string = e?.message || "";
      const friendly = /429|rate/i.test(msg)
        ? "Muitas mensagens em pouco tempo. Aguarde alguns segundos e tente novamente."
        : msg || "Tente novamente em instantes.";
      toast({ title: "Erro no atendimento", description: friendly, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const scheduleFlush = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    startCountdown();
    debounceRef.current = setTimeout(() => {
      void flushQueue();
    }, RESPONSE_DELAY_MS);
  };

  const send = () => {
    const text = input.trim();
    if ((!text && !pendingImage) || loading) return;
    setInput("");

    // Add to UI
    const newMsg: Msg = { role: "user", content: text || "(imagem)", image: pendingImage || undefined };
    setMessages((prev) => [...prev, newMsg]);

    // Add to queue
    if (text) queueRef.current.texts.push(text);
    if (pendingImage && !queueRef.current.image) {
      queueRef.current.image = pendingImage;
      setPendingImage(null);
    }

    scheduleFlush();
  };

  const sendNow = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    void flushQueue();
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
    if (!ticketId || !name.trim() || !email.trim() || !category) {
      toast({ title: "Preencha nome, email e tópico", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("support-escalate", {
        body: {
          ticketId,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          extra: extra.trim() || null,
          category,
        },
      });
      if (error) throw error;
      setPhase("done-escalated");
    } catch (e: any) {
      toast({ title: "Erro ao abrir chamado", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const RESET_LIMIT = 3;
  const RESET_WINDOW_MS = 60 * 60 * 1000;
  const RESET_KEY = "wian_chat_resets_v1";

  const restart = () => {
    try {
      const raw = localStorage.getItem(RESET_KEY);
      const now = Date.now();
      const arr: number[] = raw ? JSON.parse(raw) : [];
      const recent = arr.filter((t) => now - t < RESET_WINDOW_MS);
      if (recent.length >= RESET_LIMIT) {
        const oldest = recent[0];
        const waitMin = Math.ceil((RESET_WINDOW_MS - (now - oldest)) / 60000);
        toast({
          title: "Limite de reinícios atingido",
          description: `Você pode reiniciar o chat até ${RESET_LIMIT}x por hora. Tente novamente em ${waitMin} min.`,
          variant: "destructive",
        });
        return;
      }
      recent.push(now);
      localStorage.setItem(RESET_KEY, JSON.stringify(recent));
    } catch {}

    if (debounceRef.current) clearTimeout(debounceRef.current);
    stopCountdown();
    queueRef.current = { texts: [], image: null };
    localStorage.removeItem(STORAGE_KEY);
    setTicketId(null);
    setImageUsed(false);
    setPendingImage(null);
    setMessages([{ role: "ai", content: "Olá! Eu sou o Wian. Como posso ajudar?" }]);
    setPhase("chat");
    setStars(0); setComment(""); setExtra(""); setInput("");
  };

  return (
    <div className="flex flex-col h-full min-h-0">
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
                className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-100 rounded-br-md whitespace-pre-wrap"
                    : "bg-muted text-foreground rounded-bl-md"
                }`}
              >
                {m.image && (
                  <img src={m.image} alt="anexo" className="rounded-lg mb-2 max-h-48 object-contain" />
                )}
                {m.role === "ai" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_strong]:font-semibold">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                  </div>
                ) : (
                  m.content !== "(imagem)" && m.content
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {waitingSeconds > 0 && !loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center">
            <div className="text-[11px] text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full">
              Aguardando você terminar… respondo em {waitingSeconds}s ·{" "}
              <button onClick={sendNow} className="text-primary underline">enviar agora</button>
            </div>
          </motion.div>
        )}

        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-end gap-2">
            <AiAvatar />
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
            <p className="text-sm font-medium">
              {isAuthed ? "Confirme seus dados para abrir o chamado:" : "Para abrir seu chamado precisamos de algumas informações:"}
            </p>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="Tópico do chamado*" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="IA">IA / Atendimento automático</SelectItem>
                <SelectItem value="WhatsApp">WhatsApp / Aquecimento</SelectItem>
                <SelectItem value="Campanhas">Campanhas / Disparos</SelectItem>
                <SelectItem value="CRM">CRM / Leads</SelectItem>
                <SelectItem value="Financeiro">Financeiro / Pagamento</SelectItem>
                <SelectItem value="Conta">Conta / Acesso</SelectItem>
                <SelectItem value="Bug">Problema de sistema (bug)</SelectItem>
                <SelectItem value="Operacional">Dúvida operacional</SelectItem>
                <SelectItem value="Outro">Outro</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Seu nome*" value={name} onChange={(e) => setName(e.target.value)} />
            <Input type="email" placeholder="Seu email*" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input placeholder="Telefone (opcional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <Textarea placeholder="Descreva sua dúvida ou problema (opcional)" value={extra} onChange={(e) => setExtra(e.target.value)} rows={3} />
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

      {(phase === "chat" || phase === "ask-resolved") && (
        <div className="border-t border-border p-3 bg-background space-y-2">
          {pendingImage && (
            <div className="flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/40">
              <img src={pendingImage} alt="preview" className="w-12 h-12 rounded object-cover" />
              <div className="flex-1 text-xs text-muted-foreground flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5" /> Imagem anexada (1 por chamado)
              </div>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setPendingImage(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
          <div className="flex gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => fileRef.current?.click()}
              disabled={loading || imageUsed || !!pendingImage}
              title={imageUsed ? "Limite de 1 imagem por chamado" : "Anexar imagem"}
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            <Input
              placeholder="Digite sua mensagem…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              disabled={loading}
            />
            <Button onClick={send} disabled={loading || (!input.trim() && !pendingImage)} size="icon">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
