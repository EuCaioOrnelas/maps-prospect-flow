import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { BackgroundGlow } from "@/components/layout/BackgroundGlow";
import { Sparkles, ArrowLeft, SendIcon } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// Quick prompts: short preview text + full detailed prompt
const quickPrompts = [
  {
    preview: "Funil de vendas completo",
    full: "Crie um funil de vendas completo com saudação personalizada, qualificação do lead com perguntas sobre necessidade e orçamento, apresentação do produto com benefícios, oferta especial com urgência, link de pagamento e follow-up automático para quem não respondeu em 1h e 24h.",
  },
  {
    preview: "Atendimento com menu",
    full: "Crie um fluxo de atendimento automático com menu principal contendo: Vendas, Suporte, Dúvidas Frequentes e Falar com Humano. Cada opção deve ter sub-menus com respostas automáticas, e fallback para transferência humana quando necessário.",
  },
  {
    preview: "Suporte com triagem",
    full: "Crie um fluxo de suporte ao cliente com triagem automática por tipo de problema (técnico, financeiro, dúvida), tentativa de resolução via FAQ automatizado, coleta de informações do problema e escalonamento para atendente humano com contexto completo.",
  },
  {
    preview: "Captação e qualificação",
    full: "Crie um fluxo para captar leads frios vindos de campanhas, qualificá-los com perguntas sobre segmento, tamanho da empresa e orçamento, classificar como quente/morno/frio e agendar reunião automática com o time de vendas para os qualificados.",
  },
  {
    preview: "Proposta e follow-up",
    full: "Crie um fluxo para envio de proposta comercial personalizada com apresentação da empresa, envio do PDF da proposta, follow-up automático em 2h perguntando se recebeu, segundo follow-up em 24h para tirar dúvidas e terceiro em 3 dias com oferta especial de fechamento.",
  },
  {
    preview: "Academia / Fitness",
    full: "Crie um fluxo para academia com boas-vindas, apresentação dos planos (mensal, trimestral, anual), agendamento de aula experimental gratuita, envio de depoimentos de alunos e processo de matrícula online com link de pagamento.",
  },
  {
    preview: "Clínica com agendamento",
    full: "Crie um fluxo para clínica médica com seleção de especialidade, verificação de disponibilidade de horários, agendamento de consulta, confirmação com endereço e orientações pré-consulta e lembrete automático 24h antes.",
  },
  {
    preview: "Imobiliária com filtros",
    full: "Crie um fluxo para imobiliária com seleção de tipo de imóvel (casa, apartamento, comercial), filtros de localização e faixa de preço, envio de opções disponíveis com fotos, agendamento de visita e follow-up pós-visita.",
  },
  {
    preview: "Restaurante delivery",
    full: "Crie um fluxo para restaurante com apresentação do cardápio por categorias (pratos, bebidas, sobremesas), seleção de itens com quantidades, confirmação do pedido com valor total, coleta de endereço de entrega e informações de tempo estimado e pagamento.",
  },
];

// Phone chat simulation messages
const simulationSteps = [
  { type: "contact", text: "Definindo nome do fluxo..." },
  { type: "bot", text: "Olá! 👋 Bem-vindo!" },
  { type: "user", text: "Oi, quero saber mais" },
  { type: "bot", text: "Claro! Posso te ajudar. O que procura?" },
  { type: "buttons", text: "📋 Opções disponíveis", buttons: ["Comprar", "Suporte", "Dúvidas"] },
  { type: "user", text: "Quero comprar" },
  { type: "bot", text: "Ótima escolha! Vou te apresentar..." },
  { type: "bot", text: "🎯 Criando condições e regras..." },
  { type: "bot", text: "✅ Fluxo completo gerado!" },
];

function useAutoResizeTextarea({ minHeight, maxHeight }: { minHeight: number; maxHeight?: number }) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const adjustHeight = useCallback(
    (reset?: boolean) => {
      const ta = textareaRef.current;
      if (!ta) return;
      if (reset) { ta.style.height = `${minHeight}px`; ta.style.overflowY = "hidden"; return; }
      ta.style.height = `${minHeight}px`;
      const max = maxHeight ?? Infinity;
      const newHeight = Math.max(minHeight, Math.min(ta.scrollHeight, max));
      ta.style.height = `${newHeight}px`;
      ta.style.overflowY = ta.scrollHeight > max ? "auto" : "hidden";
    },
    [minHeight, maxHeight]
  );
  useEffect(() => { if (textareaRef.current) { textareaRef.current.style.height = `${minHeight}px`; textareaRef.current.style.overflowY = "hidden"; } }, [minHeight]);
  return { textareaRef, adjustHeight };
}

