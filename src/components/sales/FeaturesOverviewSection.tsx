import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { motion } from "framer-motion";
import {
  Search,
  MessageCircle,
  Send,
  LayoutDashboard,
  Zap,
  Bot,
  ChevronRight,
  Clock,
  RefreshCw,
  Target,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import flowBuilderPreview from "@/assets/flow-builder-preview.png";

const cardBase =
  "group rounded-2xl border border-border/70 bg-card/80 backdrop-blur-sm transition-shadow duration-500 ease-out p-3 sm:p-3.5 h-full flex flex-col relative overflow-hidden hover:shadow-lg hover:shadow-white/5";
const cardGlowMain =
  "absolute -bottom-12 -right-12 w-56 h-56 rounded-full bg-white/[0.04] blur-[80px] pointer-events-none";
const cardGlowSecondary =
  "absolute -top-10 -left-10 w-40 h-40 rounded-full bg-white/[0.03] blur-[64px] pointer-events-none";

/* Pipeline steps for horizontal flow inside Operação Comercial */
const pipelineSteps = [
  { icon: Clock, label: "Follow-up automático" },
  { icon: RefreshCw, label: "Pipeline atualizado" },
  { icon: Target, label: "Lead qualificado" },
  { icon: CheckCircle, label: "Oportunidade fechada" },
];

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
            Plataforma completa
          </span>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
            Uma máquina integrada de
            <br />
            <span className="text-muted-foreground">geração de oportunidades B2B</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Da captação ao fechamento, cada etapa do processo comercial conectada por dados, IA e automação — sem depender de operação manual.
          </p>
        </motion.div>

        {isVisible && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className={cn(
              "grid w-full grid-cols-1 gap-4 md:grid-cols-3",
              "md:grid-rows-3",
              "auto-rows-[minmax(110px,auto)]"
            )}
          >
            {/* Top-left: Prospecção */}
            <motion.div variants={itemVariants} className="md:col-span-1 md:row-span-1">
              <div className={cardBase}>
                <div className={cardGlowSecondary} />
                <div className={cardGlowMain} />
                <div className="relative z-10">
                  <span className="inline-block text-[10px] font-semibold text-primary/80 bg-primary/5 px-2 py-0.5 rounded-full mb-2 uppercase tracking-wider">Prospecção Inteligente</span>
                  <div className="flex items-center gap-2.5 mb-1">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <MessageCircle size={16} className="text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground text-[15px]">Abordagem Contextual em Escala</h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Cada lead recebe uma mensagem construída a partir do seu nicho, porte e diagnóstico real — não templates genéricos. Isso aumenta taxa de resposta e acelera a entrada no pipeline.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Top-center: Campanhas */}
            <motion.div variants={itemVariants} className="md:col-span-1 md:row-span-1">
              <div className={cardBase}>
                <div className={cardGlowSecondary} />
                <div className={cardGlowMain} />
                <div className="relative z-10">
                  <span className="inline-block text-[10px] font-semibold text-primary/80 bg-primary/5 px-2 py-0.5 rounded-full mb-2 uppercase tracking-wider">API Oficial & Segurança</span>
                  <div className="flex items-center gap-2.5 mb-1">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Send size={16} className="text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground text-[15px]">Campanhas via API Oficial Meta</h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Envios outbound e inbound pela API oficial do WhatsApp Business, com conformidade total às políticas da Meta. Escala real sem risco de bloqueio ou perda de número.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Right tall: Agente de IA - with flow builder image */}
            <motion.div variants={itemVariants} className="md:col-span-1 md:row-span-3">
              <div className={`${cardBase} !p-0`}>
                <div className={cardGlowSecondary} />
                <div className={cardGlowMain} />
                <div className="relative z-10 p-3 sm:p-3.5 pb-36 sm:pb-44 flex flex-col h-full">
                  <span className="inline-block text-[10px] font-semibold text-primary/80 bg-primary/5 px-2 py-0.5 rounded-full mb-2 uppercase tracking-wider w-fit">Conversas humanas em escala</span>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bot size={20} className="text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground text-base">Agente de IA com Fluxos Estruturados</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    A IA responde, qualifica e conduz cada conversa dentro de fluxos definidos, avançando o lead até o momento de decisão com naturalidade e consistência, sem intervenção humana.
                  </p>
                </div>
                {/* Flow builder background image */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] sm:h-[58%] overflow-hidden">
                  <img
                    src={flowBuilderPreview}
                    alt="Visualização do editor de fluxos"
                    loading="eager"
                    decoding="async"
                    className="absolute left-[55%] top-[15%] w-[160%] sm:w-[165%] min-w-[320px] max-w-none -translate-x-1/2 opacity-60 drop-shadow-2xl"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />
                </div>
              </div>
            </motion.div>

            {/* Mid-left: CRM */}
            <motion.div variants={itemVariants} className="md:col-span-1 md:row-span-1">
              <div className={cardBase}>
                <div className={cardGlowSecondary} />
                <div className={cardGlowMain} />
                <div className="relative z-10">
                  <span className="inline-block text-[10px] font-semibold text-primary/80 bg-primary/5 px-2 py-0.5 rounded-full mb-2 uppercase tracking-wider">Gestão & Scoring</span>
                  <div className="flex items-center gap-2.5 mb-1">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <LayoutDashboard size={16} className="text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground text-[15px]">CRM com Scoring Automático</h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Pipeline visual que organiza cada lead por estágio, registra histórico de interações e atribui score com base em comportamento real. Sua equipe sabe exatamente quem priorizar a cada momento.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Mid-center: Captação */}
            <motion.div variants={itemVariants} className="md:col-span-1 md:row-span-1">
              <div className={cardBase}>
                <div className={cardGlowSecondary} />
                <div className={cardGlowMain} />
                <div className="relative z-10">
                  <span className="inline-block text-[10px] font-semibold text-primary/80 bg-primary/5 px-2 py-0.5 rounded-full mb-2 uppercase tracking-wider">Captação + Diagnóstico</span>
                  <div className="flex items-center gap-2.5 mb-1">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Search size={16} className="text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground text-[15px]">Captação com Diagnóstico Automático</h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Extrai leads diretamente do Google Maps e analisa cada empresa: nicho de atuação, presença digital, telefones validados e nível de aderência ao seu produto. Leads prontos para abordagem, priorizados por potencial de conversão.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Bottom wide: Automação with horizontal timeline */}
            <motion.div variants={itemVariants} className="md:col-span-2 md:row-span-1">
              <div className={`${cardBase} !flex-col`}>
                <div className={cardGlowSecondary} />
                <div className={cardGlowMain} />
                <div className="relative z-10">
                  <span className="inline-block text-[10px] font-semibold text-primary/80 bg-primary/5 px-2 py-0.5 rounded-full mb-2 uppercase tracking-wider">Automação Comercial</span>
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Zap size={16} className="text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground text-[15px]">Operação Comercial Autônoma</h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Follow-ups, atualizações de pipeline e tarefas repetitivas executadas automaticamente. Nenhum lead fica sem resposta, nenhuma oportunidade é esquecida, 24 horas por dia.
                  </p>
                </div>

                {/* Horizontal timeline */}
                <div className="relative z-10 mt-4 flex items-center justify-between gap-0 px-2">
                  {timelineSteps.map((step, i) => (
                    <div key={i} className="flex items-center flex-1 last:flex-none">
                      {/* Step */}
                      <motion.div
                        className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-full px-3 py-1.5 whitespace-nowrap"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={isVisible ? { opacity: 1, scale: 1 } : {}}
                        transition={{ duration: 0.4, delay: 0.5 + i * 0.15, ease: "easeOut" }}
                      >
                        <div className="w-4 h-4 rounded-full border-2 border-primary/60 flex items-center justify-center flex-shrink-0">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary/80" />
                        </div>
                        <span className="text-[10px] sm:text-[11px] font-medium text-foreground/80">{step.label}</span>
                      </motion.div>
                      {/* Connector line */}
                      {i < timelineSteps.length - 1 && (
                        <motion.div
                          className="flex-1 h-px bg-primary/20 mx-1"
                          initial={{ scaleX: 0 }}
                          animate={isVisible ? { scaleX: 1 } : {}}
                          transition={{ duration: 0.4, delay: 0.65 + i * 0.15, ease: "easeOut" }}
                          style={{ transformOrigin: "left" }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </section>
  );
};
