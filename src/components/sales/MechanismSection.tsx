import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { motion } from "framer-motion";
import { Search, Brain, MessageSquare, Send, Bot, RefreshCw, CalendarCheck, LayoutGrid } from "lucide-react";

const steps = [
  { icon: Search, title: "Captação", desc: "Encontra empresas prontas para comprar", micro: "Prospecção contínua", tag: "Automático" },
  { icon: Brain, title: "Diagnóstico IA", desc: "Identifica quem realmente vale a pena", micro: "Score de aderência calculado", tag: "IA ativa" },
  { icon: MessageSquare, title: "Mensagem", desc: "Cria abordagem personalizada automaticamente", micro: "Copy única por lead", tag: "Automático" },
  { icon: Send, title: "Envio", desc: "Dispara mensagens no momento ideal", micro: "Via WhatsApp oficial", tag: "Tempo real" },
  { icon: Bot, title: "IA responde", desc: "Conversa, qualifica e conduz o lead", micro: "Atendimento 24/7 inteligente", tag: "IA ativa" },
  { icon: RefreshCw, title: "Follow-up", desc: "Recupera leads que iriam esfriar", micro: "Reengajamento automático", tag: "Automático" },
  { icon: CalendarCheck, title: "Conversão", desc: "Gera reuniões e oportunidades reais", micro: "Pipeline alimentado sem esforço", tag: "Tempo real" },
  { icon: LayoutGrid, title: "CRM", desc: "Organiza tudo sem esforço manual", micro: "Histórico e score centralizados", tag: "Automático" },
];

// Floating ambient elements data
const floatingElements = [
  { top: "8%", left: "4%", w: 120, label: "327 leads hoje", delay: 0.5 },
  { top: "22%", right: "3%", w: 110, label: "Score: 87/100", delay: 0.9 },
  { top: "42%", left: "2%", w: 130, label: "18 respostas/h", delay: 1.3 },
  { top: "58%", right: "5%", w: 115, label: "Conversão 12%", delay: 1.6 },
  { top: "78%", left: "5%", w: 125, label: "ROI 4.2x", delay: 2.0 },
];

