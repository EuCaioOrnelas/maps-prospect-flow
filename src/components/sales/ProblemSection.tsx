import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { motion } from "framer-motion";
import { Clock, UserX, MessageSquareOff, AlertTriangle, BarChart3, TrendingDown } from "lucide-react";
import { BentoGridShowcase } from "@/components/ui/bento-product-features";

export const ProblemSection = () => {
  const { ref, isVisible } = useScrollAnimation();

  const cardBase = "rounded-2xl border border-border bg-card/50 transition-all duration-300 p-3.5 sm:p-4 h-full flex flex-col";

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
            className="auto-rows-[minmax(110px,auto)]"
            integration={
              <div className={cardBase}>
                <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center mb-3">
                  <MessageSquareOff size={18} className="text-destructive" />
                </div>
                <h3 className="font-semibold text-foreground text-sm mb-1">Mensagens genéricas</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                  Abordagens iguais para todos. Sem contexto, sem personalização, sem resultado.
                </p>
                <div className="mt-auto">
                  <span className="text-3xl font-bold text-destructive/80 tracking-tight">2%</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">taxa de resposta média</p>
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
                <div className="mt-auto pt-2">
                  <span className="text-2xl font-bold text-destructive/80 tracking-tight">82%</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">dos leads são descartados</p>
                </div>
              </div>
            }
            statistic={
              <div className={cardBase}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground text-sm mb-0.5">Prospecção manual</h3>
                    <p className="text-xs text-muted-foreground">Horas perdidas sem critério</p>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
                    <Clock size={16} className="text-destructive" />
                  </div>
                </div>
                <div className="mt-auto pt-2">
                  <span className="text-2xl font-bold text-destructive/80 tracking-tight">3h+</span>
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
                <div className="mt-auto pt-2">
                  <span className="text-2xl font-bold text-destructive/80 tracking-tight">67%</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">dos deals morrem sem follow-up</p>
                </div>
              </div>
            }
            productivity={
              <div className={cardBase}>
                <div className="w-8 h-8 rounded-xl bg-destructive/10 flex items-center justify-center mb-2">
                  <BarChart3 size={16} className="text-destructive" />
                </div>
                <h3 className="font-semibold text-foreground text-sm mb-0.5">Funil desorganizado</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Sem visibilidade do pipeline. Sem dados. Sem previsibilidade.
                </p>
              </div>
            }
            shortcuts={
              <div className={`${cardBase} flex-row items-center gap-4`}>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="w-8 h-8 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
                    <TrendingDown size={16} className="text-destructive" />
                  </div>
                  <h3 className="font-semibold text-foreground text-sm">Baixa conversão</h3>
                </div>
                <span className="text-3xl font-bold text-destructive/80 tracking-tight flex-shrink-0">0,5%</span>
                <p className="text-xs text-muted-foreground leading-relaxed flex-1 min-w-0">
                  A cada 200 prospecções, apenas 1 venda. Esforço alto com retorno mínimo.
                </p>
              </div>
            }
          />
        )}
      </div>
    </section>
  );
};
