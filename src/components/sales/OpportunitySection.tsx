import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { motion } from "framer-motion";
import { X, Check } from "lucide-react";

const comparisons = [
  { old: "Buscar leads manualmente", new: "Encontrar empresas certas automaticamente" },
  { old: "Qualificar no feeling", new: "Priorizar com IA e score inteligente" },
  { old: "Enviar mensagem igual para todos", new: "Personalizar abordagem por contexto" },
  { old: "Depender da equipe para responder", new: "Atendimento automatizado 24/7" },
  { old: "Perder timing no follow-up", new: "Reengajar leads na hora certa" },
  { old: "Controlar tudo em planilhas", new: "Gerir operação em CRM integrado" },
];

export const OpportunitySection = () => {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section ref={ref as React.RefObject<HTMLElement>} className="py-20 sm:py-32 w-full relative">
      <div className="container mx-auto px-4 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase bg-primary/10 text-primary mb-4">
            A oportunidade
          </span>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
            O novo jeito de<br />
            <span className="text-shimmer-highlight">vender B2B</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Empresas que crescem mais rápido não dependem de força bruta comercial. Elas operam com automação, dados, IA e cadência.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Old model */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={isVisible ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="rounded-2xl border border-border bg-card/30 p-6 sm:p-8"
          >
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-6">Modelo tradicional</h3>
            <div className="space-y-4">
              {comparisons.map((c, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <X size={12} className="text-destructive" />
                  </div>
                  <span className="text-sm text-muted-foreground">{c.old}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* New model */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={isVisible ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="rounded-2xl border border-primary/20 bg-primary/[0.03] p-6 sm:p-8 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
            <h3 className="text-sm font-semibold text-primary uppercase tracking-widest mb-6">Modelo com Wiize</h3>
            <div className="space-y-4">
              {comparisons.map((c, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check size={12} className="text-primary" />
                  </div>
                  <span className="text-sm text-foreground">{c.new}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
