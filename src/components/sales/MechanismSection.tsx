import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { motion } from "framer-motion";
import { Search, Brain, MessageSquare, Send, Bot, RefreshCw, CalendarCheck, LayoutGrid } from "lucide-react";

const steps = [
  { icon: Search, num: "01", title: "Captação", desc: "Encontra empresas prontas para comprar" },
  { icon: Brain, num: "02", title: "Diagnóstico IA", desc: "Identifica quem realmente vale a pena" },
  { icon: MessageSquare, num: "03", title: "Mensagem", desc: "Cria abordagem personalizada automaticamente" },
  { icon: Send, num: "04", title: "Envio", desc: "Dispara mensagens no momento ideal" },
  { icon: Bot, num: "05", title: "IA responde", desc: "Conversa, qualifica e conduz o lead" },
  { icon: RefreshCw, num: "06", title: "Follow-up", desc: "Recupera leads que iriam esfriar" },
  { icon: CalendarCheck, num: "07", title: "Conversão", desc: "Gera reuniões e oportunidades reais" },
  { icon: LayoutGrid, num: "08", title: "CRM", desc: "Organiza tudo sem esforço manual" },
];

export const MechanismSection = () => {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section ref={ref as React.RefObject<HTMLElement>} className="py-12 sm:py-20 w-full relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-primary/5 rounded-full blur-[140px]" />

      <div className="container mx-auto px-4 max-w-7xl relative z-10">
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
            O sistema por trás das<br />
            <span className="text-shimmer-highlight">vendas em escala</span>
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Um fluxo contínuo que transforma leads frios em clientes, sem depender de operação manual.
          </p>
        </motion.div>

        {/* Pipeline — single horizontal scroll on mobile, full row on desktop */}
        <div className="relative">
          {/* Horizontal flow wrapper */}
          <div className="overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
            <div className="flex items-center gap-0 min-w-max mx-auto w-fit">

              {/* INPUT badge */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={isVisible ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="flex-shrink-0 mr-3"
              >
                <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                  </span>
                  <span className="text-xs font-medium text-primary whitespace-nowrap">Lead entrando</span>
                </div>
              </motion.div>

              {/* Arrow into pipeline */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={isVisible ? { opacity: 1 } : {}}
                transition={{ delay: 0.4 }}
                className="flex-shrink-0"
              >
                <FlowArrow />
              </motion.div>

              {/* Steps */}
              {steps.map((step, i) => (
                <motion.div
                  key={step.num}
                  initial={{ opacity: 0, y: 16 }}
                  animate={isVisible ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.4, delay: 0.5 + i * 0.1 }}
                  className="flex items-center flex-shrink-0"
                >
                  {/* Card */}
                  <div className="group relative flex flex-col items-center text-center w-[120px] py-4 px-2 rounded-xl border border-border bg-card/70 hover:border-primary/30 hover:shadow-[0_0_20px_-4px_hsl(var(--primary)/0.15)] hover:scale-[1.04] transition-all duration-300 cursor-default">
                    <span className="text-[9px] font-bold tracking-[0.15em] text-primary/40 uppercase mb-1.5">{step.num}</span>
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-colors duration-300">
                      <step.icon size={15} className="text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground text-xs mb-1 leading-tight">{step.title}</h3>
                    <p className="text-[10px] text-muted-foreground leading-snug">{step.desc}</p>
                  </div>

                  {/* Arrow between cards (not after last) */}
                  {i < steps.length - 1 && <FlowArrow />}
                </motion.div>
              ))}

              {/* Arrow out of pipeline */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={isVisible ? { opacity: 1 } : {}}
                transition={{ delay: 1.4 }}
                className="flex-shrink-0"
              >
                <FlowArrow />
              </motion.div>

              {/* OUTPUT badge */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={isVisible ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.5, delay: 1.5 }}
                className="flex-shrink-0 ml-3"
              >
                <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10">
                  <CalendarCheck size={14} className="text-primary" />
                  <span className="text-xs font-medium text-primary whitespace-nowrap">Cliente fechado</span>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Flow line running behind everything — animated gradient */}
          <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-px z-[-1] overflow-hidden pointer-events-none hidden md:block">
            <motion.div
              initial={{ x: "-100%" }}
              animate={isVisible ? { x: "0%" } : {}}
              transition={{ duration: 2, delay: 0.4, ease: "easeOut" }}
              className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/20 to-primary/0"
            />
          </div>
        </div>

        {/* Bottom statement */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 1.8 }}
          className="text-center text-sm text-muted-foreground mt-10 max-w-lg mx-auto"
        >
          Tudo isso acontece continuamente, sem depender de operação manual.
        </motion.p>
      </div>
    </section>
  );
};

const FlowArrow = () => (
  <div className="flex-shrink-0 w-6 flex items-center justify-center">
    <svg width="24" height="10" viewBox="0 0 24 10" fill="none" className="text-primary/25">
      <path d="M0 5h20M16 1l4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </div>
);
