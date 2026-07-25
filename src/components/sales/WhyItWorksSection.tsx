import { motion } from "framer-motion";
import { Zap, Brain, Search, Sparkles } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { SectionHeading } from "@/components/landing/SectionHeading";

const pillars = [
  {
    icon: Search,
    eyebrow: "Dados reais",
    title: "Prospecção baseada em evidências",
    description:
      "A plataforma cruza dados de atividade, nicho e presença digital para encontrar empresas com potencial real de compra, eliminando leads frios da sua operação.",
  },
  {
    icon: Brain,
    eyebrow: "IA contextual",
    title: "Abordagem sob medida para cada lead",
    description:
      "Cada mensagem é construída com base no perfil real da empresa. Não é template genérico, é comunicação que parece humana e relevante desde o primeiro contato.",
  },
  {
    icon: Zap,
    eyebrow: "Operação autônoma",
    title: "Processo comercial que escala sozinho",
    description:
      "Do primeiro contato ao follow-up, a estrutura opera sem depender de esforço manual. Você configura uma vez e o sistema executa de forma consistente.",
  },
];

const results = [
  { metric: "3x", label: "mais respostas", description: "Mensagens contextuais geram engajamento real" },
  { metric: "24/7", label: "operação contínua", description: "Leads contatados no momento certo, sem espera" },
  { metric: "100%", label: "follow-up garantido", description: "Nenhuma oportunidade esquecida no funil" },
  { metric: "Total", label: "visibilidade do funil", description: "Dados reais para decisões baseadas em evidências" },
];

export const WhyItWorksSection = () => {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section
      className="py-12 sm:py-20 relative overflow-hidden w-full"
      ref={ref as React.RefObject<HTMLElement>}
    >
      <div className="container mx-auto px-4 relative z-10 max-w-6xl">
        {/* Header padronizado */}
        <SectionHeading
          eyebrow="Por que funciona"
          title="Por que esse sistema gera"
          highlight="mais vendas consistentes"
          description="Não é sobre trabalhar mais. É sobre ter o processo certo em cada etapa e deixar a estrutura fazer o trabalho pesado por você."
          isVisible={isVisible}
        />

        {/* 3 Pilares — mesmo padrão visual dos cards da section anterior */}
        <div className="relative grid md:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
          {pillars.map((pillar, index) => {
            const Icon = pillar.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.12 }}
                className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card/95 p-4 sm:p-5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
              >
                <div className="absolute -bottom-10 -right-10 w-52 h-52 rounded-full bg-primary/[0.06] blur-[70px] pointer-events-none" />
                <div className="absolute -top-8 -left-8 w-36 h-36 rounded-full bg-primary/[0.04] blur-[56px] pointer-events-none" />

                <div className="relative z-10">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                      <Icon size={16} className="text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground text-base leading-tight">{pillar.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{pillar.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Bloco de resultados */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative mt-4 sm:mt-6 overflow-hidden rounded-2xl border border-border/70 bg-card/95 p-5 sm:p-8 md:p-10"
        >
          <div className="absolute -bottom-10 -right-10 w-52 h-52 rounded-full bg-primary/[0.06] blur-[70px] pointer-events-none" />
          <div className="absolute -top-8 -left-8 w-36 h-36 rounded-full bg-primary/[0.04] blur-[56px] pointer-events-none" />

          <div className="relative z-10">
            <div className="text-center mb-6 sm:mb-8">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-primary/80 bg-primary/5 px-2.5 py-0.5 rounded-full mb-3 uppercase tracking-wider">
                <Sparkles size={11} />
                Resultados na prática
              </span>
              <h3 className="font-display text-xl sm:text-2xl font-bold text-foreground mb-2">
                O que isso muda no dia a dia
              </h3>
              <p className="text-sm text-muted-foreground max-w-xl mx-auto">
                Cada etapa do processo foi desenhada para eliminar gargalos e maximizar conversão.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
              {results.map((result, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.08 }}
                  className="text-center p-3 sm:p-5 rounded-xl border border-border/40 bg-background/40 hover:border-primary/30 hover:bg-card/60 transition-all duration-300"
                >
                  <span className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-primary block mb-1">
                    {result.metric}
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-foreground block mb-1.5">
                    {result.label}
                  </span>
                  <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
                    {result.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
