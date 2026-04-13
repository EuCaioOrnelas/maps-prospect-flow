import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";

const rows = [
  { feature: "Captação automatizada de leads", wiize: true, manual: false, tools: false },
  { feature: "Qualificação com IA e score", wiize: true, manual: false, tools: false },
  { feature: "Mensagens personalizadas por contexto", wiize: true, manual: false, tools: false },
  { feature: "API oficial do WhatsApp", wiize: true, manual: false, tools: true },
  { feature: "Atendimento 24/7 com IA", wiize: true, manual: false, tools: false },
  { feature: "Follow-up automático inteligente", wiize: true, manual: false, tools: true },
  { feature: "CRM integrado com pipeline", wiize: true, manual: false, tools: true },
  { feature: "Fluxo completo em um sistema", wiize: true, manual: false, tools: false },
  { feature: "Custo operacional reduzido", wiize: true, manual: false, tools: false },
];

const Cell = ({ ok }: { ok: boolean }) => (
  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${ok ? 'bg-primary/10' : 'bg-muted'}`}>
    {ok ? <Check size={14} className="text-primary" /> : <X size={14} className="text-muted-foreground/50" />}
  </div>
);

export const DifferentialsSection = () => {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section ref={ref as React.RefObject<HTMLElement>} className="py-20 sm:py-32 w-full">
      <div className="container mx-auto px-4 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase bg-primary/10 text-primary mb-4">
            Comparativo
          </span>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
            Por que escolher<br />
            <span className="text-shimmer-highlight">a Wiize?</span>
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="rounded-2xl border border-border bg-card/30 overflow-x-auto"
        >
          <div className="min-w-[520px]">
            {/* Header */}
            <div className="grid grid-cols-[1.8fr_1fr_1fr_1fr] gap-2 sm:gap-4 p-3 sm:p-6 border-b border-border bg-card/50">
              <div className="text-xs sm:text-sm font-medium text-muted-foreground">Funcionalidade</div>
              <div className="text-xs sm:text-sm font-semibold text-primary text-center">Wiize</div>
              <div className="text-xs sm:text-sm font-medium text-muted-foreground text-center">Manual / SDR</div>
              <div className="text-xs sm:text-sm font-medium text-muted-foreground text-center">Ferramentas isoladas</div>
            </div>
            {/* Rows */}
            {rows.map((r, i) => (
              <div key={i} className={`grid grid-cols-[1.8fr_1fr_1fr_1fr] gap-2 sm:gap-4 p-3 sm:px-6 ${i < rows.length - 1 ? 'border-b border-border/50' : ''}`}>
                <div className="text-xs sm:text-sm text-foreground">{r.feature}</div>
                <div className="flex justify-center"><Cell ok={r.wiize} /></div>
                <div className="flex justify-center"><Cell ok={r.manual} /></div>
                <div className="flex justify-center"><Cell ok={r.tools} /></div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};
