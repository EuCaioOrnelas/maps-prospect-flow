import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { motion } from "framer-motion";
import { Search, Brain, MessageSquare, Send, Bot, RefreshCw, CalendarCheck, LayoutGrid } from "lucide-react";

const steps = [
  { icon: Search, title: "Captação", desc: "Encontra empresas prontas para comprar" },
  { icon: Brain, title: "Diagnóstico IA", desc: "Identifica quem realmente vale a pena" },
  { icon: MessageSquare, title: "Mensagem", desc: "Cria abordagem personalizada automaticamente" },
  { icon: Send, title: "Envio", desc: "Dispara mensagens no momento ideal" },
  { icon: Bot, title: "IA responde", desc: "Conversa, qualifica e conduz o lead" },
  { icon: RefreshCw, title: "Follow-up", desc: "Recupera leads que iriam esfriar" },
  { icon: CalendarCheck, title: "Conversão", desc: "Gera reuniões e oportunidades reais" },
  { icon: LayoutGrid, title: "CRM", desc: "Organiza tudo sem esforço manual" },
];

export const MechanismSection = () => {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section ref={ref as React.RefObject<HTMLElement>} className="py-12 sm:py-20 w-full relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[800px] bg-primary/4 rounded-full blur-[160px]" />

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
          {/* Central vertical line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2">
            <motion.div
              initial={{ scaleY: 0 }}
              animate={isVisible ? { scaleY: 1 } : {}}
              transition={{ duration: 1.8, delay: 0.3, ease: "easeOut" }}
              className="w-full h-full origin-top bg-gradient-to-b from-primary/30 via-primary/15 to-primary/30"
            />
            {/* Travelling pulse */}
            {isVisible && (
              <motion.div
                initial={{ top: "0%" }}
                animate={{ top: ["0%", "100%"] }}
                transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                className="absolute left-1/2 -translate-x-1/2 w-1.5 h-8 rounded-full bg-gradient-to-b from-primary/0 via-primary/50 to-primary/0"
              />
            )}
          </div>

          {/* Input badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isVisible ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex justify-center mb-8 relative z-10"
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
          <div className="flex flex-col gap-6 sm:gap-8">
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
                  {/* Center dot */}
                  <div className="absolute left-1/2 -translate-x-1/2 z-20">
                    <div className="w-3 h-3 rounded-full border-2 border-primary bg-card" />
                  </div>

                  {/* Card — alternates sides */}
                  <div
                    className={`w-[calc(50%-24px)] ${isLeft ? "mr-auto pr-4 text-right" : "ml-auto pl-4 text-left"}`}
                  >
                    <div className="group inline-flex flex-col gap-1.5 p-4 rounded-xl border border-border bg-card/80 hover:border-primary/30 hover:shadow-[0_0_20px_-6px_hsl(var(--primary)/0.15)] transition-all duration-300 cursor-default">
                      <div className={`flex items-center gap-2.5 ${isLeft ? "flex-row-reverse" : "flex-row"}`}>
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                          <Icon size={16} className="text-primary" />
                        </div>
                        <div>
                          <span className="text-[9px] font-bold tracking-[0.14em] text-primary/40 block leading-none mb-0.5">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <h3 className="text-sm font-semibold text-foreground leading-tight">{step.title}</h3>
                        </div>
                      </div>
                      <p className={`text-[11px] text-muted-foreground leading-snug ${isLeft ? "text-right" : "text-left"}`}>
                        {step.desc}
                      </p>
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
            transition={{ duration: 0.5, delay: 1.5 }}
            className="flex justify-center mt-8 relative z-10"
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
          transition={{ duration: 0.5, delay: 1.7 }}
          className="text-center text-sm text-muted-foreground mt-10 max-w-md mx-auto"
        >
          Tudo isso acontece continuamente, sem depender de operação manual.
        </motion.p>
      </div>
    </section>
  );
};
