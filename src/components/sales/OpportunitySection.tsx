import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { motion } from "framer-motion";
import { X, Sparkles } from "lucide-react";
import logoIconNew from "@/assets/logo-icon-new.png";

const traditionalItems = [
  { text: "Buscar leads manualmente", consequence: "e perder horas todos os dias" },
  { text: "Qualificar no \"feeling\"", consequence: "e errar oportunidades reais" },
  { text: "Enviar mensagens genéricas", consequence: "que são ignoradas" },
  { text: "Depender da equipe para responder", consequence: "e atrasar contatos" },
  { text: "Perder vendas", consequence: "por falta de follow-up" },
  { text: "Controlar tudo em planilhas", consequence: "sem previsibilidade" },
  { text: "Sem visão de engajamento", consequence: "dos leads com a empresa" },
  { text: "Campanhas manuais e demoradas", consequence: "sem escala real" },
];

const wiizeItems = [
  { text: "Captação automática de leads", result: "prontos para comprar" },
  { text: "Qualificação inteligente com IA", result: "baseada em dados reais" },
  { text: "Mensagens personalizadas", result: "para cada lead automaticamente" },
  { text: "Atendimento automatizado", result: "e instantâneo 24/7" },
  { text: "Follow-up no momento certo", result: "sem esforço manual" },
  { text: "CRM integrado", result: "com visão completa do funil" },
  { text: "Score de engajamento por lead", result: "medindo cada interação" },
  { text: "Campanhas de mensagens automáticas", result: "em escala com personalização" },
];

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
    <path
      d="M3.5 7.5L5.5 9.5L10.5 4.5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-primary"
    />
  </svg>
);

export const OpportunitySection = () => {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section ref={ref as React.RefObject<HTMLElement>} className="py-20 sm:py-32 w-full relative">
      <div className="container mx-auto px-4 max-w-5xl">
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
            O novo padrão de<br />
            <span className="text-shimmer-highlight">vendas B2B</span>
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Empresas que crescem mais rápido não vendem mais — vendem melhor, com processos, dados e inteligência.
          </p>
        </motion.div>

        {/* Comparison grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 items-stretch">
          {/* Traditional model */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={isVisible ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="rounded-2xl border border-border bg-muted/30 p-6 sm:p-8 flex flex-col"
          >
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-7">
              Modelo tradicional
            </h3>
            <div className="space-y-4 flex-1">
              {traditionalItems.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -12 }}
                  animate={isVisible ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.4, delay: 0.3 + i * 0.06 }}
                  className="flex items-center gap-3 group cursor-default min-h-[28px]"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={isVisible ? { scale: 1 } : {}}
                    transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.4 + i * 0.06 }}
                    className="w-5 h-5 rounded-full bg-destructive/12 flex items-center justify-center flex-shrink-0"
                  >
                    <X size={11} className="text-destructive" strokeWidth={2.5} />
                  </motion.div>
                  <p className="text-sm text-muted-foreground leading-snug transition-colors duration-300 group-hover:text-foreground/70">
                    {item.text} <span className="text-muted-foreground/50">{item.consequence}</span>
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Wiize model */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={isVisible ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="rounded-2xl border border-primary/20 bg-primary/[0.02] p-6 sm:p-8 relative overflow-hidden flex flex-col"
          >
            {/* Subtle glow */}
            <div className="absolute -top-8 -right-8 w-40 h-40 bg-primary/8 rounded-full blur-[60px] pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-primary/5 rounded-full blur-[50px] pointer-events-none" />

            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={isVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mb-5"
            >
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-primary/10 text-primary border border-primary/15">
                <Sparkles size={12} />
                Mais eficiente
              </span>
            </motion.div>

            {/* Title with logo */}
            <div className="flex items-center gap-3 mb-7">
              <img src={logoIconNew} alt="Wiize" className="w-9 h-9 rounded-xl" />
              <h3 className="text-xs font-semibold text-primary uppercase tracking-widest">Modelo com Wiize</h3>
            </div>

            <div className="space-y-4 flex-1">
              {wiizeItems.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 12 }}
                  animate={isVisible ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.4, delay: 0.4 + i * 0.06 }}
                  className="flex items-center gap-3 group cursor-default min-h-[28px]"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={isVisible ? { scale: 1 } : {}}
                    transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.5 + i * 0.06 }}
                    className="w-5 h-5 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0"
                  >
                    <CheckIcon />
                  </motion.div>
                  <p className="text-sm text-foreground leading-snug transition-colors duration-300 group-hover:text-foreground">
                    <span className="font-medium">{item.text}</span>{" "}
                    <span className="text-muted-foreground">{item.result}</span>
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
