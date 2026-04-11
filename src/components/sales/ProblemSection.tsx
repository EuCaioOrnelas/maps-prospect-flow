import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { motion } from "framer-motion";
import { Clock, UserX, MessageSquareOff, AlertTriangle, BarChart3, TrendingDown } from "lucide-react";
import { BentoGridShowcase } from "@/components/ui/bento-product-features";

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
                {/* Red glow background */}
                <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 w-48 h-48 bg-destructive/15 rounded-full blur-[60px] pointer-events-none" />
                <div className="relative z-10">
                  <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center mb-3">
                    <MessageSquareOff size={18} className="text-destructive" />
                  </div>
                  <h3 className="font-semibold text-foreground text-sm mb-1">Mensagens genéricas</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                    Abordagens iguais para todos. Sem contexto, sem personalização. Leads ignoram e você perde oportunidades reais.
                  </p>
                </div>
                {/* Realistic phone mockup - large, cut at bottom */}
                <div className="mt-auto relative z-10 flex justify-center">
                  <div className="w-64 relative">
                    {/* Phone frame */}
                    <div className="rounded-t-[28px] border-[3px] border-b-0 border-muted-foreground/30 bg-white overflow-hidden shadow-[0_-4px_40px_rgba(0,0,0,0.15)]">
                      {/* Notch */}
                      <div className="flex justify-center pt-2 pb-1 bg-[#f0f2f5]">
                        <div className="w-20 h-4 rounded-full bg-black/80 relative flex items-center justify-center">
                          <div className="w-2.5 h-2.5 rounded-full bg-[#1a1a2e] border border-[#333] absolute right-3" />
                          <span className="text-[9px] text-white/70 font-medium">Lead</span>
                        </div>
                        <div className="flex gap-1">
                          <div className="w-3 h-3 rounded-full bg-muted-foreground/20" />
                          <div className="w-3 h-3 rounded-full bg-muted-foreground/20" />
                        </div>
                      </div>
                      {/* WhatsApp-like background */}
                      <div className="bg-[#0b141a] p-2.5 space-y-2 min-h-[120px] relative">
                        {/* WA pattern overlay */}
                        <div className="absolute inset-0 opacity-[0.04]" style={{backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'200\' height=\'200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cdefs%3E%3Cpattern id=\'p\' width=\'40\' height=\'40\' patternUnits=\'userSpaceOnUse\'%3E%3Ccircle cx=\'20\' cy=\'20\' r=\'1.5\' fill=\'white\'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width=\'200\' height=\'200\' fill=\'url(%23p)\'/%3E%3C/svg%3E")'}} />
                        {/* Sent messages (right aligned - green bubbles) */}
                        <div className="flex justify-end relative z-10">
                          <div className="rounded-lg rounded-tr-sm bg-[#005c4b] px-2.5 py-1.5 max-w-[80%]">
                            <p className="text-[8px] text-white/90 leading-relaxed">Olá! Temos uma oferta especial para sua empresa...</p>
                            <span className="text-[6px] text-white/40 float-right mt-0.5">10:30</span>
                          </div>
                        </div>
                        <div className="flex justify-end relative z-10">
                          <div className="rounded-lg rounded-tr-sm bg-[#005c4b] px-2.5 py-1.5 max-w-[80%]">
                            <p className="text-[8px] text-white/90 leading-relaxed">Posso te apresentar nossos serviços?</p>
                            <span className="text-[6px] text-white/40 float-right mt-0.5">10:31</span>
                          </div>
                        </div>
                        {/* Reply from lead - spilling out */}
                        <div className="flex justify-start relative z-10">
                          <div className="rounded-lg rounded-tl-sm bg-[#1f2c34] px-2.5 py-1.5 max-w-[85%] border border-white/5">
                            <p className="text-[8px] text-white/80 leading-relaxed">Não entendi o motivo do contato 🤔</p>
                            <span className="text-[6px] text-white/30 float-right mt-0.5">10:45</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            }
            trackers={
              <div className={cardBase}>
                <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-destructive/12 rounded-full blur-[50px] pointer-events-none" />
                <div className="flex items-start justify-between relative z-10">
                  <div>
                    <h3 className="font-semibold text-foreground text-sm mb-0.5">Leads frios</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">Contatos sem aderência ao seu produto. Listas compradas, dados desatualizados e zero qualificação prévia.</p>
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
                <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-destructive/12 rounded-full blur-[50px] pointer-events-none" />
                <div className="flex items-start justify-between relative z-10">
                  <div>
                    <h3 className="font-semibold text-foreground text-sm mb-0.5">Prospecção manual</h3>
                    <p className="text-xs text-muted-foreground">Horas perdidas sem critério</p>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0 ml-3">
                    <Clock size={16} className="text-destructive" />
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
                <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-destructive/12 rounded-full blur-[50px] pointer-events-none" />
                <div className="flex items-start justify-between relative z-10">
                  <div>
                    <h3 className="font-semibold text-foreground text-sm mb-0.5">Follow-up inconsistente</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">Sem cadência definida. Leads esfriam, oportunidades morrem e o time perde vendas por falta de acompanhamento.</p>
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
                <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-destructive/12 rounded-full blur-[50px] pointer-events-none" />
                <div className="flex items-start justify-between relative z-10">
                  <div>
                    <div className="w-8 h-8 rounded-xl bg-destructive/10 flex items-center justify-center mb-2">
                      <BarChart3 size={16} className="text-destructive" />
                    </div>
                    <h3 className="font-semibold text-foreground text-sm mb-0.5">Funil desorganizado</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Sem visibilidade do pipeline. Sem dados. Sem previsibilidade.
                    </p>
                  </div>
                </div>
              </div>
            }
            shortcuts={
              <div className={`${cardBase} !flex-row items-center`}>
                {/* Red glow */}
                <div className="absolute -bottom-8 left-1/4 w-40 h-40 bg-destructive/12 rounded-full blur-[60px] pointer-events-none" />
                {/* Left side */}
                <div className="flex-1 min-w-0 relative z-10">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div className="w-8 h-8 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
                      <TrendingDown size={16} className="text-destructive" />
                    </div>
                    <h3 className="font-semibold text-foreground text-sm">Baixa conversão</h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Esforço alto com retorno mínimo. Operação que não justifica o investimento e drena recursos do time comercial.
                  </p>
                </div>
                {/* Right side */}
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
