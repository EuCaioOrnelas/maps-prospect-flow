import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { motion } from "framer-motion";
import { Clock, UserX, MessageSquareOff, AlertTriangle, BarChart3, TrendingDown } from "lucide-react";
import { BentoGridShowcase } from "@/components/ui/bento-product-features";
import whatsappPhoneMockup from "@/assets/whatsapp-phone-mockup-v2.png";
import { useEffect } from "react";

// Preload the image immediately
const preloadLink = document.createElement('link');
preloadLink.rel = 'preload';
preloadLink.as = 'image';
preloadLink.href = whatsappPhoneMockup;
document.head.appendChild(preloadLink);

export const ProblemSection = () => {
  const { ref, isVisible } = useScrollAnimation();

  const cardBase =
    "group rounded-2xl border border-border/70 bg-card/80 backdrop-blur-sm transition-shadow duration-500 ease-out p-3 sm:p-3.5 h-full flex flex-col relative overflow-hidden hover:shadow-md";
  const cardGlowMain =
    "absolute -bottom-16 -right-16 w-44 h-44 rounded-full bg-destructive/14 blur-[72px] pointer-events-none opacity-100";
  const cardGlowSecondary =
    "absolute -top-12 -left-12 w-32 h-32 rounded-full bg-destructive/10 blur-[60px] pointer-events-none opacity-90";

  return (
    <section ref={ref as React.RefObject<HTMLElement>} className="py-12 sm:py-20 w-full relative">
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
            Seu processo comercial está
            <br />
            <span className="text-muted-foreground">fazendo você perder clientes</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Enquanto sua operação depende de processos manuais, leads esfriam, respostas atrasam e oportunidades deixam de virar vendas.
          </p>
        </motion.div>

        {isVisible && (
          <BentoGridShowcase
            className="auto-rows-[minmax(110px,auto)]"
            integration={
              <div className={`${cardBase} !p-0`}>
                <div className={cardGlowSecondary} />
                <div className="absolute bottom-[-5rem] left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-destructive/14 blur-[78px] pointer-events-none opacity-100" />

                <div className="relative z-10 p-3 sm:p-3.5 pb-28 sm:pb-32">
                  <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center mb-3">
                    <MessageSquareOff size={18} className="text-destructive" />
                  </div>
                  <h3 className="font-semibold text-foreground text-base mb-1">Mensagens genéricas</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-[260px]">
                    Abordagens iguais para todos. Sem contexto, sem personalização. Leads ignoram e você perde oportunidades reais.
                  </p>
                </div>

                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[61%] sm:h-[62%] overflow-hidden">
                  <img
                    src={whatsappPhoneMockup}
                    alt="Ilustração de conversa no WhatsApp"
                    loading="eager"
                    fetchPriority="high"
                    decoding="async"
                    className="absolute left-[62%] top-[11%] w-[146%] sm:w-[148%] min-w-[360px] max-w-none -translate-x-1/2 drop-shadow-2xl"
                  />
                </div>
              </div>
            }
            trackers={
              <div className={cardBase}>
                <div className={cardGlowSecondary} />
                <div className={cardGlowMain} />
                <div className="flex items-start justify-between relative z-10">
                  <div>
                    <h3 className="font-semibold text-foreground text-base mb-0.5">Leads frios</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Contatos sem aderência ao seu produto. Listas compradas, dados desatualizados e zero qualificação prévia.
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0 ml-3">
                    <UserX size={16} className="text-destructive" />
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
                <div className={cardGlowSecondary} />
                <div className={cardGlowMain} />
                <div className="relative z-10">
                  <div className="w-8 h-8 rounded-xl bg-destructive/10 flex items-center justify-center mb-2">
                    <Clock size={16} className="text-destructive" />
                  </div>
                   <h3 className="font-semibold text-foreground text-base mb-0.5">Prospecção manual</h3>
                   <p className="text-sm text-muted-foreground">Horas perdidas sem critério</p>
                </div>
                <div className="mt-auto pt-2 relative z-10">
                  <span className="text-2xl font-bold text-destructive/80 tracking-tight">3h+</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">por dia em busca manual</p>
                </div>
              </div>
            }
            focus={
              <div className={cardBase}>
                <div className={cardGlowSecondary} />
                <div className={cardGlowMain} />
                <div className="flex items-start justify-between relative z-10">
                  <div>
                    <h3 className="font-semibold text-foreground text-base mb-0.5">Follow-up inconsistente</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Sem cadência definida. Leads esfriam, oportunidades morrem e o time perde vendas por falta de acompanhamento.
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0 ml-3">
                    <AlertTriangle size={16} className="text-destructive" />
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
                <div className={cardGlowSecondary} />
                <div className={cardGlowMain} />
                <div className="relative z-10">
                  <div className="w-8 h-8 rounded-xl bg-destructive/10 flex items-center justify-center mb-2">
                    <BarChart3 size={16} className="text-destructive" />
                  </div>
                   <h3 className="font-semibold text-foreground text-base mb-0.5">Funil desorganizado</h3>
                   <p className="text-sm text-muted-foreground leading-relaxed">
                    Sem visibilidade do pipeline. Sem dados. Sem previsibilidade.
                  </p>
                </div>
              </div>
            }
            shortcuts={
              <div className={`${cardBase} !flex-col sm:!flex-row items-start sm:items-center`}>
                <div className={cardGlowSecondary} />
                <div className={cardGlowMain} />
                <div className="flex-1 min-w-0 relative z-10">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div className="w-8 h-8 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
                      <TrendingDown size={16} className="text-destructive" />
                    </div>
                    <h3 className="font-semibold text-foreground text-base">Baixa conversão</h3>
                  </div>
                   <p className="text-sm text-muted-foreground leading-relaxed">
                     Esforço alto com retorno mínimo. Operação que não justifica o investimento e drena recursos do time comercial.
                  </p>
                </div>
                <div className="flex-shrink-0 text-left sm:text-right pt-3 sm:pt-0 sm:pl-6 border-t sm:border-t-0 sm:border-l border-border/50 relative z-10 w-full sm:w-auto">
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
