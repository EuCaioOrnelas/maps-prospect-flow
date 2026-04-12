import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { motion } from "framer-motion";
import { X, Sparkles } from "lucide-react";
import logoIconNew from "@/assets/logo-icon-new.png";

const comparisons = [
  { old: "Buscar leads manualmente", oldSub: "e perder horas todos os dias", new: "Captação automática de leads", newSub: "prontos para comprar" },
  { old: "Qualificar no \"feeling\"", oldSub: "e errar oportunidades reais", new: "Qualificação inteligente com IA", newSub: "baseada em dados reais" },
  { old: "Enviar mensagens genéricas", oldSub: "que são ignoradas", new: "Mensagens personalizadas", newSub: "para cada lead automaticamente" },
  { old: "Depender da equipe para responder", oldSub: "e atrasar contatos", new: "Atendimento automatizado", newSub: "e instantâneo 24/7" },
  { old: "Perder vendas", oldSub: "por falta de follow-up", new: "Follow-up no momento certo", newSub: "sem esforço manual" },
  { old: "Controlar tudo em planilhas", oldSub: "sem previsibilidade", new: "CRM integrado", newSub: "com visão completa do funil" },
  { old: "Sem visão de engajamento", oldSub: "dos leads com a empresa", new: "Score de engajamento por lead", newSub: "medindo cada interação" },
  { old: "Campanhas manuais e demoradas", oldSub: "sem escala real", new: "Campanhas de mensagens automáticas", newSub: "em escala com personalização" },
];

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
    <path d="M3.5 7.5L5.5 9.5L10.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary" />
  </svg>
);

export const OpportunitySection = () => {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section ref={ref as React.RefObject<HTMLElement>} className="py-12 sm:py-20 w-full relative">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-14 sm:mb-20"
        >
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase bg-primary/10 text-primary mb-4">
            A oportunidade
          </span>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-5">
            O novo padrão para <span className="text-shimmer-highlight">vender B2B</span>
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Empresas que crescem mais rápido não vendem mais, vendem melhor, com processos, dados e inteligência.
          </p>
        </motion.div>

        {/* Comparison grid - headers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          {/* Traditional header */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={isVisible ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="rounded-t-2xl border border-b-0 border-border bg-muted/30 px-6 sm:px-8 pt-6 sm:pt-8 pb-5"
          >
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={isVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mb-4"
            >
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium uppercase tracking-wider bg-muted text-muted-foreground/70 border border-border">
                Menos eficiente
              </span>
            </motion.div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
              Modelo tradicional
            </h3>
          </motion.div>

          {/* Wiize header */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={isVisible ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="rounded-t-2xl border border-b-0 border-primary/20 bg-primary/[0.02] px-6 sm:px-8 pt-6 sm:pt-8 pb-5 relative overflow-hidden"
          >
            <div className="absolute -top-8 -right-8 w-40 h-40 bg-primary/8 rounded-full blur-[60px] pointer-events-none" />
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={isVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mb-4"
            >
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-primary/10 text-primary border border-primary/15">
                <Sparkles size={12} />
                Mais eficiente
              </span>
            </motion.div>
            <div className="flex items-center gap-3">
              <img src={logoIconNew} alt="Wiize" className="w-9 h-9 rounded-xl" />
              <h3 className="text-sm font-semibold text-primary uppercase tracking-widest">Modelo com Wiize</h3>
            </div>
          </motion.div>
        </div>

        {/* Rows aligned */}
        {comparisons.map((c, i) => (
          <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
            {/* Traditional item */}
            <motion.div
              initial={{ opacity: 0, x: -12 }}
              animate={isVisible ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.4, delay: 0.3 + i * 0.06 }}
              className={`border-x border-border bg-muted/30 px-6 sm:px-8 py-3 group cursor-default ${i === comparisons.length - 1 ? 'border-b rounded-b-2xl pb-6' : ''}`}
            >
              <div className="flex items-center gap-3 min-h-[32px]">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={isVisible ? { scale: 1 } : {}}
                  transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.4 + i * 0.06 }}
                  className="w-5 h-5 rounded-full bg-destructive/12 flex items-center justify-center flex-shrink-0"
                >
                  <X size={11} className="text-destructive" strokeWidth={2.5} />
                </motion.div>
                <p className="text-sm text-muted-foreground leading-snug transition-colors duration-300 group-hover:text-foreground/70">
                  {c.old} <span className="text-muted-foreground/50">{c.oldSub}</span>
                </p>
              </div>
            </motion.div>

            {/* Wiize item */}
            <motion.div
              initial={{ opacity: 0, x: 12 }}
              animate={isVisible ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.4, delay: 0.4 + i * 0.06 }}
              className={`border-x border-primary/20 bg-primary/[0.02] px-6 sm:px-8 py-3 group cursor-default relative overflow-hidden ${i === comparisons.length - 1 ? 'border-b rounded-b-2xl pb-6' : ''}`}
            >
              <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-primary/5 rounded-full blur-[50px] pointer-events-none" />
              <div className="flex items-center gap-3 min-h-[32px] relative">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={isVisible ? { scale: 1 } : {}}
                  transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.5 + i * 0.06 }}
                  className="w-5 h-5 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0"
                >
                  <CheckIcon />
                </motion.div>
                <p className="text-sm text-foreground leading-snug transition-colors duration-300 group-hover:text-foreground">
                  <span className="font-medium">{c.new}</span>{" "}
                  <span className="text-muted-foreground">{c.newSub}</span>
                </p>
              </div>
            </motion.div>
          </div>
        ))}
      </div>
    </section>
  );
};
