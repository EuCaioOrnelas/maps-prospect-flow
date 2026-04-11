import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { motion } from "framer-motion";
import { UserX, MessageSquareOff, AlertTriangle, BarChart3, TrendingDown } from "lucide-react";
import { BentoGridShowcase } from "@/components/ui/bento-product-features";
import clock3d from "@/assets/clock-3d.png";

export const ProblemSection = () => {
  const { ref, isVisible } = useScrollAnimation();

  const cardBase = "rounded-2xl border border-border bg-card/50 transition-all duration-300 p-5 sm:p-6 h-full flex flex-col";

  return (
    <section ref={ref as React.RefObject<HTMLElement>} className="py-20 sm:py-32 w-full relative">
      <div className="container mx-auto px-4 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase bg-destructive/10 text-destructive mb-4">
            O problema
          </span>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
            Sua operação comercial<br />
            <span className="text-muted-foreground">não foi feita para escalar</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Empresas não deixam de crescer por falta de mercado. Elas param porque sua operação comercial é lenta, manual e estruturalmente ineficiente.
          </p>
        </motion.div>

        {isVisible && (
          <BentoGridShowcase
            integration={
              <div className={cardBase}>
                <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center mb-4">
                  <MessageSquareOff size={20} className="text-destructive" />
                </div>
                <h3 className="font-semibold text-foreground text-base mb-1.5">Mensagens genéricas</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-6">
                  Abordagens iguais para todos. Sem contexto, sem personalização, sem resultado. Sua equipe gasta energia em tarefas repetitivas que poderiam ser automatizadas.
                </p>
                <div className="mt-auto">
                  <span className="text-4xl font-bold text-destructive/80 tracking-tight">2%</span>
                  <p className="text-[11px] text-muted-foreground mt-1">taxa de resposta média</p>
                </div>
              </div>
            }
            trackers={
              <div className={cardBase}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground text-sm mb-0.5">Leads frios</h3>
                    <p className="text-xs text-muted-foreground">Contatos sem aderência</p>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
                    <UserX size={16} className="text-destructive" />
                  </div>
                </div>
                <div className="mt-auto pt-3">
                  <span className="text-3xl font-bold text-destructive/80 tracking-tight">82%</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">dos leads são descartados</p>
                </div>
              </div>
            }
            statistic={
              <div className={`${cardBase} relative overflow-hidden`}>
                {/* 3D clock image */}
                <img
                  src={clock3d}
                  alt=""
                  className="absolute -right-6 -top-4 w-28 h-28 opacity-20 pointer-events-none"
                />
                <div className="relative z-10">
                  <h3 className="font-semibold text-foreground text-sm mb-0.5">Prospecção manual</h3>
                  <p className="text-xs text-muted-foreground">Horas perdidas sem critério</p>
                </div>
                <div className="mt-auto pt-3 relative z-10">
                  <span className="text-3xl font-bold text-destructive/80 tracking-tight">3h+</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">por dia em busca manual</p>
                </div>
              </div>
            }
            focus={
              <div className={cardBase}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground text-sm mb-0.5">Follow-up inconsistente</h3>
                    <p className="text-xs text-muted-foreground">Cadência inexistente</p>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle size={16} className="text-destructive" />
                  </div>
                </div>
                <div className="mt-auto pt-3">
                  <span className="text-3xl font-bold text-destructive/80 tracking-tight">67%</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">dos deals morrem sem follow-up</p>
                </div>
              </div>
            }
            productivity={
              <div className={cardBase}>
                <div className="w-8 h-8 rounded-xl bg-destructive/10 flex items-center justify-center mb-3">
                  <BarChart3 size={16} className="text-destructive" />
                </div>
                <h3 className="font-semibold text-foreground text-sm mb-0.5">Funil desorganizado</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Sem visibilidade do pipeline. Sem dados. Sem previsibilidade de receita.
                </p>
              </div>
            }
            shortcuts={
              <div className={`${cardBase} flex-row items-center gap-6`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div className="w-8 h-8 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
                      <TrendingDown size={16} className="text-destructive" />
                    </div>
                    <h3 className="font-semibold text-foreground text-sm">Baixa conversão</h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Esforço alto com retorno mínimo. Operação que não justifica o investimento.
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-4xl font-bold text-destructive/80 tracking-tight">1.4%</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">conversão média B2B</p>
                </div>
              </div>
            }
          />
        )}
      </div>
    </section>
  );
};
