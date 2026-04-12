import { motion } from "framer-motion";
import { Shield, Zap, Brain, Search } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const pillars = [
  {
    icon: Search,
    title: "Dados reais, não achismo",
    subtitle: "Prospecção baseada em evidências",
    description: "A plataforma cruza dados de atividade, nicho e presença digital para encontrar empresas com potencial real de compra, eliminando leads frios da sua operação.",
  },
  {
    icon: Brain,
    title: "IA que entende contexto",
    subtitle: "Abordagem sob medida",
    description: "Cada mensagem é construída com base no perfil real da empresa. Não é template genérico, é comunicação que parece humana e relevante desde o primeiro contato.",
  },
  {
    icon: Zap,
    title: "Processo que escala sozinho",
    subtitle: "Operação autônoma",
    description: "Do primeiro contato ao follow-up, a estrutura opera sem depender de esforço manual. Você configura uma vez e o sistema executa de forma consistente.",
  },
];

const results = [
  {
    metric: "3x",
    label: "mais respostas",
    description: "Mensagens contextuais geram engajamento real",
  },
  {
    metric: "24/7",
    label: "operação contínua",
    description: "Leads contatados no momento certo, sem espera",
  },
  {
    metric: "100%",
    label: "follow-up garantido",
    description: "Nenhuma oportunidade esquecida no funil",
  },
  {
    metric: "Total",
    label: "visibilidade do funil",
    description: "Dados reais para decisões baseadas em evidências",
  },
];

export const WhyItWorksSection = () => {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section
      className="py-12 sm:py-20 relative overflow-hidden w-full"
      ref={ref as React.RefObject<HTMLElement>}
    >

      <div className="container mx-auto px-4 relative z-10 max-w-6xl">
        {/* Header */}
        <div
          className={`text-center mb-12 md:mb-14 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 mb-6">
            <Shield size={16} className="text-primary" />
            <span className="text-sm text-muted-foreground font-medium">Por que funciona</span>
          </div>

          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-bold mb-5 leading-tight text-foreground">
            Por que esse sistema gera<br />
            <span className="text-shimmer-highlight">mais vendas consistentes</span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Não é sobre trabalhar mais. É sobre ter o processo certo em cada etapa
            e deixar a estrutura fazer o trabalho pesado por você.
          </p>
        </div>

        {/* 3 Pillars */}
        <div className="relative grid md:grid-cols-3 gap-5 lg:gap-6">
          {pillars.map((pillar, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.12 }}
              className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-7 hover:border-primary/30 hover:bg-card/80 transition-all duration-300"
            >
              {/* Green glow inside each card - top left */}
              <div className="absolute -top-10 -left-10 w-32 h-32 rounded-full opacity-[0.15] pointer-events-none"
                style={{ background: 'radial-gradient(ellipse, hsl(158 72% 45%), transparent 70%)' }} />

              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                  <pillar.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground mb-1">{pillar.title}</h3>
                <p className="text-sm text-primary/80 font-medium mb-3">{pillar.subtitle}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{pillar.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Results - visually connected, no gap */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative mt-5 lg:mt-6 overflow-hidden rounded-2xl border border-border/50 bg-card/40 backdrop-blur-sm p-8 md:p-10"
        >
          {/* Multiple green glows */}
          <div className="absolute -top-16 -left-16 w-56 h-56 rounded-full opacity-[0.14] pointer-events-none"
            style={{ background: 'radial-gradient(ellipse, hsl(158 72% 45%), transparent 70%)' }} />
          <div className="absolute -bottom-16 -right-16 w-56 h-56 rounded-full opacity-[0.14] pointer-events-none"
            style={{ background: 'radial-gradient(ellipse, hsl(158 72% 45%), transparent 70%)' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full opacity-[0.06] pointer-events-none"
            style={{ background: 'radial-gradient(ellipse, hsl(158 72% 45%), transparent 70%)' }} />

          <div className="relative z-10">
            <div className="text-center mb-8">
              <h3 className="font-display text-xl md:text-2xl font-bold text-foreground mb-2">
                O que isso muda na prática
              </h3>
              <p className="text-sm text-muted-foreground max-w-xl mx-auto">
                Cada etapa do processo foi desenhada para eliminar gargalos e maximizar conversão.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
              {results.map((result, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.08 }}
                  className="text-center p-5 rounded-xl hover:bg-card/60 transition-all duration-300"
                >
                  <span className="font-display text-3xl md:text-4xl font-bold text-primary block mb-1">
                    {result.metric}
                  </span>
                  <span className="text-sm font-semibold text-foreground block mb-2">
                    {result.label}
                  </span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
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
