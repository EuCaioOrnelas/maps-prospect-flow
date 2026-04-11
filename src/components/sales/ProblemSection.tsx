import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { motion } from "framer-motion";
import { Clock, UserX, MessageSquareOff, AlertTriangle, BarChart3, TrendingDown } from "lucide-react";
import { BentoGridShowcase } from "@/components/ui/bento-product-features";
import whatsappPhoneMockup from "@/assets/whatsapp-phone-mockup.png";

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
              <div className={`${cardBase} !overflow-visible`}>
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
                {/* Phone - sticking out of the card bottom */}
                <div className="relative z-10 flex justify-center mb-[-60px]">
                  <div className="w-[280px] relative">
                    {/* Phone body */}
                    <div className="rounded-t-[28px] bg-[#111] p-[3px] shadow-[0_10px_60px_rgba(0,0,0,0.3)]">
                      <div className="rounded-t-[25px] bg-white overflow-hidden">
                        {/* Status bar */}
                        <div className="flex items-center justify-between px-4 py-1 bg-[#075e54]">
                          <div className="flex items-center gap-1">
                            <span className="text-[7px] text-white/90 font-semibold">09:41</span>
                          </div>
                          <div className="absolute left-1/2 -translate-x-1/2 w-20 h-[18px] bg-[#111] rounded-b-2xl" />
                          <div className="flex items-center gap-1">
                            <Signal size={8} className="text-white/80" />
                            <Wifi size={8} className="text-white/80" />
                            <Battery size={8} className="text-white/80" />
                          </div>
                        </div>
                        {/* WhatsApp header */}
                        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-[#075e54]">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                          <div className="w-8 h-8 rounded-full bg-[#ccc] flex items-center justify-center overflow-hidden">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="#999"><path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v2h20v-2c0-3.3-6.7-5-10-5z"/></svg>
                          </div>
                          <div className="flex-1">
                            <p className="text-[10px] text-white font-semibold leading-none">João Silva</p>
                            <p className="text-[7px] text-white/60 mt-0.5">online</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <Video size={13} className="text-white/80" />
                            <Phone size={12} className="text-white/80" />
                            <MoreVertical size={13} className="text-white/80" />
                          </div>
                        </div>
                        {/* Chat area */}
                        <div className="bg-[#efeae2] p-3 space-y-2 min-h-[150px] relative" style={{backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cdefs%3E%3Cpattern id='a' width='20' height='20' patternUnits='userSpaceOnUse'%3E%3Cpath d='M10 2a1 1 0 110 2 1 1 0 010-2z' fill='%23d4cfc6' fill-opacity='.15'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='400' height='400' fill='url(%23a)'/%3E%3C/svg%3E")`}}>
                          {/* Date chip */}
                          <div className="flex justify-center mb-1">
                            <span className="text-[7px] bg-white/80 text-[#667781] px-2 py-0.5 rounded-md shadow-sm">HOJE</span>
                          </div>
                          {/* Sent messages */}
                          <div className="flex justify-end">
                            <div className="rounded-lg rounded-tr-[3px] bg-[#d9fdd3] px-2.5 py-1.5 max-w-[78%] shadow-[0_1px_1px_rgba(0,0,0,0.06)]">
                              <p className="text-[9px] text-[#111b21] leading-relaxed">Olá! Temos uma oferta especial para sua empresa...</p>
                              <div className="flex items-center justify-end gap-1 mt-0.5">
                                <span className="text-[6px] text-[#667781]">10:30</span>
                                <span className="text-[7px] text-[#53bdeb]">✓✓</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-end">
                            <div className="rounded-lg rounded-tr-[3px] bg-[#d9fdd3] px-2.5 py-1.5 max-w-[78%] shadow-[0_1px_1px_rgba(0,0,0,0.06)]">
                              <p className="text-[9px] text-[#111b21] leading-relaxed">Posso te apresentar nossos serviços?</p>
                              <div className="flex items-center justify-end gap-1 mt-0.5">
                                <span className="text-[6px] text-[#667781]">10:31</span>
                                <span className="text-[7px] text-[#53bdeb]">✓✓</span>
                              </div>
                            </div>
                          </div>
                          {/* Reply from lead */}
                          <div className="flex justify-start">
                            <div className="rounded-lg rounded-tl-[3px] bg-white px-2.5 py-1.5 max-w-[82%] shadow-[0_1px_1px_rgba(0,0,0,0.06)]">
                              <p className="text-[9px] text-[#111b21] leading-relaxed">Não entendi o motivo do contato 🤔</p>
                              <span className="text-[6px] text-[#667781] float-right mt-0.5">10:45</span>
                            </div>
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
                <div className="relative z-10">
                  <div className="w-8 h-8 rounded-xl bg-destructive/10 flex items-center justify-center mb-2">
                    <Clock size={16} className="text-destructive" />
                  </div>
                  <h3 className="font-semibold text-foreground text-sm mb-0.5">Prospecção manual</h3>
                  <p className="text-xs text-muted-foreground">Horas perdidas sem critério</p>
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
                <div className="relative z-10">
                  <div className="w-8 h-8 rounded-xl bg-destructive/10 flex items-center justify-center mb-2">
                    <BarChart3 size={16} className="text-destructive" />
                  </div>
                  <h3 className="font-semibold text-foreground text-sm mb-0.5">Funil desorganizado</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Sem visibilidade do pipeline. Sem dados. Sem previsibilidade.
                  </p>
                </div>
              </div>
            }
            shortcuts={
              <div className={`${cardBase} !flex-row items-center`}>
                <div className="absolute -bottom-8 left-1/4 w-40 h-40 bg-destructive/12 rounded-full blur-[60px] pointer-events-none" />
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
