import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { motion } from "framer-motion";
import { Clock, UserX, MessageSquareOff, AlertTriangle, BarChart3, TrendingDown } from "lucide-react";
import { BentoGridShowcase } from "@/components/ui/bento-product-features";
import phoneMockup from "@/assets/phone-chat-mockup.png";

export const ProblemSection = () => {
  const { ref, isVisible } = useScrollAnimation();

  const cardBase = "rounded-2xl border border-border bg-card/50 transition-all duration-300 p-3.5 sm:p-4 h-full flex flex-col relative overflow-hidden";

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
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-32 h-32 bg-destructive/10 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
                      <MessageSquareOff size={18} className="text-destructive" />
                    </div>
                    <h3 className="font-semibold text-foreground text-sm">Mensagens genéricas</h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Abordagens iguais para todos. Sem contexto, sem personalização, sem resultado.
                  </p>
                </div>
                {/* Phone mockup */}
                <div className="mt-auto relative z-10 flex justify-center pt-4">
                  <img
                    src={phoneMockup}
                    alt="Conversa genérica no WhatsApp"
                    className="w-40 object-contain object-top"
                    style={{ maxHeight: '220px' }}
                    loading="lazy"
                  />
                </div>
              </div>
            }
            trackers={
              <div className={cardBase}>
                <div className="absolute -top-6 -left-6 w-20 h-20 bg-destructive/15 rounded-full blur-sm pointer-events-none" />
                <div className="flex items-center gap-2.5 relative z-10">
                  <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0 -ml-2 -mt-2 relative">
                    <UserX size={18} className="text-destructive" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">Leads frios</h3>
                    <p className="text-xs text-muted-foreground">Contatos sem aderência</p>
                  </div>
                </div>
                <div className="mt-auto pt-2 relative z-10">
                  <span className="text-2xl font-bold text-destructive/80 tracking-tight">82%</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">dos leads são descartados</p>
                </div>
              </div>
            }
            statistic={
              <div className={cardBase}>
                <div className="absolute -top-6 -left-6 w-20 h-20 bg-destructive/15 rounded-full blur-sm pointer-events-none" />
                <div className="flex items-center gap-2.5 relative z-10">
                  <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0 -ml-2 -mt-2 relative">
                    <Clock size={18} className="text-destructive" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">Prospecção manual</h3>
                    <p className="text-xs text-muted-foreground">Horas perdidas sem critério</p>
                  </div>
                </div>
                <div className="mt-auto pt-2 relative z-10">
                  <span className="text-2xl font-bold text-destructive/80 tracking-tight">3h+</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">por dia em busca manual</p>
                </div>
              </div>
            }
            focus={
              <div className={cardBase}>
                <div className="absolute -top-6 -left-6 w-20 h-20 bg-destructive/15 rounded-full blur-sm pointer-events-none" />
                <div className="flex items-center gap-2.5 relative z-10">
                  <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0 -ml-2 -mt-2 relative">
                    <AlertTriangle size={18} className="text-destructive" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">Follow-up inconsistente</h3>
                    <p className="text-xs text-muted-foreground">Cadência inexistente</p>
                  </div>
                </div>
                <div className="mt-auto pt-2 relative z-10">
                  <span className="text-2xl font-bold text-destructive/80 tracking-tight">67%</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">dos deals morrem sem follow-up</p>
                </div>
              </div>
            }
            productivity={
              <div className={cardBase}>
                <div className="absolute -top-6 -left-6 w-20 h-20 bg-destructive/15 rounded-full blur-sm pointer-events-none" />
                <div className="flex items-center gap-2.5 relative z-10">
                  <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0 -ml-2 -mt-2 relative">
                    <BarChart3 size={18} className="text-destructive" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">Funil desorganizado</h3>
                    <p className="text-xs text-muted-foreground">Sem dados ou previsibilidade</p>
                  </div>
                </div>
              </div>
            }
            shortcuts={
              <div className={`${cardBase} !flex-row items-center`}>
                <div className="absolute -bottom-8 left-1/4 w-40 h-40 bg-destructive/8 rounded-full blur-3xl pointer-events-none" />
                <div className="flex-1 min-w-0 relative z-10">
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
                <div className="flex-shrink-0 text-right pl-6 border-l border-border/50 relative z-10">
                  <span className="text-4xl font-bold text-destructive/80 tracking-tight">0,5%</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">a cada 200 prospecções, 1 venda</p>
                </div>
              </div>
            }
          />
        )}
      </div>
    </section>
  );
};
