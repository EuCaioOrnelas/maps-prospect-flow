import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { motion } from "framer-motion";
import { Search, Brain, MessageSquare, Send, Bot, RefreshCw, CalendarCheck, LayoutGrid } from "lucide-react";

const steps = [
  { icon: Search, num: "01", title: "Captação", desc: "Encontra empresas prontas para comprar" },
  { icon: Brain, num: "02", title: "Diagnóstico IA", desc: "Identifica quais leads realmente valem a pena" },
  { icon: MessageSquare, num: "03", title: "Mensagem criada", desc: "Gera abordagens únicas para cada lead" },
  { icon: Send, num: "04", title: "Envio automático", desc: "Dispara via WhatsApp oficial em escala" },
  { icon: Bot, num: "05", title: "IA responde", desc: "Conduz conversas e qualifica 24/7" },
  { icon: RefreshCw, num: "06", title: "Follow-up", desc: "Recupera leads que pararam de responder" },
  { icon: CalendarCheck, num: "07", title: "Conversão", desc: "Gera reuniões e propostas automaticamente" },
  { icon: LayoutGrid, num: "08", title: "CRM", desc: "Organiza pipeline e histórico completo" },
];

const PipelineDot = ({ active = false }: { active?: boolean }) => (
  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${active ? 'bg-primary' : 'bg-border'}`} />
);

export const MechanismSection = () => {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section ref={ref as React.RefObject<HTMLElement>} className="py-12 sm:py-20 w-full relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />

      <div className="container mx-auto px-4 max-w-6xl relative z-10">
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
            Um processo contínuo que transforma prospecção manual em geração previsível de oportunidades.
          </p>
        </motion.div>

        {/* Pipeline Flow */}
        <div className="relative">
          {/* INPUT node */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isVisible ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex justify-center mb-6"
          >
            <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full border border-primary/30 bg-primary/5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
              </span>
              <span className="text-sm font-medium text-primary">Lead entrando no sistema</span>
            </div>
          </motion.div>

          {/* Connector line down */}
          <motion.div
            initial={{ scaleY: 0 }}
            animate={isVisible ? { scaleY: 1 } : {}}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="w-px h-8 bg-gradient-to-b from-primary/40 to-border mx-auto origin-top"
          />

          {/* Row 1: Steps 1-4 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="relative"
          >
            {/* Horizontal connector line behind cards */}
            <div className="hidden md:block absolute top-1/2 left-[8%] right-[8%] h-px -translate-y-1/2 z-0">
              <motion.div
                initial={{ scaleX: 0 }}
                animate={isVisible ? { scaleX: 1 } : {}}
                transition={{ duration: 1, delay: 0.6 }}
                className="w-full h-full bg-gradient-to-r from-primary/30 via-primary/20 to-primary/30 origin-left"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 relative z-10">
              {steps.slice(0, 4).map((step, i) => (
                <StepCard key={step.num} step={step} index={i} isVisible={isVisible} baseDelay={0.5} />
              ))}
            </div>
          </motion.div>

          {/* Z-connector: vertical line from row 1 to row 2 */}
          <div className="flex justify-center py-2">
            <motion.div
              initial={{ scaleY: 0 }}
              animate={isVisible ? { scaleY: 1 } : {}}
              transition={{ duration: 0.4, delay: 1.1 }}
              className="flex flex-col items-center gap-1 origin-top"
            >
              <PipelineDot />
              <div className="w-px h-6 bg-gradient-to-b from-border to-primary/30" />
              <PipelineDot active />
              <div className="w-px h-6 bg-gradient-to-b from-primary/30 to-border" />
              <PipelineDot />
            </motion.div>
          </div>

          {/* Row 2: Steps 5-8 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 1.2 }}
            className="relative"
          >
            <div className="hidden md:block absolute top-1/2 left-[8%] right-[8%] h-px -translate-y-1/2 z-0">
              <motion.div
                initial={{ scaleX: 0 }}
                animate={isVisible ? { scaleX: 1 } : {}}
                transition={{ duration: 1, delay: 1.4 }}
                className="w-full h-full bg-gradient-to-r from-primary/30 via-primary/20 to-primary/30 origin-left"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 relative z-10">
              {steps.slice(4).map((step, i) => (
                <StepCard key={step.num} step={step} index={i} isVisible={isVisible} baseDelay={1.3} />
              ))}
            </div>
          </motion.div>

          {/* Connector line down */}
          <motion.div
            initial={{ scaleY: 0 }}
            animate={isVisible ? { scaleY: 1 } : {}}
            transition={{ duration: 0.4, delay: 2 }}
            className="w-px h-8 bg-gradient-to-b from-border to-primary/40 mx-auto origin-top"
          />

          {/* OUTPUT node */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isVisible ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5, delay: 2.1 }}
            className="flex justify-center mt-6"
          >
            <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full border border-primary/30 bg-primary/10">
              <CalendarCheck size={16} className="text-primary" />
              <span className="text-sm font-medium text-primary">Cliente fechado + CRM atualizado</span>
            </div>
          </motion.div>
        </div>

        {/* Bottom statement */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 2.3 }}
          className="text-center text-sm text-muted-foreground mt-10 max-w-lg mx-auto"
        >
          Tudo isso acontece de forma contínua, sem depender de operação manual.
        </motion.p>
      </div>
    </section>
  );
};

interface StepCardProps {
  step: typeof steps[0];
  index: number;
  isVisible: boolean;
  baseDelay: number;
}

const StepCard = ({ step, index, isVisible, baseDelay }: StepCardProps) => {
  const Icon = step.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={isVisible ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4, delay: baseDelay + index * 0.1 }}
      className="group relative flex flex-col items-center text-center p-5 rounded-2xl border border-border bg-card/60 hover:border-primary/30 hover:bg-primary/[0.03] transition-all duration-300"
    >
      {/* Number */}
      <span className="text-[10px] font-bold tracking-widest text-primary/50 uppercase mb-2">{step.num}</span>

      {/* Icon circle */}
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
        <Icon size={18} className="text-primary" />
      </div>

      {/* Title */}
      <h3 className="font-semibold text-foreground text-sm mb-1">{step.title}</h3>

      {/* Desc */}
      <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>

      {/* Arrow connector between cards (horizontal, hidden on mobile) */}
      {index < 3 && (
        <div className="hidden md:flex absolute -right-[10px] top-1/2 -translate-y-1/2 z-20">
          <svg width="20" height="12" viewBox="0 0 20 12" fill="none" className="text-primary/30">
            <path d="M0 6h16M12 1l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}
    </motion.div>
  );
};
