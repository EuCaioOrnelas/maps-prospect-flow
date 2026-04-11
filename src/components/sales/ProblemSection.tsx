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
                  <div className="w-72 relative">
                    {/* Phone outer frame */}
                    <div className="rounded-t-[32px] border-[3px] border-b-0 border-muted-foreground/25 bg-[#f7f8fa] overflow-hidden shadow-[0_-8px_50px_rgba(0,0,0,0.12)]">
                      {/* Dynamic Island / Notch */}
                      <div className="flex justify-center py-2 bg-white">
                        <div className="w-24 h-5 rounded-full bg-black relative flex items-center justify-end pr-2.5">
                          <div className="w-3 h-3 rounded-full bg-[#1c1c1e] border-2 border-[#2a2a2e]" />
                        </div>
                      </div>
                      {/* WhatsApp header bar */}
                      <div className="flex items-center gap-2.5 px-3 py-2 bg-[#075e54]">
                        <div className="w-2 h-3.5 border-l-2 border-white/70 rotate-180" />
                        <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                          <span className="text-[8px] text-white font-bold">L</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-[9px] text-white font-semibold leading-none">Lead</p>
                          <p className="text-[7px] text-white/50 mt-0.5">online</p>
                        </div>
                        <div className="flex gap-3">
                          <div className="w-3.5 h-3.5 rounded-full border border-white/40" />
                          <div className="w-3.5 h-3.5 rounded-full border border-white/40" />
                        </div>
                      </div>
                      {/* Chat area - light WhatsApp background */}
                      <div className="bg-[#efeae2] p-3 space-y-2.5 min-h-[140px] relative">
                        {/* WA wallpaper pattern */}
                        <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'300\' height=\'300\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cdefs%3E%3Cpattern id=\'p\' width=\'50\' height=\'50\' patternUnits=\'userSpaceOnUse\'%3E%3Ccircle cx=\'10\' cy=\'10\' r=\'1\' fill=\'%23000\'/%3E%3Ccircle cx=\'35\' cy=\'35\' r=\'1.5\' fill=\'%23000\'/%3E%3Ccircle cx=\'25\' cy=\'15\' r=\'0.8\' fill=\'%23000\'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width=\'300\' height=\'300\' fill=\'url(%23p)\'/%3E%3C/svg%3E")'}} />
                        {/* Sent messages (right - green bubbles) */}
                        <div className="flex justify-end relative z-10">
                          <div className="rounded-xl rounded-tr-sm bg-[#d9fdd3] px-3 py-2 max-w-[78%] shadow-sm">
                            <p className="text-[9px] text-[#111b21] leading-relaxed">Olá! Temos uma oferta especial para sua empresa...</p>
                            <div className="flex items-center justify-end gap-1 mt-0.5">
                              <span className="text-[7px] text-[#667781]">10:30</span>
                              <span className="text-[7px] text-[#53bdeb]">✓✓</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-end relative z-10">
                          <div className="rounded-xl rounded-tr-sm bg-[#d9fdd3] px-3 py-2 max-w-[78%] shadow-sm">
                            <p className="text-[9px] text-[#111b21] leading-relaxed">Posso te apresentar nossos serviços?</p>
                            <div className="flex items-center justify-end gap-1 mt-0.5">
                              <span className="text-[7px] text-[#667781]">10:31</span>
                              <span className="text-[7px] text-[#53bdeb]">✓✓</span>
                            </div>
                          </div>
                        </div>
                        {/* Reply from lead (left - white bubble) */}
                        <div className="flex justify-start relative z-10">
                          <div className="rounded-xl rounded-tl-sm bg-white px-3 py-2 max-w-[82%] shadow-sm">
                            <p className="text-[9px] text-[#111b21] leading-relaxed">Não entendi o motivo do contato 🤔</p>
                            <span className="text-[7px] text-[#667781] float-right mt-0.5">10:45</span>
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
                    <p className="text-xs text-muted-foreground leading-relaxed">Listas compradas, dados desatualizados e zero qualificação prévia.</p>
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
                    <p className="text-xs text-muted-foreground leading-relaxed">Leads esfriam e oportunidades morrem por falta de acompanhamento.</p>
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
