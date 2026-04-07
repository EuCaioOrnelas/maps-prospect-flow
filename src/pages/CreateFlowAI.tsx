import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { BackgroundGlow } from "@/components/layout/BackgroundGlow";
import { Sparkles, ArrowLeft, SendIcon, MessageSquare } from "lucide-react";
import phoneFrame from "@/assets/phone-frame.png";
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

const buildSimulationSteps = (userPrompt: string) => {
  const shortPrompt = userPrompt.length > 40 ? userPrompt.slice(0, 40) + "..." : userPrompt;
  return [
    { type: "contact", text: "🤖 Analisando seu objetivo..." },
    { type: "contact", text: `📝 "${shortPrompt}"` },
    { type: "bot", text: "Olá! 👋 Bem-vindo! Como posso te ajudar?" },
    { type: "user", text: "Oi, quero saber mais sobre vocês" },
    { type: "bot", text: "Que bom que entrou em contato! Vou te mostrar tudo." },
    { type: "buttons", text: "Escolha uma opção:", buttons: ["💰 Comprar", "🛠 Suporte", "❓ Dúvidas"] },
    { type: "user", text: "Quero comprar" },
    { type: "bot", text: "Perfeito! Vou te qualificar rapidinho 🎯" },
    { type: "bot", text: "Qual seu orçamento aproximado?" },
    { type: "user", text: "Entre R$500 e R$1.000" },
    { type: "bot", text: "Ótimo! Tenho a opção ideal pra você ✨" },
    { type: "contact", text: "⚡ Adicionando follow-ups automáticos..." },
    { type: "bot", text: "Vou te enviar a proposta. Posso confirmar?" },
    { type: "buttons", text: "Confirme:", buttons: ["✅ Sim", "🔄 Outra opção"] },
    { type: "contact", text: "✅ Fluxo completo gerado com sucesso!" },
  ];
};

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
function PhoneSimulation({ flowName, userPrompt }: { flowName: string; userPrompt: string }) {
  const simulationSteps = buildSimulationSteps(userPrompt);
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
  }, [currentStep, simulationSteps.length]);

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
      {/* CSS Phone Frame */}
      <div className="relative w-[280px] h-[560px]">
        {/* Outer phone body */}
        <div className="absolute inset-0 rounded-[3rem] bg-[#1a1a1a] shadow-2xl border-[3px] border-[#333]">
          {/* Top notch */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[90px] h-[22px] bg-[#1a1a1a] rounded-full z-20" />
          {/* Side buttons */}
          <div className="absolute -left-[3px] top-[100px] w-[3px] h-[30px] bg-[#333] rounded-l-sm" />
          <div className="absolute -left-[3px] top-[150px] w-[3px] h-[50px] bg-[#333] rounded-l-sm" />
          <div className="absolute -left-[3px] top-[210px] w-[3px] h-[50px] bg-[#333] rounded-l-sm" />
          <div className="absolute -right-[3px] top-[140px] w-[3px] h-[60px] bg-[#333] rounded-r-sm" />
        </div>

        {/* Screen content */}
        <div className="absolute top-[10px] left-[10px] right-[10px] bottom-[10px] rounded-[2.4rem] overflow-hidden flex flex-col bg-card">
          {/* WhatsApp-style header */}
          <div className="bg-primary pt-10 pb-3 px-4 flex items-center gap-3 rounded-t-[2.4rem]">
            <div className="w-8 h-8 rounded-full bg-primary-foreground/20 flex items-center justify-center text-primary-foreground text-xs font-bold">
              {flowName?.[0]?.toUpperCase() || "F"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-primary-foreground text-sm font-semibold truncate">{flowName || "Fluxo IA"}</p>
              <p className="text-primary-foreground/60 text-[10px]">online</p>
            </div>
          </div>

          {/* Chat area */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-muted/30">
            {messages.map((msg, i) => {
              if (msg.type === "contact") {
                return (
                  <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center">
                    <span className="text-[10px] bg-muted text-muted-foreground px-3 py-1 rounded-full">{msg.text}</span>
                  </motion.div>
                );
              }
              if (msg.type === "user") {
                return (
                  <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex justify-end">
                    <div className="max-w-[80%] bg-primary text-primary-foreground text-xs px-3 py-2 rounded-xl rounded-tr-sm">{msg.text}</div>
                  </motion.div>
                );
              }
              if (msg.type === "buttons") {
                return (
                  <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex justify-start">
                    <div className="max-w-[85%]">
                      <div className="bg-card border border-border text-foreground text-xs px-3 py-2 rounded-xl rounded-tl-sm mb-1">{msg.text}</div>
                      <div className="flex flex-wrap gap-1">
                        {msg.buttons?.map((b, bi) => (
                          <span key={bi} className="text-[10px] bg-card text-primary px-2.5 py-1 rounded-lg border border-primary/20">{b}</span>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                );
              }
              return (
                <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex justify-start">
                  <div className="max-w-[80%] bg-card border border-border text-foreground text-xs px-3 py-2 rounded-xl rounded-tl-sm">{msg.text}</div>
                </motion.div>
              );
            })}

            {currentStep < simulationSteps.length && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                <div className="bg-card border border-border px-3 py-2 rounded-xl rounded-tl-sm flex items-center gap-1">
                  <TypingDots />
                </div>
              </motion.div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Bottom bar */}
          <div className="h-12 bg-card border-t border-border flex items-center px-3 gap-2 shrink-0">
            <div className="flex-1 h-8 rounded-full bg-muted px-3 flex items-center">
              <span className="text-muted-foreground text-[10px]">Mensagem</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <SendIcon size={14} className="text-primary-foreground" />
            </div>
          </div>
        </div>
        </div>
      </div>

      <motion.p
        className="mt-6 text-sm text-muted-foreground text-center flex items-center gap-2"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <MessageSquare size={16} className="text-primary" />
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

  // Auto-resize textarea when prompt changes (e.g. typing animation)
  useEffect(() => {
    requestAnimationFrame(() => adjustHeight());
  }, [prompt, adjustHeight]);

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
    let i = 0;
    const interval = setInterval(() => {
      setPrompt(full.slice(0, i + 1));
      i++;
      if (i >= full.length) clearInterval(interval);
      // Trigger resize after React re-renders
      requestAnimationFrame(() => adjustHeight());
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
            <PhoneSimulation flowName={prompt.slice(0, 30)} userPrompt={prompt} />
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
              className="relative backdrop-blur-2xl bg-card/50 rounded-2xl border border-border/50 shadow-2xl p-3"
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={(e) => { setPrompt(e.target.value); adjustHeight(); }}
                onKeyDown={handleKeyDown}
                placeholder="Quero um fluxo para..."
                className={cn(
                  "w-full px-4 py-3 resize-none bg-transparent border-none text-foreground text-sm",
                  "focus:outline-none placeholder:text-muted-foreground/40 min-h-[56px]",
                  "[direction:ltr] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full"
                )}
              />

              <div className="flex justify-end pt-2 border-t border-border/30">
                <motion.button
                  type="button"
                  onClick={() => createWithAI.mutate()}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  disabled={!prompt.trim()}
                  className={cn(
                    "px-5 py-2.5 rounded-full text-sm font-semibold transition-all flex items-center gap-2 btn-shine relative overflow-hidden",
                    prompt.trim()
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Criar fluxo</span>
                </motion.button>
              </div>
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
