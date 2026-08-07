import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { motion } from "framer-motion";
import { X, Check } from "lucide-react";
import logoIconNew from "@/assets/logo-icon-new.png";
import { SectionHeading } from "@/components/landing/SectionHeading";

type Row = { feature: string; others: boolean };

const rows: Row[] = [
  { feature: "Captação de leads B2B com IA", others: false },
  { feature: "Qualificação por intenção de compra", others: false },
  { feature: "Mensagens personalizadas geradas por IA", others: false },
  { feature: "Atendimento com IA 24/7 integrado ao CRM", others: false },
  { feature: "Follow-up inteligente no momento ideal", others: true },
  { feature: "Pipeline Kanban com inteligência comercial", others: true },
  { feature: "Agenda comercial automática pela IA", others: false },
  { feature: "Campanhas via API Oficial Meta", others: true },
  { feature: "Fluxos inteligentes (drag & drop)", others: true },
  { feature: "Score de engajamento em tempo real", others: false },
];

const OtherCell = ({ ok }: { ok: boolean }) =>
  ok ? (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-sm border border-border bg-muted">
      <Check size={14} className="text-muted-foreground" strokeWidth={3} />
    </span>
  ) : (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-sm bg-destructive/10">
      <X size={14} className="text-destructive" strokeWidth={3} />
    </span>
  );

const WiizeCell = () => (
  <span className="inline-flex h-7 w-7 items-center justify-center rounded-sm bg-primary shadow-[0_4px_12px_-4px_hsl(var(--primary)/0.6)]">
    <Check size={14} className="text-primary-foreground" strokeWidth={3} />
  </span>
);

export const OpportunitySection = () => {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section ref={ref as React.RefObject<HTMLElement>} className="py-12 sm:py-20 w-full relative">
      <div className="container mx-auto px-4 max-w-5xl">
        <SectionHeading
          eyebrow="A oportunidade"
          title="O novo padrão para"
          highlight="vender B2B"
          description="Empresas que crescem mais rápido não vendem mais. Vendem melhor, com processo, dados e inteligência."
          isVisible={isVisible}
        />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="relative rounded-panel border border-border bg-card p-2 sm:p-5 md:p-8 shadow-[0_18px_50px_-24px_hsl(var(--foreground)/0.25)]"
        >
          <div className="relative grid grid-cols-[1fr_84px_96px] sm:grid-cols-[1fr_150px_190px]">
            {/* Coluna Wiize destacada (fundo) */}
            <div className="pointer-events-none absolute inset-y-0 right-0 w-[96px] sm:w-[190px] rounded-card bg-primary/[0.05] dark:bg-primary/10 border border-primary/15" />

            {/* Header */}
            <div className="flex items-end px-2 sm:px-4 pb-4 pt-2">
              <span className="text-xs sm:text-sm font-semibold text-foreground">Recurso</span>
            </div>
            <div className="flex items-end justify-center pb-4 pt-2">
              <span className="text-[11px] sm:text-sm text-muted-foreground text-center leading-tight">
                Outras ferramentas
              </span>
            </div>
            <div className="relative rounded-t-card bg-gradient-to-b from-primary to-primary/90 px-2 py-4 flex flex-col items-center justify-center gap-1.5">
              <img src={logoIconNew} alt="Wiize" className="h-7 w-7 rounded-sm" />
              <span className="text-[11px] sm:text-sm font-semibold text-primary-foreground">Wiize</span>
            </div>

            {/* Linhas */}
            {rows.map((r, i) => (
              <motion.div
                key={r.feature}
                initial={{ opacity: 0, y: 8 }}
                animate={isVisible ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.35, delay: 0.15 + i * 0.05 }}
                className="contents"
              >
                <div className="flex items-center px-2 sm:px-4 py-4 border-t border-border">
                  <span className="text-[12px] sm:text-[15px] font-medium text-foreground leading-snug">
                    {r.feature}
                  </span>
                </div>
                <div className="flex items-center justify-center py-4 border-t border-border">
                  <OtherCell ok={r.others} />
                </div>
                <div
                  className={`relative flex items-center justify-center py-4 border-t border-primary/15 ${
                    i === rows.length - 1 ? "rounded-b-card" : ""
                  }`}
                >
                  <WiizeCell />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};
