import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Star, Loader2, User, Paperclip, X, FileText, Image as ImageIcon, Check } from "lucide-react";
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

type Attachment = {
  name: string;
  type: string;
  size: number;
  dataUrl?: string; // for images
  textContent?: string; // for text files
};

type Msg = { role: "user" | "ai"; content: string; attachments?: Attachment[] };
type Phase = "chat" | "ask-resolved" | "rate" | "collect-info" | "done-resolved" | "done-escalated";

const STORAGE_KEY = "wian_chat_v3";
const RESPONSE_DELAY_MS = 10000;
const MAX_FILE_BYTES = 4 * 1024 * 1024; // 4MB
const MAX_ATTACHMENTS_PER_SEND = 3;
const TEXT_MIME_PREFIXES = ["text/"];
const TEXT_EXTENSIONS = [".txt", ".md", ".csv", ".json", ".log", ".xml", ".yaml", ".yml", ".html", ".css", ".js", ".ts", ".tsx", ".jsx", ".py", ".sql"];

function isTextFile(file: File) {
  if (TEXT_MIME_PREFIXES.some((p) => file.type.startsWith(p))) return true;
  if (file.type === "application/json" || file.type === "application/xml") return true;
  const lower = file.name.toLowerCase();
  return TEXT_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

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
      : [{ role: "ai", content: "Oi! Eu sou o **Wian** 👋, atendente virtual da Wiize. Me conta o que está acontecendo — pode anexar imagens ou arquivos (até 3) e até colar do clipboard." }]
  );
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
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
  const [showConfirmSend, setShowConfirmSend] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const queueRef = useRef<{ texts: string[]; attachments: Attachment[] }>({ texts: [], attachments: [] });
  const { toast } = useToast();

  useEffect(() => {
    // strip dataUrls from messages before saving (avoid huge localStorage)
    const lite = messages.map((m) => ({
      ...m,
      attachments: m.attachments?.map((a) => ({ ...a, dataUrl: undefined, textContent: undefined })),
    }));
    saveState({ ticketId, messages: lite });
  }, [ticketId, messages]);

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
  }, [messages, loading, phase, waitingSeconds, showConfirmSend]);

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

  const readFile = (file: File): Promise<Attachment | null> => {
    return new Promise((resolve) => {
      if (file.size > MAX_FILE_BYTES) {
        toast({ title: `${file.name}: muito grande`, description: "Máximo 4MB por arquivo.", variant: "destructive" });
        resolve(null);
        return;
      }
      const att: Attachment = { name: file.name || "arquivo", type: file.type, size: file.size };
      if (file.type.startsWith("image/")) {
        const r = new FileReader();
        r.onload = () => { att.dataUrl = String(r.result); resolve(att); };
        r.onerror = () => resolve(null);
        r.readAsDataURL(file);
      } else if (isTextFile(file)) {
        const r = new FileReader();
        r.onload = () => { att.textContent = String(r.result).slice(0, 50_000); resolve(att); };
        r.onerror = () => resolve(null);
        r.readAsText(file);
      } else {
        resolve(att); // metadata only
      }
    });
  };

  const addFiles = async (files: File[]) => {
    const remaining = MAX_ATTACHMENTS_PER_SEND - pendingAttachments.length;
    if (remaining <= 0) {
      toast({ title: "Limite atingido", description: `Máximo ${MAX_ATTACHMENTS_PER_SEND} anexos por envio.`, variant: "destructive" });
      return;
    }
    const slice = files.slice(0, remaining);
    const results = await Promise.all(slice.map(readFile));
    const ok = results.filter((a): a is Attachment => !!a);
    if (ok.length) setPendingAttachments((prev) => [...prev, ...ok]);
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData?.items ?? []);
    const files: File[] = [];
    for (const it of items) {
      if (it.kind === "file") {
        const f = it.getAsFile();
        if (f) files.push(f);
      }
    }
    if (files.length) {
      e.preventDefault();
      await addFiles(files);
    }
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
    const { texts, attachments } = queueRef.current;
    if (!texts.length && !attachments.length) return;
    queueRef.current = { texts: [], attachments: [] };
    stopCountdown();
    setShowConfirmSend(false);
    setLoading(true);

    // Build message + collect first image for vision + append text-file content
    let combined = texts.join("\n\n").trim();
    const imageAttachment = attachments.find((a) => a.type.startsWith("image/") && a.dataUrl);
    const textAttachments = attachments.filter((a) => a.textContent);
    const otherAttachments = attachments.filter(
      (a) => !a.type.startsWith("image/") && !a.textContent,
    );

    if (textAttachments.length) {
      combined += "\n\n" + textAttachments.map((a) => `--- Arquivo: ${a.name} ---\n${a.textContent}`).join("\n\n");
    }
    if (otherAttachments.length) {
      combined += "\n\n(usuário anexou arquivos sem conteúdo legível: " + otherAttachments.map((a) => `${a.name} [${a.type || "?"}]`).join(", ") + ")";
    }

    try {
      const { data, error } = await supabase.functions.invoke("support-chat", {
        body: {
          ticketId,
          message: combined || "(usuário enviou apenas anexos)",
          history: messages.slice(-12).map((m) => ({ role: m.role, content: m.content })),
          imageDataUrl: imageAttachment?.dataUrl ?? null,
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
      setMessages((prev) => [...prev, { role: "ai", content: data.answer }]);

      if (data.escalate) {
        setPhase("collect-info");
      } else if (data.phase === "solution") {
        setPhase("ask-resolved");
      } else {
        setPhase("chat"); // stay conversational
      }
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

  const queueAndSchedule = (text: string, attachments: Attachment[]) => {
    if (text) queueRef.current.texts.push(text);
    if (attachments.length) queueRef.current.attachments.push(...attachments);

    // Show in chat immediately
    setMessages((prev) => [
      ...prev,
      { role: "user", content: text || "(anexo)", attachments: attachments.length ? attachments : undefined },
    ]);

    // Reset debounce + show confirmation banner
    setShowConfirmSend(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    startCountdown();
    debounceRef.current = setTimeout(() => {
      void flushQueue();
    }, RESPONSE_DELAY_MS);
  };

  const send = () => {
    const text = input.trim();
    if ((!text && pendingAttachments.length === 0) || loading) return;
    const atts = pendingAttachments;
    setInput("");
    setPendingAttachments([]);
    queueAndSchedule(text, atts);
  };

  const sendNow = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    void flushQueue();
  };

  const cancelQueue = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    stopCountdown();
    setShowConfirmSend(false);
    // Remove queued user messages from UI
    const drop = queueRef.current.texts.length + (queueRef.current.attachments.length ? 1 : 0);
    if (drop > 0) {
      setMessages((prev) => {
        // remove the last messages that came from this batch
        let removed = 0;
        const out = [...prev];
        while (removed < drop && out.length && out[out.length - 1].role === "user") {
          out.pop();
          removed++;
        }
        return out;
      });
    }
    queueRef.current = { texts: [], attachments: [] };
  };

  const onResolved = (resolved: boolean) => {
    if (resolved) {
      setPhase("rate");
    } else {
      // Don't escalate immediately — let AI try alternatives. Re-open chat with hint.
      setPhase("chat");
      const reply = "Não funcionou? Me conta o que aconteceu (em qual passo travou, apareceu alguma mensagem de erro?) que eu tento outro caminho.";
      setMessages((prev) => [...prev, { role: "ai", content: reply }]);
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
    queueRef.current = { texts: [], attachments: [] };
    localStorage.removeItem(STORAGE_KEY);
    setTicketId(null);
    setPendingAttachments([]);
    setShowConfirmSend(false);
    setMessages([{ role: "ai", content: "Olá! Eu sou o Wian. Como posso ajudar?" }]);
    setPhase("chat");
    setStars(0); setComment(""); setExtra(""); setInput("");
  };

  const renderAttachment = (a: Attachment, key: number) => {
    if (a.dataUrl) {
      return <img key={key} src={a.dataUrl} alt={a.name} className="rounded-lg max-h-40 object-contain" />;
    }
    return (
      <div key={key} className="flex items-center gap-2 bg-background/60 border border-border rounded-md px-2 py-1 text-xs">
        <FileText className="w-3.5 h-3.5 text-primary" />
        <span className="truncate max-w-[180px]">{a.name}</span>
        <span className="text-muted-foreground">{Math.ceil(a.size / 1024)}KB</span>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full min-h-0" onPaste={handlePaste}>
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
                {m.attachments?.length ? (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {m.attachments.map(renderAttachment)}
                  </div>
                ) : null}
                {m.role === "ai" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_strong]:font-semibold">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                  </div>
                ) : (
                  m.content !== "(anexo)" && m.content
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {showConfirmSend && !loading && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center">
            <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-foreground/80 flex items-center gap-3 flex-wrap">
              <span>
                Confirma o envio à IA? Respondo em <span className="font-semibold text-primary">{waitingSeconds}s</span> ou clique abaixo.
              </span>
              <div className="flex gap-1.5">
                <Button size="sm" variant="default" className="h-7 px-2.5" onClick={sendNow}>
                  <Check className="w-3.5 h-3.5 mr-1" /> Confirmar agora
                </Button>
                <Button size="sm" variant="ghost" className="h-7 px-2.5" onClick={cancelQueue}>
                  Cancelar
                </Button>
              </div>
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
                <span className="ml-2 text-xs text-muted-foreground">Wian está pensando…</span>
              </div>
            </div>
          </motion.div>
        )}

        {phase === "ask-resolved" && !loading && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center gap-2 pt-1">
            <Button size="sm" variant="default" onClick={() => onResolved(true)}>Sim, funcionou ✅</Button>
            <Button size="sm" variant="outline" onClick={() => onResolved(false)}>Não funcionou</Button>
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
          {pendingAttachments.length > 0 && (
            <div className="flex flex-wrap gap-2 p-2 rounded-lg border border-border bg-muted/40">
              {pendingAttachments.map((a, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-background border border-border rounded-md pl-2 pr-1 py-1 text-xs">
                  {a.type.startsWith("image/") ? <ImageIcon className="w-3.5 h-3.5 text-primary" /> : <FileText className="w-3.5 h-3.5 text-primary" />}
                  <span className="truncate max-w-[140px]">{a.name}</span>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-destructive p-0.5"
                    onClick={() => setPendingAttachments((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <span className="text-[11px] text-muted-foreground self-center">
                {pendingAttachments.length}/{MAX_ATTACHMENTS_PER_SEND} anexos
              </span>
            </div>
          )}
          <div className="flex gap-2">
            <input
              ref={fileRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                const fs = Array.from(e.target.files ?? []);
                if (fs.length) void addFiles(fs);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => fileRef.current?.click()}
              disabled={loading || pendingAttachments.length >= MAX_ATTACHMENTS_PER_SEND}
              title="Anexar arquivo (ou cole com Ctrl+V)"
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            <Input
              placeholder="Digite, cole arquivos (Ctrl+V) ou anexe…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              disabled={loading}
            />
            <Button onClick={send} disabled={loading || (!input.trim() && pendingAttachments.length === 0)} size="icon">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
