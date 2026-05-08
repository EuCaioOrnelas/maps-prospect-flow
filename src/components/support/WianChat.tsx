import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Star, Loader2, User, Paperclip, X, FileText, Image as ImageIcon, Check, ChevronLeft, ExternalLink, List, ChevronRight, Megaphone, MessageSquare, Building2, Bot, LayoutGrid, GitBranch, CreditCard, Package, BarChart3, Headphones, HelpCircle, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { TRIAGE_TREE, findCategory, findProblem, type Solution, type Category } from "./triageTree";
import wianAvatar from "@/assets/wian-avatar.png";

const CATEGORY_ICONS: Record<string, typeof Megaphone> = {
  campanhas: Megaphone,
  whatsapp: MessageSquare,
  meta: Building2,
  ia: Bot,
  crm: LayoutGrid,
  flows: GitBranch,
  financeiro: CreditCard,
  planos: Package,
  relatorios: BarChart3,
  suporte: Headphones,
};

const AiAvatar = () => (
  <img
    src={wianAvatar}
    alt="Wian"
    className="w-10 h-10 rounded-full object-cover shrink-0"
  />
);

type Attachment = {
  name: string;
  type: string;
  size: number;
  dataUrl?: string;
  textContent?: string;
};

type Msg = { role: "user" | "ai"; content: string; attachments?: Attachment[] };

type Phase =
  | "ask-name"
  | "triage-menu"
  | "triage-submenu"
  | "triage-solution"
  | "chat"
  | "ask-resolved"
  | "rate"
  | "nps"
  | "collect-info"
  | "done-resolved"
  | "done-escalated"
  | "blocked";

// Cores específicas por categoria (visual mais profissional, sem quadrado cinza)
const CATEGORY_COLORS: Record<string, string> = {
  campanhas: "text-orange-500",
  whatsapp: "text-emerald-500",
  meta: "text-blue-500",
  ia: "text-violet-500",
  crm: "text-pink-500",
  flows: "text-cyan-500",
  financeiro: "text-amber-500",
  planos: "text-indigo-500",
  relatorios: "text-sky-500",
  suporte: "text-rose-500",
};

type TriageContext = {
  category?: string;
  subcategory?: string;
  triedSolution?: string;
  triedSteps?: string[];
};

const STORAGE_KEY = "wian_chat_v4";
const FORM_KEY = "wian_form_draft_v1";
const RESPONSE_DELAY_MS = 10000; // aguarda 10s após a última mensagem do user (reseta a cada nova mensagem); "digitando" aparece durante a espera
const MAX_FILE_BYTES = 4 * 1024 * 1024;
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

function saveState(s: { ticketId: string | null; messages: Msg[]; phase: Phase; triage: TriageContext; guestName?: string }) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {}
}

const GREETING_MSG: Msg = {
  role: "ai",
  content: "Olá! Eu sou o **Wian** 👋, atendente virtual da Wiize.\n\nToque no menu abaixo para selecionar a área onde precisa de ajuda.",
};

const ASK_NAME_MSG: Msg = {
  role: "ai",
  content: "Olá! Eu sou o **Wian** 👋, atendente virtual da Wiize.\n\nAntes da gente começar, como posso te chamar? 😊",
};

// Quebra a resposta longa do AI em vários "balões" curtos (estilo WhatsApp).
// Divide por linhas em branco e mescla pedaços muito curtos para evitar bolhas órfãs.
function splitAnswerIntoBubbles(answer: string): string[] {
  if (!answer) return [];
  const raw = answer.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
  if (raw.length <= 1) return raw;
  const out: string[] = [];
  for (const chunk of raw) {
    const last = out[out.length - 1];
    // Se o chunk anterior é muito curto (<60 chars) e não termina em ":" e o próximo
    // não começa com lista, mescla pra não ficar bolha minúscula.
    const startsList = /^(\d+\.|[-*])\s/.test(chunk);
    if (last && last.length < 60 && !/[:?]\s*$/.test(last) && !startsList) {
      out[out.length - 1] = `${last}\n\n${chunk}`;
    } else {
      out.push(chunk);
    }
  }
  return out;
}

// Extrai o ID de um vídeo do YouTube a partir de várias formas de URL
function extractYoutubeId(url: string): string | null {
  try {
    const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
    return m ? m[1] : null;
  } catch { return null; }
}