export const MechanismSection = () => {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section ref={ref as React.RefObject<HTMLElement>} className="py-12 sm:py-20 w-full relative overflow-hidden">
      {/* Background ambient elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Gradient orbs */}
        <div className="absolute top-[10%] -left-[5%] w-[350px] h-[350px] bg-primary/[0.04] rounded-full blur-[100px]" />
        <div className="absolute top-[50%] -right-[8%] w-[400px] h-[400px] bg-primary/[0.03] rounded-full blur-[120px]" />
        <div className="absolute bottom-[10%] left-[10%] w-[300px] h-[300px] bg-primary/[0.03] rounded-full blur-[100px]" />

        {/* Abstract grid lines */}
        <div className="absolute top-0 left-[8%] w-px h-full bg-gradient-to-b from-transparent via-border/40 to-transparent" />
        <div className="absolute top-0 right-[8%] w-px h-full bg-gradient-to-b from-transparent via-border/40 to-transparent" />
        <div className="absolute top-[20%] left-0 w-full h-px bg-gradient-to-r from-transparent via-border/30 to-transparent" />
        <div className="absolute top-[60%] left-0 w-full h-px bg-gradient-to-r from-transparent via-border/30 to-transparent" />

        {/* Floating stat cards — desktop only */}
        {floatingElements.map((el, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={isVisible ? { opacity: 1 } : {}}
            transition={{ duration: 0.8, delay: el.delay }}
            className="hidden lg:flex absolute items-center gap-2 px-3 py-1.5 rounded-lg border border-border/50 bg-card/40 backdrop-blur-sm"
            style={{ top: el.top, left: el.left, right: (el as any).right, width: el.w }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-primary/50" />
            <span className="text-[10px] text-muted-foreground/60 font-medium whitespace-nowrap">{el.label}</span>
          </motion.div>
        ))}
      </div>

      <div className="container mx-auto px-4 max-w-3xl relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase bg-primary/10 text-primary mb-4">
            Como funciona
          </span>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
            O sistema por trás das{" "}
            <span className="text-shimmer-highlight">vendas em escala</span>
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto">
            Um fluxo contínuo que transforma leads em clientes, sem depender de operação manual.
          </p>
        </motion.div>

        {/* Timeline */}
        <div className="relative">
          {/* Central line */}
          <div className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-px">
            <motion.div
              initial={{ scaleY: 0 }}
              animate={isVisible ? { scaleY: 1 } : {}}
              transition={{ duration: 2, delay: 0.3, ease: "easeOut" }}
              className="w-full h-full origin-top bg-gradient-to-b from-primary/40 via-primary/20 to-primary/40"
            />
            {isVisible && (
              <motion.div
                initial={{ top: "0%" }}
                animate={{ top: ["0%", "100%"] }}
                transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                className="absolute left-1/2 -translate-x-1/2 w-1.5 h-12 rounded-full bg-gradient-to-b from-primary/0 via-primary/40 to-primary/0"
              />
            )}
          </div>

          {/* Input badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isVisible ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex justify-center mb-10 relative z-10"
          >
            <div className="flex items-center gap-2.5 px-5 py-2.5 rounded-full border border-primary/25 bg-card shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-50" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              <span className="text-xs font-medium text-primary">Leads entrando continuamente</span>
            </div>
          </motion.div>

          {/* Steps */}
          <div className="flex flex-col gap-8 sm:gap-10">
            {steps.map((step, i) => {
              const isLeft = i % 2 === 0;
              const Icon = step.icon;

              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: isLeft ? -30 : 30 }}
                  animate={isVisible ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.45, delay: 0.4 + i * 0.12 }}
                  className="relative flex items-center"
                >
                  {/* Center node */}
                  <div className="absolute left-1/2 -translate-x-1/2 z-20">
                    <div className="w-4 h-4 rounded-full border-2 border-primary bg-card shadow-[0_0_8px_hsl(var(--primary)/0.25)]" />
                  </div>

                  {/* Card */}
                  <div className={`w-[calc(50%-28px)] ${isLeft ? "mr-auto" : "ml-auto"}`}>
                    <div
                      className={`group relative p-5 rounded-2xl border border-border bg-card/90 shadow-[0_2px_12px_-4px_hsl(var(--foreground)/0.06)] hover:border-primary/30 hover:shadow-[0_4px_24px_-6px_hsl(var(--primary)/0.15)] transition-all duration-300 cursor-default ${
                        isLeft ? "text-right" : "text-left"
                      }`}
                    >
                      {/* Tag */}
                      <div className={`flex ${isLeft ? "justify-end" : "justify-start"} mb-3`}>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/8 text-[9px] font-semibold tracking-wider uppercase text-primary/70">
                          <span className="w-1 h-1 rounded-full bg-primary/50" />
                          {step.tag}
                        </span>
                      </div>

                      {/* Main content */}
                      <div className={`flex items-start gap-3.5 ${isLeft ? "flex-row-reverse" : "flex-row"}`}>
                        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                          <Icon size={18} className="text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[9px] font-bold tracking-[0.14em] text-primary/35 block leading-none mb-1">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <h3 className="text-sm font-bold text-foreground leading-tight mb-1">{step.title}</h3>
                          <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
                          <p className={`text-[10px] text-muted-foreground/50 mt-1.5 ${isLeft ? "text-right" : "text-left"}`}>
                            {step.micro}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Output badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isVisible ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5, delay: 1.6 }}
            className="flex justify-center mt-10 relative z-10"
          >
            <div className="flex items-center gap-2.5 px-5 py-2.5 rounded-full border border-primary/25 bg-primary/10 shadow-sm">
              <CalendarCheck size={14} className="text-primary" />
              <span className="text-xs font-medium text-primary">Clientes gerados + pipeline organizado</span>
            </div>
          </motion.div>
        </div>

        {/* Bottom statement */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 1.8 }}
          className="text-center text-sm text-muted-foreground mt-10 max-w-md mx-auto"
        >
          Tudo isso acontece continuamente, sem depender de operação manual.
        </motion.p>
      </div>
    </section>
  );
};
