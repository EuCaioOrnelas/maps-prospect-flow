import { motion } from "framer-motion";
import { Bot, Sparkles, MessageSquare, Zap, Clock, Target, CheckCircle, Brain, Wand2, ArrowRight, GitBranch, Smartphone, Shield, BarChart3, Users, Settings } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

export const AIAgentsSection = () => {
 const { ref, isVisible } = useScrollAnimation();

 const pillars = [
 {
 icon: Wand2,
 title: "Criação Simples",
 subtitle: "Sem prompts complexos",
 description: "Escolha o objetivo, defina o tom de voz e pronto. A IA monta o agente ideal para você em poucos cliques.",
 },
 {
 icon: GitBranch,
 title: "Integração com CRM",
 subtitle: "Status automático",
 description: "O agente atualiza o estágio do lead no CRM conforme a conversa evolui. Sem intervenção manual.",
 },
 {
 icon: Smartphone,
 title: "1 Agente por Número",
 subtitle: "Dedicado e focado",
 description: "Cada número WhatsApp tem seu próprio agente, garantindo consistência e personalização nas respostas.",
 },
 ];

 const capabilities = [
 { icon: Clock, text: "Responde leads em segundos, 24 horas por dia" },
 { icon: Target, text: "Qualifica leads automaticamente com base na conversa" },
 { icon: Brain, text: "Adapta o tom: profissional, casual ou técnico" },
 { icon: Shield, text: "Respeita horário comercial configurado por você" },
 { icon: BarChart3, text: "Métricas de conversas e taxa de resposta em tempo real" },
 { icon: Users, text: "Move leads entre estágios do CRM automaticamente" },
 ];

 const comparisonItems = [
 { traditional: "Fluxos complexos com dezenas de blocos", wiize: "Descreva o comportamento em linguagem natural" },
 { traditional: "Precisa de desenvolvedor para configurar", wiize: "Qualquer pessoa configura em 5 minutos" },
 { traditional: "Respostas robóticas e genéricas", wiize: "IA contextual que entende a conversa" },
 { traditional: "CRM desconectado do chatbot", wiize: "Status do lead atualizado automaticamente" },
 ];

 return (
 <section
 id="ai-agents"
 className="py-20 md:py-32 relative overflow-hidden w-full"
 ref={ref as React.RefObject<HTMLElement>}
 >
 {/* No custom background - inherits site background */}

 <div className="container mx-auto px-4 relative z-10 max-w-6xl">
 {/* Header */}
 <div
 className={`text-center mb-16 md:mb-20 transition-all duration-700 ${
 isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
 }`}
 >
 <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 mb-6">
 <Bot size={16} className="text-primary" />
 <span className="text-sm text-muted-foreground font-medium">Agentes de IA para WhatsApp</span>
 <span className="px-2 py-0.5 bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold rounded-full uppercase tracking-wide">Beta</span>
 </div>

 <h2 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-bold mb-5 leading-tight text-foreground">
 Seu melhor vendedor trabalha<br />
 <span className="text-shimmer-highlight">24 horas por dia</span>
 </h2>
 <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
 Crie um agente de IA que responde, qualifica e organiza seus leads no CRM.
 Sem código, sem prompts complexos, sem esforço.
 </p>
 </div>

 {/* 3 Pillars */}
 <div className="grid md:grid-cols-3 gap-5 lg:gap-6 mb-16 md:mb-20">
 {pillars.map((pillar, index) => (
 <motion.div
 key={index}
 initial={{ opacity: 0, y: 30 }}
 whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, amount: 0.1 }}
 transition={{ duration: 0.5, delay: index * 0.12 }}
 className="group relative rounded-2xl border border-border/60 bg-card/95 p-7 hover:border-primary/30 hover:bg-card/80 transition-all duration-300"
 >
 <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
 <pillar.icon className="w-6 h-6 text-primary" />
 </div>
 <h3 className="font-display text-lg font-semibold text-foreground mb-1">{pillar.title}</h3>
 <p className="text-sm text-primary/80 font-medium mb-3">{pillar.subtitle}</p>
 <p className="text-sm text-muted-foreground leading-relaxed">{pillar.description}</p>
 </motion.div>
 ))}
 </div>

 {/* Visual Demo + Capabilities */}
 <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 mb-16 md:mb-20 items-center">
 {/* Left: Prompt demo */}
 <motion.div
 initial={{ opacity: 0, x: -30 }}
 whileInView={{ opacity: 1, x: 0 }}
  viewport={{ once: true, amount: 0.1 }}
 transition={{ duration: 0.6 }}
 >
 <div className="rounded-2xl border border-border/60 bg-card/80 overflow-hidden">
 {/* Window bar */}
 <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border/40 bg-secondary/30">
 <div className="w-3 h-3 rounded-full bg-destructive/60" />
 <div className="w-3 h-3 rounded-full bg-warning/60" />
 <div className="w-3 h-3 rounded-full bg-primary/60" />
 <span className="text-xs text-muted-foreground ml-3 font-medium">Configuração do Agente</span>
 </div>

 <div className="p-6 space-y-5">
 {/* Field: Objective */}
 <div>
 <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1.5 block">Objetivo</label>
 <div className="rounded-lg bg-secondary/40 border border-border/30 px-4 py-2.5 text-sm text-foreground/90">
 Qualificar leads e agendar reuniões
 </div>
 </div>

 {/* Field: Tone */}
 <div>
 <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1.5 block">Tom de voz</label>
 <div className="flex gap-2">
 {["Profissional", "Casual", "Técnico"].map((tone, i) => (
 <span
 key={tone}
 className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
 i === 0
 ? "bg-primary/15 border-primary/30 text-primary"
 : "bg-secondary/30 border-border/30 text-muted-foreground"
 }`}
 >
 {tone}
 </span>
 ))}
 </div>
 </div>

 {/* Field: CRM Integration */}
 <div>
 <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1.5 block">Integração CRM</label>
 <div className="space-y-2">
 <div className="flex items-center justify-between rounded-lg bg-secondary/40 border border-border/30 px-4 py-2.5">
 <span className="text-sm text-foreground/90">Ao receber resposta</span>
 <span className="text-xs bg-primary/15 text-primary px-2.5 py-1 rounded-md font-medium">→ Interessado</span>
 </div>
 <div className="flex items-center justify-between rounded-lg bg-secondary/40 border border-border/30 px-4 py-2.5">
 <span className="text-sm text-foreground/90">Ao encerrar conversa</span>
 <span className="text-xs bg-amber-500/15 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-md font-medium">→ Negociação</span>
 </div>
 </div>
 </div>

 {/* Status indicator */}
 <div className="flex items-center gap-2 pt-2">
 <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
 <span className="text-xs text-primary font-medium">Agente pronto para ativar</span>
 </div>
 </div>
 </div>
 </motion.div>

 {/* Right: Capabilities list */}
 <motion.div
 initial={{ opacity: 0, x: 30 }}
 whileInView={{ opacity: 1, x: 0 }}
  viewport={{ once: true, amount: 0.1 }}
 transition={{ duration: 0.6 }}
 className="space-y-6"
 >
 <div>
 <h3 className="font-display text-2xl md:text-3xl font-bold mb-3">
 Tudo que o agente faz por você
 </h3>
 <p className="text-muted-foreground leading-relaxed">
 Configure uma vez e deixe a IA cuidar do operacional. Cada interação é uma oportunidade que não será perdida.
 </p>
 </div>

 <div className="space-y-3">
 {capabilities.map((cap, index) => (
 <motion.div
 key={index}
 initial={{ opacity: 0, x: 20 }}
 whileInView={{ opacity: 1, x: 0 }}
  viewport={{ once: true, amount: 0.1 }}
 transition={{ duration: 0.4, delay: index * 0.08 }}
 className="flex items-center gap-4 p-3.5 rounded-xl bg-card/50 border border-border/30 hover:border-primary/20 transition-colors"
 >
 <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
 <cap.icon className="w-4.5 h-4.5 text-primary" size={18} />
 </div>
 <span className="text-sm text-foreground/90">{cap.text}</span>
 </motion.div>
 ))}
 </div>
 </motion.div>
 </div>

 {/* Comparison: Traditional vs Wiize */}
 <motion.div
 initial={{ opacity: 0, y: 30 }}
 whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, amount: 0.1 }}
 transition={{ duration: 0.6 }}
 className="rounded-2xl border border-border/60 bg-card/95 overflow-hidden"
 >
 <div className="p-6 md:p-8 border-b border-border/30">
 <div className="flex items-center gap-3 mb-2">
 <Sparkles className="w-5 h-5 text-primary" />
 <h3 className="font-display text-xl md:text-2xl font-semibold">Por que é diferente</h3>
 </div>
 <p className="text-sm text-muted-foreground">Chatbots tradicionais vs. Agente Wiize: sem comparação.</p>
 </div>

 <div className="divide-y divide-border/20">
 {/* Header row */}
 <div className="grid grid-cols-2 gap-4 px-6 md:px-8 py-4 bg-secondary/20">
 <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Chatbots tradicionais</div>
 <div className="text-xs font-semibold text-primary uppercase tracking-wider">Agente Wiize</div>
 </div>

 {comparisonItems.map((item, index) => (
 <div key={index} className="grid grid-cols-2 gap-4 px-6 md:px-8 py-4 hover:bg-secondary/10 transition-colors">
 <div className="flex items-start gap-2.5">
 <span className="text-destructive/60 mt-0.5 flex-shrink-0">✕</span>
 <span className="text-sm text-muted-foreground">{item.traditional}</span>
 </div>
 <div className="flex items-start gap-2.5">
 <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
 <span className="text-sm text-foreground">{item.wiize}</span>
 </div>
 </div>
 ))}
 </div>
 </motion.div>
 </div>
 </section>
 );
};