// Encontra a primeira URL do YouTube no texto e retorna {id, urlOriginal}
function AiBubbleContent({ content }: { content: string }) {
  const yt = findYoutube(content);
  const cleaned = yt ? content.replace(yt.url, "").replace(/\s{2,}/g, " ").trim() : content;
  return (
    <div className="space-y-2">
      {cleaned && (
        <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_strong]:font-semibold">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{cleaned}</ReactMarkdown>
        </div>
      )}
      {yt && (
        <div className="rounded-lg overflow-hidden border border-border/60 bg-black aspect-video w-full max-w-[420px]">
          <iframe
            src={`https://www.youtube.com/embed/${yt.id}`}
            title="Vídeo passo a passo"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        </div>
      )}
    </div>
  );
}

function findYoutube(content: string): { id: string; url: string } | null {
  const m = content.match(/https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)[A-Za-z0-9_\-?=&]+|youtu\.be\/[A-Za-z0-9_\-?=&]+)/);
  if (!m) return null;
  const id = extractYoutubeId(m[0]);
  return id ? { id, url: m[0] } : null;
}

const TERMINAL_PHASES: Phase[] = ["done-resolved", "done-escalated"];

export function WianChat() {
  const rawInitial = loadState();
  // Se a sessão anterior já tinha terminado (chamado aberto ou resolvido), zera tudo ao voltar.
  const initial = rawInitial && TERMINAL_PHASES.includes(rawInitial.phase) ? null : rawInitial;
  if (rawInitial && !initial) {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(FORM_KEY);
    } catch {}
  }
  const [ticketId, setTicketId] = useState<string | null>(initial?.ticketId ?? null);
  const [messages, setMessages] = useState<Msg[]>(
    initial?.messages?.length ? initial.messages : [GREETING_MSG]
  );
  const [phase, setPhase] = useState<Phase>(initial?.phase ?? "triage-menu");
  const [triage, setTriage] = useState<TriageContext>(initial?.triage ?? {});
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [activeSolution, setActiveSolution] = useState<Solution | null>(null);

  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  // Form fields — inicializa com rascunho persistido para não sumir entre re-renders
  const formDraft = (() => {
    try { return JSON.parse(localStorage.getItem(FORM_KEY) || "{}"); } catch { return {}; }
  })();
  const [name, setName] = useState(formDraft.name || "");
  const [email, setEmail] = useState(formDraft.email || "");
  const [phone, setPhone] = useState(formDraft.phone || "");
  const [extra, setExtra] = useState(formDraft.extra || "");
  const [category, setCategory] = useState<string>(formDraft.category || "");
  const [formErrors, setFormErrors] = useState<{ name?: string; email?: string; category?: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [npsScore, setNpsScore] = useState<number | null>(null);
  const [npsRecommend, setNpsRecommend] = useState<number | null>(null);
  const [npsComment, setNpsComment] = useState("");
  const [isAuthed, setIsAuthed] = useState(false);
  const [ticketNumber, setTicketNumber] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const queueRef = useRef<{ texts: string[]; attachments: Attachment[] }>({ texts: [], attachments: [] });
  const { toast } = useToast();

  useEffect(() => {
    const lite = messages.map((m) => ({
      ...m,
      attachments: m.attachments?.map((a) => ({ ...a, dataUrl: undefined, textContent: undefined })),
    }));
    saveState({ ticketId, messages: lite, phase, triage, guestName: !isAuthed ? name : undefined });
  }, [ticketId, messages, phase, triage, isAuthed, name]);

  // Persiste rascunho do formulário (nome, email, telefone, descrição, categoria) para
  // não perder o que o usuário digitou caso o componente re-renderize.
  useEffect(() => {
    try {
      localStorage.setItem(FORM_KEY, JSON.stringify({ name, email, phone, extra, category }));
    } catch {}
  }, [name, email, phone, extra, category]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setIsAuthed(true);
        const { data: profile } = await supabase
          .from("profiles")
          .select("name, email, phone")
          .eq("id", user.id)
          .maybeSingle();
        setName(profile?.name ?? "");
        setEmail(profile?.email ?? user.email ?? "");
        setPhone(profile?.phone ?? "");
        return;
      }
      // Visitante sem nome → entra no fluxo "ask-name" (apenas no primeiro acesso)
      const hadHistory = !!initial?.messages?.length;
      const storedName = initial?.guestName;
      if (storedName) {
        setName(storedName);
      } else if (!hadHistory) {
        setMessages([ASK_NAME_MSG]);
        setPhase("ask-name");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, phase, activeCategory, activeSolution]);

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

  // ============== TRIAGEM ==============
  const pickCategory = (cat: Category) => {
    setMenuOpen(false);
    setActiveCategory(cat);
    setTriage({ category: cat.label });

    if (cat.directEscalate) {
      // Financeiro / Planos / Falar com suporte → vai direto
      setCategory(
        cat.id === "financeiro" ? "Financeiro" :
        cat.id === "planos" ? "Financeiro" :
        cat.id === "suporte" ? "Outro" : "Outro"
      );
      setMessages((prev) => [
        ...prev,
        { role: "user", content: cat.label },
        { role: "ai", content: cat.alwaysHuman
            ? `Entendi 👋. Para **${cat.label.toLowerCase()}** o atendimento é feito direto pelo nosso time humano. Vou abrir um chamado para você — preencha os dados abaixo:`
            : "Sem problema. Preencha os dados abaixo que vou abrir um chamado para o time:" },
      ]);
      setPhase("collect-info");
      return;
    }

    setMessages((prev) => [
      ...prev,
      { role: "user", content: cat.label },
      { role: "ai", content: `${cat.subcategoryLabel || "Qual é o problema?"}\n\nEscolha a opção mais próxima abaixo 👇` },
    ]);
    setPhase("triage-submenu");
  };

  const pickProblem = (sol: Solution) => {
    setMenuOpen(false);
    setActiveSolution(sol);
    setTriage((t) => ({ ...t, subcategory: sol.title, triedSolution: sol.title, triedSteps: sol.steps }));

    // Mensagem do usuário
    const userMsg: Msg = { role: "user", content: sol.title };

    // "Outro problema..." ou problemas sem passos reais (que apenas pedem para o usuário
    // descrever) NÃO devem mostrar "Funcionou?" — vão direto para o chat aberto com a IA.
    const isOpenEnded =
      sol.id.startsWith("outro_") ||
      sol.steps.length === 0 ||
      (sol.steps.length === 1 && /^(me conta|me conte|descreva|me explica|me explique)/i.test(sol.steps[0].trim()));

    if (isOpenEnded) {
      const prompt = sol.steps.length
        ? sol.steps.map((s) => s).join("\n\n")
        : "Me conta com mais detalhes o que está acontecendo — em qual tela, qual mensagem de erro aparece e o que você já tentou. 🙂";
      setMessages((prev) => [...prev, userMsg, { role: "ai", content: prompt }]);
      setPhase("chat");
      return;
    }

    // Problemas críticos que vão direto para abertura de chamado (sem "Funcionou?")
    if ((sol as any).escalate) {
      const intro = sol.intro ? `${sol.intro}\n\n` : "";
      const stepsText = sol.steps.length ? sol.steps.map((s, i) => `${i + 1}. ${s}`).join("\n") + "\n\n" : "";
      setMessages((prev) => [
        ...prev,
        userMsg,
        { role: "ai", content: `${intro}${stepsText}Preencha os dados abaixo que vou abrir o chamado para o time analisar:` },
      ]);
      setCategory("Outro");
      setPhase("collect-info");
      return;
    }

    // Resposta com solução guiada
    const intro = sol.intro ? `${sol.intro}\n\n` : "";
    const stepsText = sol.steps.map((s, i) => `${i + 1}. ${s}`).join("\n");
    const aiMsg: Msg = {
      role: "ai",
      content: `${intro}**Tente isso:**\n\n${stepsText}\n\nFuncionou? 🙂`,
    };

    setMessages((prev) => [...prev, userMsg, aiMsg]);
    setPhase("triage-solution");
  };

  const onSolutionResolved = (resolved: boolean) => {
    if (resolved) {
      setPhase("rate");
      return;
    }
    // Não resolveu → entra na IA com contexto da triagem
    if (activeSolution) {
      setTriage((t) => ({
        ...t,
        triedSolution: activeSolution.title,
        triedSteps: activeSolution.steps,
      }));
    }
    setMessages((prev) => [
      ...prev,
      {
        role: "ai",
        content:
          "Sem problema. Vou analisar com mais detalhes 🤔. Me conta o que aconteceu quando você tentou:\n\n- Em qual passo travou?\n- Apareceu alguma mensagem de erro?\n- O que você esperava que acontecesse?",
      },
    ]);
    setPhase("chat");
  };

  const goBackToMenu = () => {
    setActiveCategory(null);
    setActiveSolution(null);
    setTriage({});
    setMessages((prev) => [
      ...prev,
      { role: "ai", content: "Sem problema 👍 Toque no menu abaixo para escolher outra área de atendimento." },
    ]);
    setPhase("triage-menu");
  };

  // ============== ANEXOS ==============
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
        resolve(att);
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

  // ============== AI ==============
  const flushQueue = async () => {
    const { texts, attachments } = queueRef.current;
    if (!texts.length && !attachments.length) return;
    queueRef.current = { texts: [], attachments: [] };
    setLoading(true);

    let combined = texts.join("\n\n").trim();
    const imageAttachment = attachments.find((a) => a.type.startsWith("image/") && a.dataUrl);
    const textAttachments = attachments.filter((a) => a.textContent);
    const otherAttachments = attachments.filter((a) => !a.type.startsWith("image/") && !a.textContent);

    if (textAttachments.length) {
      combined += "\n\n" + textAttachments.map((a) => `--- Arquivo: ${a.name} ---\n${a.textContent}`).join("\n\n");
    }
    if (otherAttachments.length) {
      combined += "\n\n(usuário anexou: " + otherAttachments.map((a) => `${a.name} [${a.type || "?"}]`).join(", ") + ")";
    }

    try {
      const { data, error } = await supabase.functions.invoke("support-chat", {
        body: {
          ticketId,
          message: combined || "(usuário enviou apenas anexos)",
          history: messages.slice(-12).map((m) => ({ role: m.role, content: m.content })),
          imageDataUrl: imageAttachment?.dataUrl ?? null,
          triageContext: triage,
          userName: name || null,
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

      // Quebra em vários balões curtos para parecer mais humano (estilo WhatsApp)
      const bubbles = splitAnswerIntoBubbles(data.answer || "");
      if (bubbles.length === 0) {
        setMessages((prev) => [...prev, { role: "ai", content: data.answer || "" }]);
      } else {
        // Adiciona o primeiro imediatamente; agenda os próximos com pequena pausa "digitando"
        // Adiciona o primeiro imediatamente; agenda os próximos com pausa "digitando" entre cada um
        setMessages((prev) => [...prev, { role: "ai", content: bubbles[0] }]);
        for (let i = 1; i < bubbles.length; i++) {
          const baseDelay = 600 + (i - 1) * 1400;
          // Mostra o "digitando" um pouco antes de aparecer o próximo balão
          setTimeout(() => setLoading(true), baseDelay);
          setTimeout(() => {
            setLoading(false);
            setMessages((prev) => [...prev, { role: "ai", content: bubbles[i] }]);
          }, baseDelay + 800);
        }
      }

      if (data.escalate) {
        setPhase("collect-info");
        // pré-seleciona categoria a partir da triagem
        if (triage.category && !category) {
          const map: Record<string, string> = {
            "Campanhas e disparos": "Campanhas",
            "WhatsApp e conexões": "WhatsApp",
            "Meta API Oficial": "WhatsApp",
            "IA e Agentes": "IA",
            "CRM e Leads": "CRM",
            "Fluxos e automações": "WhatsApp",
            "Financeiro / Cobrança": "Financeiro",
            "Planos e cancelamento": "Financeiro",
            "Relatórios e métricas": "Operacional",
            "Falar com suporte humano": "Outro",
          };
          setCategory(map[triage.category] || "Outro");
        }
      } else if (data.phase === "solution") {
        setPhase("ask-resolved");
      } else {
        setPhase("chat");
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

    setMessages((prev) => [
      ...prev,
      { role: "user", content: text || "(anexo)", attachments: attachments.length ? attachments : undefined },
    ]);

    // Mostra "digitando" imediatamente e dispara após pequena pausa para agrupar mensagens consecutivas
    setLoading(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
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

  const onResolved = (resolved: boolean) => {
    if (resolved) {
      setPhase("rate");
    } else {
      setPhase("chat");
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: "Não funcionou? Me conta o que aconteceu (em qual passo travou, apareceu alguma mensagem de erro?) que eu tento outro caminho." },
      ]);
    }
  };

  const submitRating = async () => {
    if (!stars) return;
    // Sem ticket (resolveu só na triagem) — pula direto para NPS
    if (!ticketId) {
      setPhase("nps");
      return;
    }
    try {
      await supabase.from("support_ratings").insert({ ticket_id: ticketId, stars, comment, resolved_by: "ai" });
      await supabase.from("support_tickets").update({ status: "resolved", resolved_by: "ai", resolved_at: new Date().toISOString() }).eq("id", ticketId);
      setPhase("nps");
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const submitNps = async () => {
    if (npsScore === null && npsRecommend === null) {
      setPhase("done-resolved");
      return;
    }
    try {
      if (ticketId) {
        await supabase.from("support_ratings").insert({
          ticket_id: ticketId,
          stars: null,
          nps_score: npsScore,
          nps_recommend: npsRecommend,
          nps_comment: npsComment || null,
          resolved_by: "ai",
        });
      }
      toast({ title: "Obrigado pelo feedback! 🙌" });
      setPhase("done-resolved");
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
      setPhase("done-resolved");
    }
  };

  const skipNps = () => setPhase("done-resolved");

  const submitEscalation = async () => {
    const errs: { name?: string; email?: string; category?: string } = {};
    if (!category) errs.category = "Selecione um tópico para o chamado.";
    if (!name.trim()) errs.name = "Informe seu nome.";
    const emailTrim = email.trim();
    if (!emailTrim) errs.email = "Informe seu email.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) errs.email = "Email inválido. Verifique e tente novamente.";
    setFormErrors(errs);
    if (Object.keys(errs).length > 0) {
      setSubmitError("Preencha os campos destacados em vermelho para continuar.");
      return;
    }
    setSubmitError(null);
    setLoading(true);
    try {
      // Garante ticket criado mesmo sem IA
      let tId = ticketId;
      if (!tId) {
        const triageSummary = triage.category
          ? `Triagem: ${triage.category}${triage.subcategory ? ` → ${triage.subcategory}` : ""}`
          : "Atendimento direto (sem triagem).";
        const { data: t, error: tErr } = await supabase
          .from("support_tickets")
          .insert({
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim() || null,
            status: "open",
            priority: "medium",
            customer_type: isAuthed ? "registered_user" : "guest",
          })
          .select("id")
          .single();
        if (tErr) throw tErr;
        tId = t.id;
        await supabase.from("support_messages").insert({
          ticket_id: tId,
          role: "user",
          content: `${triageSummary}\n\n${extra.trim() || "(sem detalhes adicionais)"}`,
        });
        setTicketId(tId);
      }

      const { data: escResp, error } = await supabase.functions.invoke("support-escalate", {
        body: {
          ticketId: tId,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          extra: extra.trim() || null,
          category,
        },
      });
      if (error) throw error;
      if (escResp?.ticketNumber) setTicketNumber(escResp.ticketNumber);
      // Limpa rascunho do form depois que o chamado foi aberto com sucesso
      try { localStorage.removeItem(FORM_KEY); } catch {}
      setPhase("done-escalated");
    } catch (e: any) {
      const msg = e?.message || "Não conseguimos abrir seu chamado agora. Tente novamente em instantes.";
      setSubmitError(msg);
      toast({ title: "Erro ao abrir chamado", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const RESET_LIMIT = 3;
  const RESET_WINDOW_MS = 60 * 60 * 1000;
  const RESET_KEY = "wian_chat_resets_v1";

  const [blockedUntil, setBlockedUntil] = useState<number | null>(null);
  const [blockTick, setBlockTick] = useState(0);

  // Ao montar, verifica se ainda está bloqueado por excesso de reinícios
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RESET_KEY);
      if (!raw) return;
      const arr: number[] = JSON.parse(raw);
      const now = Date.now();
      const recent = arr.filter((t) => now - t < RESET_WINDOW_MS);
      if (recent.length >= RESET_LIMIT) {
        const until = recent[0] + RESET_WINDOW_MS;
        setBlockedUntil(until);
        setPhase("blocked");
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Atualiza o contador da tela de bloqueio a cada 30s
  useEffect(() => {
    if (phase !== "blocked" || !blockedUntil) return;
    const id = setInterval(() => {
      if (Date.now() >= blockedUntil) {
        setBlockedUntil(null);
        try { localStorage.removeItem(RESET_KEY); } catch {}
        setPhase("triage-menu");
        setMessages([GREETING_MSG]);
      } else {
        setBlockTick((t) => t + 1);
      }
    }, 30000);
    return () => clearInterval(id);
  }, [phase, blockedUntil]);

  const restart = () => {
    try {
      const raw = localStorage.getItem(RESET_KEY);
      const now = Date.now();
      const arr: number[] = raw ? JSON.parse(raw) : [];
      const recent = arr.filter((t) => now - t < RESET_WINDOW_MS);
      if (recent.length >= RESET_LIMIT) {
        const until = recent[0] + RESET_WINDOW_MS;
        setBlockedUntil(until);
        setPhase("blocked");
        return;
      }
      recent.push(now);
      localStorage.setItem(RESET_KEY, JSON.stringify(recent));
    } catch {}

    if (debounceRef.current) clearTimeout(debounceRef.current);
    queueRef.current = { texts: [], attachments: [] };
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(FORM_KEY);
    setTicketId(null);
    setTicketNumber(null);
    setPendingAttachments([]);
    setMessages([GREETING_MSG]);
    setActiveCategory(null);
    setActiveSolution(null);
    setTriage({});
    setPhase("triage-menu");
    setStars(0); setComment(""); setExtra(""); setInput("");
    setPhone(""); setCategory("");
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

  const showInputBar = phase === "chat" || phase === "ask-resolved";

  return (
    <div className="flex flex-col h-full min-h-0" onPaste={handlePaste}>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-background/30">
        {/* Mensagens já trocadas */}
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
                    : "bg-muted/40 text-foreground rounded-bl-md border border-border/40"
                }`}
              >
                {m.attachments?.length ? (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {m.attachments.map(renderAttachment)}
                  </div>
                ) : null}
                {m.role === "ai" ? (
                  <AiBubbleContent content={m.content} />
                ) : (
                  m.content !== "(anexo)" && m.content
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Coleta de nome (visitante) */}
        {phase === "ask-name" && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="pl-12">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const n = name.trim();
                if (n.length < 2) {
                  toast({ title: "Me diz seu nome 🙂", description: "Pode ser só o primeiro nome.", variant: "destructive" });
                  return;
                }
                const firstName = n.split(/\s+/)[0];
                setMessages((prev) => [
                  ...prev,
                  { role: "user", content: n },
                  { role: "ai", content: `Prazer, **${firstName}**! 🙌\n\nMe conta: em qual área você precisa de ajuda? Toque no menu abaixo 👇` },
                ]);
                setPhase("triage-menu");
              }}
              className="flex gap-2 max-w-sm"
            >
              <Input
                placeholder="Seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
              <Button type="submit" size="sm">Enviar</Button>
            </form>
          </motion.div>
        )}

        {/* Camada 1 — MENU (botão estilo WhatsApp) */}
        {phase === "triage-menu" && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start pl-12">
            <button
              onClick={() => setMenuOpen(true)}
              className="group flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-card border border-primary/30 text-sm font-medium text-primary hover:bg-primary/5 hover:border-primary/50 transition-all shadow-sm"
            >
              <List className="w-4 h-4" />
              Ver opções de atendimento
              <ChevronRight className="w-4 h-4 opacity-60 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </motion.div>
        )}

        {/* Camada 2 — SUBMENU (botão estilo WhatsApp) */}
        {phase === "triage-submenu" && activeCategory && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
            <div className="flex justify-start pl-12">
              <button
                onClick={() => setMenuOpen(true)}
                className="group flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-card border border-primary/30 text-sm font-medium text-primary hover:bg-primary/5 hover:border-primary/50 transition-all shadow-sm"
              >
                <List className="w-4 h-4" />
                Selecionar problema
                <ChevronRight className="w-4 h-4 opacity-60 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
            <button
              onClick={goBackToMenu}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mt-2 pl-12"
            >
              <ChevronLeft className="w-3 h-3" /> Voltar ao menu principal
            </button>
          </motion.div>
        )}

        {/* Camada 3 — SOLUÇÃO + resolveu? */}
        {phase === "triage-solution" && activeSolution && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
            {activeSolution.ctaPath && activeSolution.ctaLabel && (
              <Link
                to={activeSolution.ctaPath}
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition"
              >
                <ExternalLink className="w-3 h-3" /> {activeSolution.ctaLabel}
              </Link>
            )}
            <div className="flex justify-center gap-2 pt-2">
              <Button size="sm" variant="default" onClick={() => onSolutionResolved(true)}>
                Sim, resolveu ✅
              </Button>
              <Button size="sm" variant="outline" onClick={() => onSolutionResolved(false)}>
                Não resolveu
              </Button>
            </div>
            <div className="flex justify-center pt-1">
              <button
                onClick={goBackToMenu}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <ChevronLeft className="w-3 h-3" /> Trocar de problema
              </button>
            </div>
          </motion.div>
        )}

        {/* (confirmação removida — só "digitando" abaixo) */}

        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-end gap-2">
            <AiAvatar />
            <div className="bg-muted/40 border border-border/40 rounded-2xl rounded-bl-md px-3.5 py-2.5">
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

        {phase === "nps" && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card p-4 space-y-4">
            <div>
              <p className="text-sm font-semibold mb-1">Mais uma rapidinha 🙏</p>
              <p className="text-xs text-muted-foreground">Sua resposta ajuda a gente a melhorar o atendimento.</p>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">De 0 a 10, o quanto este atendimento te ajudou?</p>
              <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: 11 }, (_, n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setNpsScore(n)}
                    className={`w-8 h-8 text-xs rounded-md border transition-colors ${
                      npsScore === n
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:border-primary/50 hover:bg-muted"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">De 0 a 10, qual a chance de você indicar a Wiize para um amigo próximo?</p>
              <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: 11 }, (_, n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setNpsRecommend(n)}
                    className={`w-8 h-8 text-xs rounded-md border transition-colors ${
                      npsRecommend === n
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:border-primary/50 hover:bg-muted"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <Textarea
              rows={2}
              placeholder="Quer deixar um comentário? (opcional)"
              value={npsComment}
              onChange={(e) => setNpsComment(e.target.value)}
            />

            <div className="flex gap-2">
              <Button size="sm" onClick={submitNps} disabled={npsScore === null && npsRecommend === null} className="flex-1">
                Enviar feedback
              </Button>
              <Button size="sm" variant="ghost" onClick={skipNps}>
                Pular
              </Button>
            </div>
          </motion.div>
        )}

        {phase === "collect-info" && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {isAuthed ? "Confirme seus dados para abrir o chamado" : "Para abrir seu chamado precisamos de algumas informações"}
              </p>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Toda a conversa que você teve com o Wian será enviada junto com o chamado para nossa equipe — não precisa repetir o que já foi dito acima.
              </p>
            </div>

            <div className="space-y-1">
              <Select
                value={category}
                onValueChange={(v) => { setCategory(v); setFormErrors((p) => ({ ...p, category: undefined })); }}
              >
                <SelectTrigger className={formErrors.category ? "border-destructive focus:ring-destructive" : ""}>
                  <SelectValue placeholder="Tópico do chamado*" />
                </SelectTrigger>
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
              {formErrors.category && <p className="text-[11px] text-destructive">{formErrors.category}</p>}
            </div>

            <div className="space-y-1">
              <Input
                placeholder="Seu nome*"
                value={name}
                onChange={(e) => { setName(e.target.value); setFormErrors((p) => ({ ...p, name: undefined })); }}
                className={formErrors.name ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {formErrors.name && <p className="text-[11px] text-destructive">{formErrors.name}</p>}
            </div>

            <div className="space-y-1">
              <Input
                type="email"
                placeholder="Seu email*"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setFormErrors((p) => ({ ...p, email: undefined })); }}
                className={formErrors.email ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {formErrors.email && <p className="text-[11px] text-destructive">{formErrors.email}</p>}
            </div>

            <Input placeholder="Telefone (opcional)" value={phone} onChange={(e) => setPhone(e.target.value)} />

            <Textarea
              placeholder="Algo a mais que queira contar? (opcional — a conversa acima já vai junto)"
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
              rows={3}
            />

            {submitError && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-[12px] text-destructive flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <Button size="sm" onClick={submitEscalation} disabled={loading} className="w-full">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Abrir chamado
            </Button>
          </motion.div>
        )}

        {phase === "blocked" && blockedUntil && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-center space-y-3"
          >
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">Chat temporariamente bloqueado</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Você atingiu o limite de <strong>{RESET_LIMIT} reinícios por hora</strong>. Para evitar abusos e proteger
                o atendimento, o chat será liberado automaticamente em{' '}
                <strong className="text-foreground">
                  {Math.max(1, Math.ceil((blockedUntil - Date.now()) / 60000))} min
                </strong>
                {/* re-render trigger */}
                <span className="hidden">{blockTick}</span>.
              </p>
              <p className="text-[11px] text-muted-foreground pt-1">
                Se for urgente, entre em contato pelo email <strong>suporte@wiize.com.br</strong>.
              </p>
            </div>
          </motion.div>
        )}

        {phase === "done-resolved" && (
          <div className="text-center py-4 text-sm text-muted-foreground">
            Atendimento finalizado. <button onClick={restart} className="text-primary underline">Iniciar novo</button>
          </div>
        )}

        {phase === "done-escalated" && (
          <div className="rounded-xl bg-primary/10 border border-primary/20 p-4 text-center text-sm space-y-2">
            <div className="text-base">✅ Chamado aberto com sucesso!</div>
            {ticketNumber && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-background border border-primary/30">
                <span className="text-xs text-muted-foreground">Nº de protocolo</span>
                <span className="font-mono text-sm font-semibold text-primary">{ticketNumber}</span>
              </div>
            )}
            <div className="text-xs text-muted-foreground leading-relaxed text-left space-y-2 pt-1">
              <p>
                <strong className="text-foreground">Guarde este número de protocolo:</strong> ele é o seu identificador
                único pra acompanhar esse chamado e agiliza qualquer contato futuro com o nosso suporte.
              </p>
              <p>
                Nossa equipe já recebeu o histórico <strong>completo da sua conversa</strong> com o Wian, junto com os
                detalhes que você informou. Vamos analisar o seu caso com calma e entrar em contato pelo email cadastrado
                em até <strong>24h úteis</strong> (segunda a sexta, das 9h às 18h).
              </p>
              <p>
                Se for algo urgente, pode responder esse email assim que ele chegar que continuamos por lá mesmo.
              </p>
            </div>
            <div className="pt-2">
              <Button size="sm" variant="outline" onClick={restart} className="w-full">
                Iniciar novo atendimento
              </Button>
            </div>
          </div>
        )}
      </div>

      {showInputBar && (
        <div className="border-t border-border p-3 bg-background space-y-2">
          {triage.category && (
            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{triage.category}</span>
              {triage.subcategory && (
                <>
                  <span>›</span>
                  <span className="px-2 py-0.5 rounded-full bg-muted">{triage.subcategory}</span>
                </>
              )}
            </div>
          )}
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

      {/* Popup de seleção (estilo lista interativa do WhatsApp) */}
      <Dialog
        open={menuOpen}
        onOpenChange={(o) => {
          if (phase !== "triage-menu" && phase !== "triage-submenu") return;
          setMenuOpen(o);
        }}
      >
        <DialogContent className="bg-background border-border max-w-md p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-5 pt-5 pb-3 border-b border-border">
            <DialogTitle className="text-base">
              {phase === "triage-submenu" && activeCategory
                ? activeCategory.label
                : "Como podemos te ajudar?"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {phase === "triage-submenu" && activeCategory
                ? activeCategory.subcategoryLabel || "Selecione o problema mais próximo."
                : "Escolha a área para iniciar o atendimento."}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[min(85vh,720px)] overflow-y-auto py-1">
            {phase === "triage-submenu" && activeCategory
              ? activeCategory.problems.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => pickProblem(p)}
                    className="w-full text-left px-5 py-3 hover:bg-muted/60 transition-colors flex items-center justify-between gap-3 border-b border-border/50 last:border-b-0"
                  >
                    <span className="text-sm font-medium text-foreground">{p.title}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </button>
                ))
              : TRIAGE_TREE.map((cat) => {
                  const Icon = CATEGORY_ICONS[cat.id] || HelpCircle;
                  const colorClass = CATEGORY_COLORS[cat.id] || "text-primary";
                  return (
                    <button
                      key={cat.id}
                      onClick={() => pickCategory(cat)}
                      className="w-full text-left px-5 py-3 hover:bg-muted/50 transition-colors flex items-center gap-3.5 border-b border-border/40 last:border-b-0"
                    >
                      <Icon className={`w-5 h-5 shrink-0 ${colorClass}`} strokeWidth={2} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{cat.label}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/60 shrink-0" />
                    </button>
                  );
                })}
          </div>
          {phase === "triage-submenu" && (
            <div className="px-5 py-3 border-t border-border bg-muted/30">
              <button
                onClick={() => { setMenuOpen(false); goBackToMenu(); }}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <ChevronLeft className="w-3 h-3" /> Voltar ao menu principal
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
