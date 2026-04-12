import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { motion } from "framer-motion";
import {
  Search,
  MessageCircle,
  Send,
  LayoutDashboard,
  Zap,
  Bot,
} from "lucide-react";
import { BentoGridShowcase } from "@/components/ui/bento-product-features";

const cardBase =
  "group rounded-2xl border border-border/70 bg-card/80 backdrop-blur-sm transition-shadow duration-500 ease-out p-3 sm:p-3.5 h-full flex flex-col relative overflow-hidden hover:shadow-md";
const cardGlowMain =
  "absolute -bottom-16 -right-16 w-44 h-44 rounded-full bg-primary/14 blur-[72px] pointer-events-none opacity-100";
const cardGlowSecondary =
  "absolute -top-12 -left-12 w-32 h-32 rounded-full bg-primary/10 blur-[60px] pointer-events-none opacity-90";

export const FeaturesOverviewSection = () => {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="py-12 sm:py-20 w-full relative"
    >
      <div className="container mx-auto px-4 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase bg-primary/10 text-primary mb-4">
            Funcionalidades
          </span>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
            Tudo que você precisa para
            <br />
            <span className="text-muted-foreground">vender mais no automático</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Uma plataforma completa que conecta captação, prospecção, campanhas, CRM e IA em um único sistema integrado.
          </p>
        </motion.div>

        {isVisible && (
          <BentoGridShowcase
            className="auto-rows-[minmax(110px,auto)]"
            integration={
              <div className={`${cardBase}`}>
                <div className={cardGlowSecondary} />
                <div className={cardGlowMain} />
                <div className="relative z-10 flex flex-col h-full">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                    <Search size={20} className="text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground text-base mb-2">Captação Inteligente</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Encontre leads qualificados no Google Maps com IA. Diagnóstico automático de cada empresa: nicho, porte, telefone validado e score de aderência ao seu produto.
                  </p>
                  <div className="mt-auto pt-4">
                    <span className="text-[11px] font-medium text-primary/70 bg-primary/5 px-2.5 py-1 rounded-full">
                      Captação + Diagnóstico
                    </span>
                  </div>
                </div>
              </div>
            }
            trackers={
              <div className={cardBase}>
                <div className={cardGlowSecondary} />
                <div className={cardGlowMain} />
                <div className="flex items-start justify-between relative z-10">
                  <div>
                    <h3 className="font-semibold text-foreground text-sm mb-0.5">Prospecção e Relacionamento</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Abordagem personalizada em escala. Cada lead recebe uma mensagem contextualizada com base no diagnóstico. Relacionamento contínuo com cadência inteligente.
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 ml-3">
                    <MessageCircle size={16} className="text-primary" />
                  </div>
                </div>
              </div>
            }
            statistic={
              <div className={cardBase}>
                <div className={cardGlowSecondary} />
                <div className={cardGlowMain} />
                <div className="relative z-10">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                    <Send size={16} className="text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground text-sm mb-0.5">Campanhas via API Oficial</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Disparos em massa com a API oficial do WhatsApp — inbound e outbound. Sem risco de banimento, com templates aprovados.
                  </p>
                </div>
              </div>
            }
            focus={
              <div className={cardBase}>
                <div className={cardGlowSecondary} />
                <div className={cardGlowMain} />
                <div className="flex items-start justify-between relative z-10">
                  <div>
                    <h3 className="font-semibold text-foreground text-sm mb-0.5">CRM e Lead Scoring</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Pipeline visual com Kanban, estágios personalizados e scoring automático. Saiba quais leads priorizar e quando agir.
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 ml-3">
                    <LayoutDashboard size={16} className="text-primary" />
                  </div>
                </div>
              </div>
            }
            productivity={
              <div className={cardBase}>
                <div className={cardGlowSecondary} />
                <div className={cardGlowMain} />
                <div className="relative z-10">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                    <Zap size={16} className="text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground text-sm mb-0.5">Automação de Processos</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Automatize follow-ups, movimentação de estágios e ações repetitivas. Operação comercial no piloto automático 24/7.
                  </p>
                </div>
              </div>
            }
            shortcuts={
              <div className={`${cardBase} !flex-row items-center`}>
                <div className={cardGlowSecondary} />
                <div className={cardGlowMain} />
                <div className="flex-1 min-w-0 relative z-10">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bot size={16} className="text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground text-sm">Agente de IA e Fluxos</h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Agentes inteligentes que respondem leads, qualificam oportunidades e avançam conversas. Fluxos visuais para criar jornadas personalizadas.
                  </p>
                </div>
                <div className="flex-shrink-0 text-right pl-6 border-l border-border/50 relative z-10">
                  <span className="text-[11px] font-medium text-primary/70 bg-primary/5 px-2.5 py-1 rounded-full">
                    IA conversacional
                  </span>
                </div>
              </div>
            }
          />
        )}
      </div>
    </section>
  );
};
