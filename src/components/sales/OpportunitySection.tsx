import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { motion } from "framer-motion";
import { X, Sparkles } from "lucide-react";
import logoIconNew from "@/assets/logo-icon-new.png";
import { SectionHeading } from "@/components/landing/SectionHeading";

const comparisons = [
  { old: "Buscar leads manualmente", oldSub: "e perder horas todos os dias", new: "SDR IA encontra e qualifica leads", newSub: "prontos para comprar" },
  { old: "Qualificar no \"feeling\"", oldSub: "e errar oportunidades reais", new: "Qualificação inteligente com IA", newSub: "baseada em intenção e comportamento" },
  { old: "Enviar mensagens genéricas", oldSub: "que são ignoradas", new: "IA gera mensagens personalizadas", newSub: "para cada lead automaticamente" },
  { old: "Depender da equipe para responder", oldSub: "e atrasar contatos", new: "Atendimento operacional com IA 24/7", newSub: "integrado ao CRM" },
  { old: "Perder vendas", oldSub: "por falta de follow-up", new: "Follow-up inteligente no momento ideal", newSub: "sem esforço manual" },
  { old: "Controlar tudo em planilhas", oldSub: "sem previsibilidade", new: "CRM com inteligência comercial", newSub: "e visão completa do funil" },
  { old: "Sem visão de engajamento", oldSub: "dos leads com a empresa", new: "IA de Intenção de Compra", newSub: "analisa engajamento em tempo real" },
  { old: "Campanhas manuais e demoradas", oldSub: "sem escala real", new: "Campanhas inteligentes com IA", newSub: "e personalização em escala" },
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
        <SectionHeading
          eyebrow="A oportunidade"
          title="O novo padrão para"
          highlight="vender B2B"
          description="Empresas que crescem mais rápido não vendem mais. Vendem melhor, com processo, dados e inteligência."
          isVisible={isVisible}
        />


        {/* ===== DESKTOP: tabela comparativa em 2 colunas ===== */}
        <div className="hidden md:block">
          <div className="grid grid-cols-2 gap-6">
            {/* Traditional header */}
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              animate={isVisible ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="rounded-t-2xl border border-b-0 border-border bg-muted/30 px-8 pt-8 pb-5"
            >
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium uppercase tracking-wider bg-muted text-muted-foreground/70 border border-border mb-4">
                Menos eficiente
              </span>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
                Modelo tradicional
              </h3>
            </motion.div>

            {/* Wiize header */}
            <motion.div
              initial={{ opacity: 0, x: 24 }}
              animate={isVisible ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="rounded-t-2xl border border-b-0 border-primary/20 bg-white dark:bg-card px-8 pt-8 pb-5 relative overflow-hidden"
            >
              <div className="absolute -top-10 -right-10 w-48 h-48 bg-primary/[0.08] rounded-full blur-[28px] pointer-events-none" />
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-primary/10 text-primary border border-primary/15 mb-4">
                <Sparkles size={12} />
                Mais eficiente
              </span>
              <div className="flex items-center gap-3">
                <img src={logoIconNew} alt="Wiize" className="w-9 h-9 rounded-xl" />
                <h3 className="text-sm font-semibold text-primary uppercase tracking-widest">Modelo com Wiize</h3>
              </div>
            </motion.div>
          </div>

          {comparisons.map((c, i) => (
            <div key={i} className="grid grid-cols-2 gap-6">
              <motion.div
                initial={{ opacity: 0, x: -12 }}
                animate={isVisible ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.4, delay: 0.3 + i * 0.06 }}
                className={`border-x border-border bg-muted/30 px-8 py-3 ${i === comparisons.length - 1 ? 'border-b rounded-b-2xl pb-6' : ''}`}
              >
                <div className="flex items-center gap-3 min-h-[32px]">
                  <div className="w-5 h-5 rounded-full bg-destructive/12 flex items-center justify-center flex-shrink-0">
                    <X size={11} className="text-destructive" strokeWidth={2.5} />
                  </div>
                  <p className="text-sm text-muted-foreground leading-snug">
                    {c.old} <span className="text-muted-foreground/50">{c.oldSub}</span>
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 12 }}
                animate={isVisible ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.4, delay: 0.4 + i * 0.06 }}
                className={`border-x border-primary/20 bg-white dark:bg-card px-8 py-3 relative overflow-hidden ${i === comparisons.length - 1 ? 'border-b rounded-b-2xl pb-6' : ''}`}
              >
                <div className="flex items-center gap-3 min-h-[32px] relative">
                  <div className="w-5 h-5 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                    <CheckIcon />
                  </div>
                  <p className="text-sm text-foreground leading-snug">
                    <span className="font-medium">{c.new}</span>{" "}
                    <span className="text-muted-foreground">{c.newSub}</span>
                  </p>
                </div>
              </motion.div>
            </div>
          ))}
        </div>

        {/* ===== MOBILE: tabela compacta 2 colunas ===== */}
        <div className="md:hidden">
          <div className="rounded-2xl border border-border overflow-hidden">
            {/* Headers */}
            <div className="grid grid-cols-2">
              <div className="bg-muted/40 px-3 py-3 border-r border-border">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider bg-muted text-muted-foreground/80 mb-1.5">
                  Antes
                </span>
                <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Modelo tradicional
                </h3>
              </div>
              <div className="bg-white dark:bg-card px-3 py-3 relative overflow-hidden">
                <div className="absolute -top-8 -right-8 w-24 h-24 bg-primary/[0.08] rounded-full blur-[28px] pointer-events-none" />
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider bg-primary/10 text-primary mb-1.5 relative">
                  <Sparkles size={9} />
                  Com Wiize
                </span>
                <div className="flex items-center gap-1.5 relative">
                  <img src={logoIconNew} alt="Wiize" className="w-5 h-5 rounded-md" />
                  <h3 className="text-[11px] font-semibold text-primary uppercase tracking-wider">Modelo Wiize</h3>
                </div>
              </div>
            </div>

            {/* Rows */}
            {comparisons.map((c, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={isVisible ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.35, delay: 0.1 + i * 0.04 }}
                className="grid grid-cols-2 border-t border-border"
              >
                <div className="bg-muted/30 px-3 py-3 border-r border-border">
                  <div className="flex items-start gap-2">
                    <div className="w-4 h-4 rounded-full bg-destructive/12 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <X size={9} className="text-destructive" strokeWidth={2.5} />
                    </div>
                    <p className="text-[12px] text-muted-foreground leading-snug">
                      {c.old}{" "}
                      <span className="text-muted-foreground/60">{c.oldSub}</span>
                    </p>
                  </div>
                </div>
                <div className="bg-white dark:bg-card px-3 py-3 relative overflow-hidden">
                  <div className="flex items-start gap-2 relative">
                    <div className="w-4 h-4 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckIcon />
                    </div>
                    <p className="text-[12px] text-foreground leading-snug">
                      <span className="font-medium">{c.new}</span>{" "}
                      <span className="text-muted-foreground">{c.newSub}</span>
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};
