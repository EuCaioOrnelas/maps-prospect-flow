import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Heart, Send as SendIcon, Sparkles } from "lucide-react";
import { FaInstagram } from "react-icons/fa";
import { useAuth } from "@/contexts/AuthContext";

type IGStep = { type: "system" | "comment" | "reply" | "bot" | "user" | "buttons"; text: string; buttons?: string[] };

function buildInstagramSteps(userPrompt: string): IGStep[] {
  const p = userPrompt.toLowerCase();
  const shortPrompt = userPrompt.length > 40 ? userPrompt.slice(0, 40) + "..." : userPrompt;

  const isVendas = /vend|compra|proposta|preço|orçamento|produto|serviço|loja|ecommerce/i.test(p);
  const isSuporte = /suport|ajuda|problema|técnic|atendiment|dúvida|reclamaç/i.test(p);
  const isAgendamento = /agend|consult|clínic|médic|horári|visita|reunião|marcar/i.test(p);

  const steps: IGStep[] = [
    { type: "system", text: "🤖 Analisando seu objetivo..." },
    { type: "system", text: `📝 "${shortPrompt}"` },
    { type: "comment", text: "quero saber o preço 🙌" },
    { type: "system", text: "💬 Gatilho: palavra-chave no comentário" },
    { type: "reply", text: "Te mandei tudo no direct! 📩" },
    { type: "system", text: "📩 Abrindo conversa no Direct..." },
  ];

  if (isVendas) {
    steps.push(
      { type: "bot", text: "Oi! 👋 Vi seu comentário no post. Posso te mostrar as opções?" },
      { type: "user", text: "Pode sim!" },
      { type: "buttons", text: "O que você procura?", buttons: ["💰 Preços", "📦 Catálogo", "🤝 Falar com alguém"] },
      { type: "user", text: "Preços" },
      { type: "bot", text: "Perfeito! Temos planos a partir de R$97. Quer receber a proposta?" },
      { type: "system", text: "⚡ Adicionando follow-up automático (2h)..." },
    );
  } else if (isSuporte) {
    steps.push(
      { type: "bot", text: "Oi! 👋 Vi sua mensagem, vou te ajudar por aqui." },
      { type: "buttons", text: "Qual o tipo do seu problema?", buttons: ["🛠 Técnico", "💳 Financeiro", "❓ Dúvida"] },
      { type: "user", text: "Técnico" },
      { type: "bot", text: "Entendi! Me conta rapidinho o que aconteceu 👇" },
      { type: "system", text: "🔄 Configurando transferência para humano..." },
    );
  } else if (isAgendamento) {
    steps.push(
      { type: "bot", text: "Oi! 👋 Vamos agendar seu horário pelo direct?" },
      { type: "buttons", text: "Melhor dia pra você:", buttons: ["📅 Segunda", "📅 Quarta", "📅 Sexta"] },
      { type: "user", text: "Quarta" },
      { type: "bot", text: "✅ Agendado! Te lembro 24h antes por aqui." },
      { type: "system", text: "📋 Criando lembrete automático..." },
    );
  } else {
    steps.push(
      { type: "bot", text: "Oi! 👋 Que bom te ver por aqui. Como posso ajudar?" },
      { type: "buttons", text: "Escolha uma opção:", buttons: ["💰 Comprar", "🛠 Suporte", "❓ Dúvidas"] },
      { type: "user", text: "Quero comprar" },
      { type: "bot", text: "Show! Vou te qualificar rapidinho 🎯" },
      { type: "system", text: "🧠 Conectando blocos de qualificação..." },
    );
  }

  steps.push({ type: "system", text: "✨ Montando o fluxo no editor..." });
  return steps;
}

