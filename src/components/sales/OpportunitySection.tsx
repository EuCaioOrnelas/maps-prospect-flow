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
          className="overflow-hidden rounded-panel border border-border bg-card p-3 shadow-[0_18px_50px_-24px_hsl(var(--foreground)/0.25)] sm:p-5 md:p-7"
        >
          <div className="overflow-hidden rounded-card border border-border">
            <div className="grid grid-cols-[minmax(0,1fr)_82px_88px] sm:grid-cols-[minmax(0,1fr)_150px_180px]">
              <div className="flex min-h-24 items-center px-3 sm:px-5">
                <span className="text-xs font-bold text-foreground sm:text-sm">Recurso</span>
              </div>
              <div className="flex min-h-24 items-center justify-center px-1 text-center">
                <span className="text-[10px] font-medium leading-tight text-muted-foreground sm:text-sm">
                  Outras ferramentas
                </span>
              </div>
              <div className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-t-card bg-gradient-to-b from-primary to-primary/90 px-2">
                <img src={logoIconNew} alt="Wiize" className="h-7 w-7 rounded-sm sm:h-8 sm:w-8" />
                <span className="text-xs font-bold text-primary-foreground sm:text-sm">Wiize</span>
              </div>
            </div>

            <div>
              {rows.map((row, index) => (
                <motion.div
                  key={row.feature}
                  initial={{ opacity: 0, y: 6 }}
                  animate={isVisible ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.3, delay: 0.12 + index * 0.035 }}
                  className="grid min-h-14 grid-cols-[minmax(0,1fr)_82px_88px] border-t border-border sm:grid-cols-[minmax(0,1fr)_150px_180px]"
                >
                  <div className="flex items-center px-3 py-3 sm:px-5">
                    <span className="text-[11px] font-semibold leading-snug text-foreground sm:text-[15px]">
                      {row.feature}
                    </span>
                  </div>
                  <div className="flex items-center justify-center py-3">
                    <OtherCell ok={row.others} />
                  </div>
                  <div
                    className={`flex items-center justify-center border-l border-primary/15 bg-primary/[0.045] py-3 dark:bg-primary/10 ${
                      index === rows.length - 1 ? "rounded-b-card" : ""
                    }`}
                  >
                    <WiizeCell />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
