import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { BackgroundGlow } from "@/components/layout/BackgroundGlow";
import { Sparkles, ArrowLeft, SendIcon, MessageSquare, CheckCircle2, AlertTriangle, Settings2, Zap } from "lucide-react";
import { DailyLimitDialog } from "@/components/wa-flow/DailyLimitDialog";

import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAutoScoreTracking } from "@/hooks/useAutoScoreTracking";

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
  const p = userPrompt.toLowerCase();
  const shortPrompt = userPrompt.length > 40 ? userPrompt.slice(0, 40) + "..." : userPrompt;

  // Detect themes from prompt
  const isVendas = /vend|compra|proposta|preço|orçamento|produto|serviço|loja|ecommerce/i.test(p);
  const isSuporte = /suport|ajuda|problema|técnic|atendiment|dúvida|reclamaç/i.test(p);
  const isAgendamento = /agend|consult|clínic|médic|horári|visita|reunião|marcar/i.test(p);
  const isRestaurante = /restaur|cardápio|pedido|delivery|comida|entrega|pizza/i.test(p);
  const isImob = /imobili|imóv|casa|apart|alugu|comprar imóv/i.test(p);
  const isFitness = /academi|fitness|treino|aula|matrícula|gym/i.test(p);

  const steps: { type: string; text: string; buttons?: string[] }[] = [
    { type: "contact", text: "🤖 Analisando seu objetivo..." },
    { type: "contact", text: `📝 "${shortPrompt}"` },
  ];

  if (isVendas) {
    steps.push(
      { type: "bot", text: "Olá! 👋 Seja muito bem-vindo! Sou o assistente virtual." },
      { type: "user", text: "Oi, quero saber mais sobre os produtos" },
      { type: "bot", text: "Ótimo! Temos várias opções. Vou te ajudar a encontrar o ideal!" },
      { type: "buttons", text: "O que você procura?", buttons: ["💰 Ver preços", "📦 Catálogo", "🤝 Falar com vendedor"] },
      { type: "user", text: "Ver preços" },
      { type: "bot", text: "Perfeito! Qual é o seu orçamento aproximado?" },
      { type: "user", text: "Entre R$500 e R$1.000" },
      { type: "bot", text: "Tenho a opção ideal pra você! ✨ Vou enviar a proposta." },
      { type: "contact", text: "⚡ Adicionando follow-up automático (2h)..." },
      { type: "bot", text: "Posso confirmar o envio da proposta?" },
      { type: "buttons", text: "Confirme:", buttons: ["✅ Sim, enviar", "🔄 Outras opções"] },
    );
  } else if (isSuporte) {
    steps.push(
      { type: "bot", text: "Olá! 👋 Bem-vindo ao suporte. Como posso ajudar?" },
      { type: "buttons", text: "Qual o tipo do seu problema?", buttons: ["🛠 Técnico", "💳 Financeiro", "❓ Dúvida geral"] },
      { type: "user", text: "Técnico" },
      { type: "bot", text: "Entendido! Vou tentar resolver rapidamente." },
      { type: "bot", text: "Pode descrever o problema que está enfrentando?" },
      { type: "user", text: "Não consigo acessar minha conta" },
      { type: "bot", text: "Você já tentou redefinir sua senha?" },
      { type: "buttons", text: "Isso resolveu?", buttons: ["✅ Sim!", "❌ Preciso de mais ajuda"] },
      { type: "contact", text: "🔄 Configurando escalonamento para atendente..." },
    );
  } else if (isAgendamento) {
    steps.push(
      { type: "bot", text: "Olá! 👋 Vamos agendar seu horário." },
      { type: "buttons", text: "Qual especialidade?", buttons: ["🏥 Clínico", "🦷 Dentista", "👁 Oftalmo"] },
      { type: "user", text: "Clínico" },
      { type: "bot", text: "Temos horários disponíveis esta semana!" },
      { type: "buttons", text: "Escolha o melhor dia:", buttons: ["📅 Segunda", "📅 Quarta", "📅 Sexta"] },
      { type: "user", text: "Quarta" },
      { type: "bot", text: "✅ Consulta agendada! Enviaremos lembrete 24h antes." },
      { type: "contact", text: "📋 Criando lembrete automático (24h antes)..." },
    );
  } else if (isRestaurante) {
    steps.push(
      { type: "bot", text: "Olá! 🍕 Bem-vindo ao nosso delivery!" },
      { type: "buttons", text: "Veja nosso cardápio:", buttons: ["🍔 Pratos", "🥤 Bebidas", "🍰 Sobremesas"] },
      { type: "user", text: "Pratos" },
      { type: "bot", text: "Temos opções incríveis hoje! Vou listar." },
      { type: "bot", text: "1. Hambúrguer Artesanal - R$32\n2. Pizza Margherita - R$45\n3. Salada Caesar - R$28" },
      { type: "user", text: "Quero o hambúrguer" },
      { type: "bot", text: "Ótima escolha! 🍔 Qual o endereço de entrega?" },
      { type: "contact", text: "📍 Coletando endereço e finalizando pedido..." },
    );
  } else if (isImob) {
    steps.push(
      { type: "bot", text: "Olá! 🏠 Procurando o imóvel ideal?" },
      { type: "buttons", text: "Tipo de imóvel:", buttons: ["🏠 Casa", "🏢 Apartamento", "🏪 Comercial"] },
      { type: "user", text: "Apartamento" },
      { type: "bot", text: "Qual região e faixa de valor?" },
      { type: "user", text: "Centro, até R$500 mil" },
      { type: "bot", text: "Encontrei 3 opções perfeitas! Vou enviar as fotos." },
      { type: "buttons", text: "Quer agendar visita?", buttons: ["📅 Agendar", "📸 Ver mais fotos"] },
      { type: "contact", text: "🗓 Agendando visita ao imóvel..." },
    );
  } else if (isFitness) {
    steps.push(
      { type: "bot", text: "Olá! 💪 Bem-vindo à nossa academia!" },
      { type: "buttons", text: "Conheça nossos planos:", buttons: ["📅 Mensal", "📅 Trimestral", "📅 Anual"] },
      { type: "user", text: "Quero saber do mensal" },
      { type: "bot", text: "Plano mensal: R$99/mês com acesso completo!" },
      { type: "bot", text: "Quer agendar uma aula experimental gratuita?" },
      { type: "buttons", text: "Agendar aula?", buttons: ["✅ Quero!", "💬 Tenho dúvidas"] },
      { type: "contact", text: "🎯 Agendando aula experimental..." },
    );
  } else {
    // Generic flow
    steps.push(
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
      { type: "bot", text: "Posso enviar a proposta?" },
      { type: "buttons", text: "Confirme:", buttons: ["✅ Sim", "🔄 Outra opção"] },
    );
  }

  steps.push({ type: "contact", text: "✅ Fluxo completo gerado com sucesso!" });
  return steps;
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
function PhoneSimulation({ flowName, userPrompt, isFinished }: { flowName: string; userPrompt: string; isFinished: boolean }) {
  const { profile } = useAuth();
  const agentName = `Agente ${profile?.name?.split(" ")[0] || "Wiize"}`;
  const simulationSteps = buildSimulationSteps(userPrompt);
  const [messages, setMessages] = useState<typeof simulationSteps>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(2);
  const [rotateY, setRotateY] = useState(-3);

  // 3D mouse-follow effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!phoneRef.current) return;
      const rect = phoneRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const x = (e.clientX - centerX) / (rect.width / 2);
      const y = (e.clientY - centerY) / (rect.height / 2);
      setRotateY(x * 3);
      setRotateX(-y * 2);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

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

  const simulationDone = currentStep >= simulationSteps.length;

  return (
    <motion.div
      className="flex flex-col items-center justify-center"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Glow behind phone */}
      <div className="absolute w-[400px] h-[600px] bg-primary/15 rounded-full filter blur-[100px] pointer-events-none" />

      {/* 3D Phone Frame */}
      <div className="relative" style={{ perspective: "1200px" }} ref={phoneRef}>
        <motion.div
          className="relative w-[300px] h-[620px]"
          animate={{ rotateX, rotateY }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Phone body */}
          <div
            className="absolute inset-0 rounded-[3rem] bg-gradient-to-b from-[#2a2a2a] to-[#1a1a1a]"
            style={{
              boxShadow: "0 25px 60px -15px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05) inset, -8px 8px 20px rgba(0,0,0,0.3)",
            }}
          >
            <div className="absolute inset-0 rounded-[3rem] border border-[#444] pointer-events-none" />
            <div className="absolute inset-[1px] rounded-[3rem] border border-[#222] pointer-events-none" />
            <div className="absolute -left-[2px] top-[100px] w-[3px] h-[28px] bg-gradient-to-r from-[#555] to-[#333] rounded-l-sm shadow-md" />
            <div className="absolute -left-[2px] top-[145px] w-[3px] h-[50px] bg-gradient-to-r from-[#555] to-[#333] rounded-l-sm shadow-md" />
            <div className="absolute -left-[2px] top-[205px] w-[3px] h-[50px] bg-gradient-to-r from-[#555] to-[#333] rounded-l-sm shadow-md" />
            <div className="absolute -right-[2px] top-[150px] w-[3px] h-[55px] bg-gradient-to-l from-[#555] to-[#333] rounded-r-sm shadow-md" />
          </div>

          {/* Screen area */}
          <div className="absolute top-[8px] left-[8px] right-[8px] bottom-[8px] rounded-[2.6rem] overflow-hidden flex flex-col bg-background">
            {/* Status bar */}
            <div className="bg-primary pt-2 px-6 flex items-center justify-between h-8 shrink-0">
              <span className="text-primary-foreground/80 text-[10px] font-medium">9:41</span>
              <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-[80px] h-[20px] bg-[#1a1a1a] rounded-full flex items-center justify-center">
                <div className="w-[8px] h-[8px] rounded-full bg-[#333] border border-[#444]" />
              </div>
              <div className="flex items-center gap-1">
                <div className="flex items-end gap-[1px]">
                  {[5, 7, 9, 11].map((h, i) => (
                    <div key={i} className="w-[2px] bg-primary-foreground/80 rounded-full" style={{ height: `${h}px` }} />
                  ))}
                </div>
                <span className="text-primary-foreground/80 text-[8px] font-semibold ml-0.5">5G</span>
                <div className="ml-1 w-[18px] h-[9px] border border-primary-foreground/60 rounded-[2px] relative">
                  <div className="absolute inset-[1px] rounded-[1px] bg-primary-foreground/70" style={{ width: "70%" }} />
                  <div className="absolute -right-[2px] top-[2px] w-[1px] h-[4px] bg-primary-foreground/60 rounded-r-full" />
                </div>
              </div>
            </div>

            {/* WhatsApp-style header */}
            <div className="bg-primary pb-3 px-4 flex items-center gap-3 pt-1">
              <div className="w-9 h-9 rounded-full bg-primary-foreground/20 flex items-center justify-center text-primary-foreground text-xs font-bold">
                🤖
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-primary-foreground text-sm font-semibold truncate">{agentName}</p>
                <p className="text-primary-foreground/60 text-[10px]">online</p>
              </div>
            </div>

            {/* Chat area */}
            <div
              className="flex-1 overflow-y-auto px-3 py-3 space-y-2 relative"
              style={{
                backgroundColor: "hsl(var(--muted) / 0.3)",
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            >
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
                      <div className="max-w-[80%] bg-primary text-primary-foreground text-xs px-3 py-2 rounded-xl rounded-tr-sm shadow-sm">{msg.text}</div>
                    </motion.div>
                  );
                }
                if (msg.type === "buttons") {
                  return (
                    <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex justify-start">
                      <div className="max-w-[85%]">
                        <div className="bg-card border border-border text-foreground text-xs px-3 py-2 rounded-xl rounded-tl-sm mb-1 shadow-sm">{msg.text}</div>
                        <div className="flex flex-wrap gap-1">
                          {msg.buttons?.map((b, bi) => (
                            <span key={bi} className="text-[10px] bg-card text-primary px-2.5 py-1 rounded-lg border border-primary/20 shadow-sm">{b}</span>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  );
                }
                return (
                  <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex justify-start">
                    <div className="max-w-[80%] bg-card border border-border text-foreground text-xs px-3 py-2 rounded-xl rounded-tl-sm shadow-sm">{msg.text}</div>
                  </motion.div>
                );
              })}

              {currentStep < simulationSteps.length && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                  <div className="bg-card border border-border px-3 py-2 rounded-xl rounded-tl-sm flex items-center gap-1 shadow-sm">
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

          {/* Bottom chin indicator */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[100px] h-[4px] bg-[#444] rounded-full" />
        </motion.div>
      </div>

      {/* Status text - changes based on state */}
      <motion.div className="mt-8 text-center">
        {isFinished ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-sm text-primary font-medium"
          >
            <CheckCircle2 size={18} className="text-primary" />
            Fluxo criado! Abrindo...
          </motion.div>
        ) : simulationDone && !isFinished ? (
          <motion.p
            className="text-sm text-muted-foreground flex items-center gap-2"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <Sparkles size={16} className="text-primary animate-spin" style={{ animationDuration: "3s" }} />
            Finalizando a geração do fluxo...
          </motion.p>
        ) : (
          <motion.p
            className="text-sm text-muted-foreground flex items-center gap-2"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <MessageSquare size={16} className="text-primary" />
            Criando seu fluxo com IA...
          </motion.p>
        )}
      </motion.div>
    </motion.div>
  );
}

export default function CreateFlowAI() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { trackScoreEvent } = useAutoScoreTracking("create_flow_ai");
  const [prompt, setPrompt] = useState("");
  const [expandedPrompt, setExpandedPrompt] = useState<number | null>(null);
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({ minHeight: 56, maxHeight: 240 });

  const [reviewFlowId, setReviewFlowId] = useState<string | null>(null);
  const [showReviewPopup, setShowReviewPopup] = useState(false);
  const [showDailyLimit, setShowDailyLimit] = useState(false);
  const [dailyCount, setDailyCount] = useState(0);

  const DAILY_LIMIT = 3;

  // Check daily AI flow creation count
  useEffect(() => {
    if (!user) return;
    const today = new Date().toISOString().slice(0, 10);
    const key = `ai_flow_count_${user.id}_${today}`;
    const count = parseInt(localStorage.getItem(key) || "0", 10);
    setDailyCount(count);
  }, [user]);

  const incrementDailyCount = () => {
    if (!user) return;
    const today = new Date().toISOString().slice(0, 10);
    const key = `ai_flow_count_${user.id}_${today}`;
    const newCount = dailyCount + 1;
    localStorage.setItem(key, String(newCount));
    setDailyCount(newCount);
  };

  useEffect(() => {
    const p = searchParams.get("prompt");
    if (p) setPrompt(p);
  }, [searchParams]);

  // Auto-resize textarea when prompt changes (e.g. typing animation)
  useEffect(() => {
    requestAnimationFrame(() => adjustHeight());
  }, [prompt, adjustHeight]);

  const canCreateWithAI = dailyCount < DAILY_LIMIT;

  const createWithAI = useMutation({
    mutationFn: async () => {
      if (!prompt.trim()) throw new Error("Descreva o que deseja para o fluxo");
      if (!canCreateWithAI) {
        setShowDailyLimit(true);
        throw new Error("__limit__");
      }
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
      incrementDailyCount();
      setReviewFlowId(flow.id);
      setTimeout(() => {
        setShowReviewPopup(true);
      }, 1500);
    },
    onError: (err: any) => {
      if (err.message === "__limit__") return;
      toast.error(err.message || "Erro ao gerar fluxo com IA");
    },
  });

  const handleGoToFlow = () => {
    setShowReviewPopup(false);
    if (reviewFlowId) navigate(`/fluxos/${reviewFlowId}`);
  };

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
      if (!canCreateWithAI) { setShowDailyLimit(true); return; }
      if (prompt.trim() && !createWithAI.isPending) createWithAI.mutate();
    }
  };

  const isGenerating = createWithAI.isPending || (createWithAI.isSuccess && !showReviewPopup);

  // Loading state - show phone simulation
  if (isGenerating) {
    return (
      <div className="min-h-screen bg-background flex w-full">
        <AppSidebar profile={profile} />
        <div className="flex-1 flex flex-col lg:ml-[72px]">
          <AppHeader profile={profile} />
          <MobileNav profile={profile} />
          <BackgroundGlow />
          <main className="flex-1 flex items-center justify-center px-4">
            <PhoneSimulation flowName={prompt.slice(0, 30)} userPrompt={prompt} isFinished={createWithAI.isSuccess} />
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
                <svg className="w-3.5 h-3.5" viewBox="0 0 32 32" fill="none">
                  <path d="M16 2L18.5 11.5L28 16L18.5 20.5L16 30L13.5 20.5L4 16L13.5 11.5L16 2Z" fill="#34A853"/>
                  <path d="M25 4L26 7.5L29.5 9L26 10.5L25 14L24 10.5L20.5 9L24 7.5L25 4Z" fill="#34A853" opacity="0.6"/>
                  <path d="M7 22L8 24.5L10.5 25.5L8 26.5L7 29L6 26.5L3.5 25.5L6 24.5L7 22Z" fill="#34A853" opacity="0.5"/>
                </svg>
                Descreva. Nós montamos o fluxo.
              </div>

              <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">
                Crie <span className="text-shimmer-highlight whitespace-nowrap">fluxos inteligentes</span><br />para o WhatsApp
              </h1>

               <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
                Descreva seu objetivo e a IA monta automaticamente um fluxo completo.
              </p>

              <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground/40 tracking-widest uppercase font-medium select-none">
                <span>powered by</span>
                <span className="text-primary/50 font-bold tracking-wider">Wiize IA</span>
              </div>
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

              <div className="flex items-center justify-between pt-2 border-t border-border/30">
                <span className="text-[10px] text-muted-foreground/50">{dailyCount}/{DAILY_LIMIT} criações hoje</span>
                <motion.button
                  type="button"
                  onClick={() => { if (!canCreateWithAI) { setShowDailyLimit(true); return; } createWithAI.mutate(); }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  disabled={!prompt.trim()}
                  className={cn(
                    "px-5 py-2.5 rounded-full text-sm font-semibold transition-all flex items-center gap-2 btn-shine relative overflow-hidden",
                    prompt.trim()
                      ? "text-white shadow-lg"
                      : "bg-muted text-muted-foreground"
                  )}
                  style={prompt.trim() ? {
                    background: "linear-gradient(135deg, #4285F4, #34A853, #8BC34A)",
                    boxShadow: "0 4px 16px rgba(66, 133, 244, 0.3)",
                  } : undefined}
                >
                  {/* Animated white star */}
                  <motion.svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="white"
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  >
                    <path d="M12 0L14.59 8.41L23 12L14.59 15.59L12 24L9.41 15.59L1 12L9.41 8.41L12 0Z" />
                  </motion.svg>
                  <span>Criar fluxo</span>
                </motion.button>
              </div>
            </motion.div>

            {/* Quick prompts - 3 per row */}
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground text-center">Ou escolha um prompt pronto:</p>
              <div className="flex flex-wrap justify-center gap-2">
                {quickPrompts.map((qp, index) => (
                  <motion.button
                    key={index}
                    onClick={() => handleSelectPrompt(index)}
                    className={cn(
                      "px-4 py-2 rounded-full border transition-all text-xs font-medium",
                      expandedPrompt === index
                        ? "border-primary/40 bg-primary/5 text-foreground"
                        : "border-border bg-card/50 text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-foreground"
                    )}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.05 }}
                  >
                    {qp.preview}
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Review Popup */}
      <Dialog open={showReviewPopup} onOpenChange={setShowReviewPopup}>
        <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden border-border">
          {/* Success header */}
          <div className="bg-primary/5 border-b border-border px-6 py-5 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
              className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center mx-auto mb-3"
            >
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </motion.div>
            <h2 className="text-lg font-bold text-foreground">Fluxo criado com sucesso!</h2>
            <p className="text-sm text-muted-foreground mt-1">Seu fluxo está pronto para revisão</p>
          </div>

          {/* Recommendations */}
          <div className="px-6 py-5 space-y-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Recomendações</p>

            <div className="space-y-3">
              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle size={14} className="text-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Confira as conexões</p>
                  <p className="text-xs text-muted-foreground">Verifique se todos os blocos estão conectados corretamente entre si.</p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Settings2 size={14} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Personalize as mensagens</p>
                  <p className="text-xs text-muted-foreground">Ajuste o tom, links e informações específicas do seu negócio.</p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Zap size={14} className="text-violet-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Teste antes de ativar</p>
                  <p className="text-xs text-muted-foreground">Use o botão "Testar fluxo" para simular a experiência do lead.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action */}
          <div className="px-6 py-4 border-t border-border bg-card/50">
            <Button onClick={handleGoToFlow} className="w-full gap-2 rounded-full">
              <Sparkles size={14} />
              Abrir e revisar fluxo
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Daily Limit Dialog */}
      <DailyLimitDialog 
        open={showDailyLimit} 
        onOpenChange={setShowDailyLimit} 
        remaining={DAILY_LIMIT - dailyCount} 
      />
    </div>
  );
}