function TypingDots() {
  return (
    <div className="flex items-center ml-1">
      {[1, 2, 3].map((dot) => (
        <motion.div
          key={dot}
          className="w-1.5 h-1.5 bg-pink-500 rounded-full mx-0.5"
          animate={{ opacity: [0.3, 0.9, 0.3], scale: [0.85, 1.1, 0.85] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: dot * 0.15, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

export function InstagramAISimulation({ userPrompt, isFinished }: { userPrompt: string; isFinished: boolean }) {
  const { profile } = useAuth();
  const handle = (profile?.name?.split(" ")[0] || "wiize").toLowerCase();
  const steps = buildInstagramSteps(userPrompt);
  const [messages, setMessages] = useState<IGStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(2);
  const [rotateY, setRotateY] = useState(-3);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!phoneRef.current) return;
      const rect = phoneRef.current.getBoundingClientRect();
      const x = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
      const y = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
      setRotateY(x * 3);
      setRotateX(-y * 2);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    if (currentStep >= steps.length) return;
    const timer = setTimeout(() => {
      setMessages((prev) => [...prev, steps[currentStep]]);
      setCurrentStep((s) => s + 1);
    }, 1200 + Math.random() * 700);
    return () => clearTimeout(timer);
  }, [currentStep, steps.length]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const simulationDone = currentStep >= steps.length;

  return (
    <motion.div
      className="flex flex-col items-center justify-center"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="absolute w-[400px] h-[600px] bg-pink-500/15 rounded-full filter blur-[100px] pointer-events-none" />

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

          {/* Screen */}
          <div className="absolute top-[8px] left-[8px] right-[8px] bottom-[8px] rounded-[2.6rem] overflow-hidden flex flex-col bg-background">
            {/* Status bar */}
            <div className="bg-gradient-to-r from-fuchsia-600 via-pink-500 to-amber-500 pt-2 px-6 flex items-center justify-between h-8 shrink-0">
              <span className="text-white/85 text-[10px] font-medium">9:41</span>
              <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-[80px] h-[20px] bg-[#1a1a1a] rounded-full flex items-center justify-center">
                <div className="w-[8px] h-[8px] rounded-full bg-[#333] border border-[#444]" />
              </div>
              <div className="flex items-center gap-1">
                <div className="flex items-end gap-[1px]">
                  {[5, 7, 9, 11].map((h, i) => (
                    <div key={i} className="w-[2px] bg-white/80 rounded-full" style={{ height: `${h}px` }} />
                  ))}
                </div>
                <span className="text-white/80 text-[8px] font-semibold ml-0.5">5G</span>
                <div className="ml-1 w-[18px] h-[9px] border border-white/60 rounded-[2px] relative">
                  <div className="absolute inset-[1px] rounded-[1px] bg-white/70" style={{ width: "70%" }} />
                </div>
              </div>
            </div>

            {/* Instagram Direct header */}
            <div className="bg-gradient-to-r from-fuchsia-600 via-pink-500 to-amber-500 pb-3 px-4 flex items-center gap-3 pt-1">
              <div className="w-9 h-9 rounded-full bg-white/20 ring-2 ring-white/60 flex items-center justify-center">
                <FaInstagram size={16} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold truncate">@{handle}</p>
                <p className="text-white/75 text-[10px]">Direct · ativo agora</p>
              </div>
            </div>

            {/* Feed / chat area */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-muted/20">
              {messages.map((msg, i) => {
                if (msg.type === "system") {
                  return (
                    <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center">
                      <span className="text-[10px] bg-muted text-muted-foreground px-3 py-1 rounded-full">{msg.text}</span>
                    </motion.div>
                  );
                }
                if (msg.type === "comment" || msg.type === "reply") {
                  const isReply = msg.type === "reply";
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={isReply ? "pl-7" : ""}
                    >
                      <div className="rounded-xl border border-border bg-card px-3 py-2 shadow-sm">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-fuchsia-600 via-pink-500 to-amber-400" />
                          <span className="text-[10px] font-semibold text-foreground">
                            {isReply ? `@${handle}` : "@lead.novo"}
                          </span>
                          <span className="text-[9px] text-muted-foreground">
                            {isReply ? "resposta automática" : "comentou no post"}
                          </span>
                        </div>
                        <p className="text-xs text-foreground">{msg.text}</p>
                        <div className="flex items-center gap-1 mt-1 text-[9px] text-muted-foreground">
                          <Heart size={10} className="text-pink-500" /> curtido pelo autor
                        </div>
                      </div>
                    </motion.div>
                  );
                }
                if (msg.type === "user") {
                  return (
                    <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex justify-end">
                      <div className="max-w-[80%] bg-gradient-to-r from-fuchsia-600 to-pink-500 text-white text-xs px-3 py-2 rounded-2xl rounded-br-sm shadow-sm">
                        {msg.text}
                      </div>
                    </motion.div>
                  );
                }
                if (msg.type === "buttons") {
                  return (
                    <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex justify-start">
                      <div className="max-w-[85%]">
                        <div className="bg-card border border-border text-foreground text-xs px-3 py-2 rounded-2xl rounded-bl-sm mb-1 shadow-sm">
                          {msg.text}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {msg.buttons?.map((b, bi) => (
                            <span key={bi} className="text-[10px] bg-card text-pink-500 px-2.5 py-1 rounded-full border border-pink-500/30 shadow-sm">
                              {b}
                            </span>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  );
                }
                return (
                  <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex justify-start">
                    <div className="max-w-[80%] bg-card border border-border text-foreground text-xs px-3 py-2 rounded-2xl rounded-bl-sm shadow-sm">
                      {msg.text}
                    </div>
                  </motion.div>
                );
              })}

              {!simulationDone && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                  <div className="bg-card border border-border px-3 py-2 rounded-2xl rounded-bl-sm flex items-center gap-1 shadow-sm">
                    <TypingDots />
                  </div>
                </motion.div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Bottom bar */}
            <div className="h-12 bg-card border-t border-border flex items-center px-3 gap-2 shrink-0">
              <div className="flex-1 h-8 rounded-full bg-muted px-3 flex items-center">
                <span className="text-muted-foreground text-[10px]">Mensagem...</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-fuchsia-600 via-pink-500 to-amber-400 flex items-center justify-center">
                <SendIcon size={14} className="text-white" />
              </div>
            </div>
          </div>

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[100px] h-[4px] bg-[#444] rounded-full" />
        </motion.div>
      </div>

      <motion.div className="mt-8 text-center">
        {isFinished ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 text-sm text-pink-500 font-medium">
            <CheckCircle2 size={18} /> Fluxo criado! Abrindo...
          </motion.div>
        ) : simulationDone ? (
          <motion.p
            className="text-sm text-muted-foreground flex items-center gap-2"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <Sparkles size={16} className="text-pink-500 animate-spin" style={{ animationDuration: "3s" }} />
            Finalizando a geração do fluxo...
          </motion.p>
        ) : (
          <motion.p
            className="text-sm text-muted-foreground flex items-center gap-2"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <FaInstagram size={16} className="text-pink-500" />
            Criando seu fluxo de Instagram com IA...
          </motion.p>
        )}
      </motion.div>
    </motion.div>
  );
}