function TypingDots() {
  return (
    <div className="flex items-center ml-1">
      {[1, 2, 3].map((dot) => (
        <motion.div
          key={dot}
          className="w-1.5 h-1.5 bg-primary rounded-full mx-0.5"
          animate={{ opacity: [0.3, 0.9, 0.3], scale: [0.85, 1.1, 0.85] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: dot * 0.15, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

// Phone loading simulation component
function PhoneSimulation({ flowName }: { flowName: string }) {
  const [messages, setMessages] = useState<typeof simulationSteps>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentStep >= simulationSteps.length) return;
    const timer = setTimeout(() => {
      setMessages((prev) => [...prev, simulationSteps[currentStep]]);
      setCurrentStep((s) => s + 1);
    }, 1200 + Math.random() * 800);
    return () => clearTimeout(timer);
  }, [currentStep]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <motion.div
      className="flex flex-col items-center justify-center"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Phone frame */}
      <div className="relative w-[280px] h-[500px] rounded-[2.5rem] border-2 border-border bg-card shadow-2xl overflow-hidden">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-background rounded-b-2xl z-10" />

        {/* WhatsApp header */}
        <div className="bg-[#075E54] pt-8 pb-3 px-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold">
            {flowName?.[0]?.toUpperCase() || "F"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold truncate">{flowName || "Fluxo IA"}</p>
            <p className="text-white/60 text-[10px]">online</p>
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 h-[380px] overflow-y-auto bg-[#0B141A] px-3 py-3 space-y-2" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}>
          {messages.map((msg, i) => {
            if (msg.type === "contact") {
              return (
                <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center">
                  <span className="text-[10px] bg-[#1F2C33] text-white/50 px-3 py-1 rounded-full">{msg.text}</span>
                </motion.div>
              );
            }
            if (msg.type === "user") {
              return (
                <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex justify-end">
                  <div className="max-w-[80%] bg-[#005C4B] text-white text-xs px-3 py-2 rounded-xl rounded-tr-sm">{msg.text}</div>
                </motion.div>
              );
            }
            if (msg.type === "buttons") {
              return (
                <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex justify-start">
                  <div className="max-w-[85%]">
                    <div className="bg-[#1F2C33] text-white text-xs px-3 py-2 rounded-xl rounded-tl-sm mb-1">{msg.text}</div>
                    <div className="flex flex-wrap gap-1">
                      {msg.buttons?.map((b, bi) => (
                        <span key={bi} className="text-[10px] bg-[#1F2C33] text-[#53BDEB] px-2.5 py-1 rounded-lg border border-[#53BDEB]/20">{b}</span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              );
            }
            return (
              <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex justify-start">
                <div className="max-w-[80%] bg-[#1F2C33] text-white text-xs px-3 py-2 rounded-xl rounded-tl-sm">{msg.text}</div>
              </motion.div>
            );
          })}

          {currentStep < simulationSteps.length && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
              <div className="bg-[#1F2C33] px-3 py-2 rounded-xl rounded-tl-sm flex items-center gap-1">
                <TypingDots />
              </div>
            </motion.div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Bottom bar */}
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-[#1F2C33] flex items-center px-3 gap-2">
          <div className="flex-1 h-8 rounded-full bg-[#2A3942] px-3 flex items-center">
            <span className="text-white/30 text-[10px]">Mensagem</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#00A884] flex items-center justify-center">
            <SendIcon size={14} className="text-white" />
          </div>
        </div>
      </div>

      <motion.p
        className="mt-6 text-sm text-muted-foreground text-center"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        Criando seu fluxo com IA...
      </motion.p>
    </motion.div>
  );
}

export default function CreateFlowAI() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [prompt, setPrompt] = useState("");
  const [expandedPrompt, setExpandedPrompt] = useState<number | null>(null);
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({ minHeight: 56, maxHeight: 240 });

  useEffect(() => {
    const p = searchParams.get("prompt");
    if (p) setPrompt(p);
  }, [searchParams]);

  const createWithAI = useMutation({
    mutationFn: async () => {
      if (!prompt.trim()) throw new Error("Descreva o que deseja para o fluxo");
      const { data: flow, error: flowErr } = await supabase
        .from("wa_automation_flows")
        .insert({ user_id: user!.id, name: "Fluxo IA" })
        .select()
        .single();
      if (flowErr) throw flowErr;
      const { data: result, error: fnErr } = await supabase.functions.invoke("generate-wa-flow", {
        body: { prompt: prompt.trim(), flow_id: flow.id },
      });
      if (fnErr) throw fnErr;
      if (result?.error) throw new Error(result.error);
      if (result?.flow_name) {
        await supabase.from("wa_automation_flows").update({ name: result.flow_name }).eq("id", flow.id);
      }
      return flow;
    },
    onSuccess: (flow) => {
      toast.success("Fluxo gerado com IA!");
      navigate(`/fluxos/${flow.id}`);
    },
    onError: (err: any) => toast.error(err.message || "Erro ao gerar fluxo com IA"),
  });

  const handleSelectPrompt = (index: number) => {
    if (expandedPrompt === index) {
      setExpandedPrompt(null);
      return;
    }
    setExpandedPrompt(index);
    const full = quickPrompts[index].full;
    setPrompt("");
    // Type it out character by character
    let i = 0;
    const interval = setInterval(() => {
      setPrompt(full.slice(0, i + 1));
      i++;
      if (i >= full.length) clearInterval(interval);
    }, 8);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (prompt.trim() && !createWithAI.isPending) createWithAI.mutate();
    }
  };

  // Loading state - show phone simulation
  if (createWithAI.isPending) {
    return (
      <div className="min-h-screen bg-background flex w-full">
        <AppSidebar profile={profile} />
        <div className="flex-1 flex flex-col lg:ml-[72px]">
          <AppHeader profile={profile} />
          <MobileNav profile={profile} />
          <BackgroundGlow />
          <main className="flex-1 flex items-center justify-center px-4">
            <PhoneSimulation flowName={prompt.slice(0, 30)} />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex w-full">
      <AppSidebar profile={profile} />
      <div className="flex-1 flex flex-col lg:ml-[72px]">
        <AppHeader profile={profile} />
        <MobileNav profile={profile} />
        <BackgroundGlow />

        <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
          {/* Ambient glows */}
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full mix-blend-normal filter blur-[128px] animate-pulse pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full mix-blend-normal filter blur-[128px] animate-pulse pointer-events-none" style={{ animationDelay: "700ms" }} />

          <div className="w-full max-w-2xl mx-auto relative z-10 space-y-10">
            {/* Back */}
            <button
              onClick={() => navigate("/fluxos")}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft size={16} /> Voltar para fluxos
            </button>

            {/* Hero */}
            <motion.div
              className="text-center space-y-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-card text-sm text-muted-foreground">
                <Sparkles size={14} className="text-primary" />
                Descreva. Nós montamos o fluxo.
              </div>

              <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">
                Crie fluxos inteligentes<br />para o WhatsApp
              </h1>

              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Descreva seu objetivo e a IA monta automaticamente um fluxo completo.
              </p>
            </motion.div>

            {/* Chat input area */}
            <motion.div
              className="relative backdrop-blur-2xl bg-card/50 rounded-2xl border border-border/50 shadow-2xl flex items-end gap-3 p-3"
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              <div className="flex-1 min-w-0">
                <textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={(e) => { setPrompt(e.target.value); adjustHeight(); }}
                  onKeyDown={handleKeyDown}
                  placeholder="Quero um fluxo para..."
                  className={cn(
                    "w-full px-4 py-3 resize-none bg-transparent border-none text-foreground text-sm",
                    "focus:outline-none placeholder:text-muted-foreground/40 min-h-[56px]"
                  )}
                />
              </div>

              <motion.button
                type="button"
                onClick={() => createWithAI.mutate()}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                disabled={!prompt.trim()}
                className={cn(
                  "px-5 py-2.5 rounded-full text-sm font-semibold transition-all flex items-center gap-2 btn-shine relative overflow-hidden shrink-0 mb-1",
                  prompt.trim()
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <Sparkles className="w-4 h-4" />
                <span>Criar fluxo</span>
              </motion.button>
            </motion.div>

            {/* Quick prompts - 3 per row */}
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground text-center">Ou escolha um prompt pronto:</p>
              <div className="grid grid-cols-3 gap-2">
                {quickPrompts.map((qp, index) => (
                  <motion.button
                    key={index}
                    onClick={() => handleSelectPrompt(index)}
                    className={cn(
                      "text-left p-3 rounded-xl border transition-all text-xs",
                      expandedPrompt === index
                        ? "border-primary/40 bg-primary/5 text-foreground"
                        : "border-border bg-card/50 text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-foreground"
                    )}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <span className="line-clamp-2 font-medium">{qp.preview}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
