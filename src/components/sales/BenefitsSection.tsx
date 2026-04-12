import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { motion } from "framer-motion";
import { TrendingUp, Clock, ShieldCheck, BarChart3 } from "lucide-react";

const benefits = [
  {
    icon: TrendingUp,
    title: "Aumente suas vendas sem crescer sua equipe",
    desc: "Automação que multiplica a produtividade comercial sem adicionar headcount.",
  },
  {
    icon: Clock,
    title: "Atenda todos os leads no momento certo, 24/7",
    desc: "Tempo de resposta zero para cada lead, em qualquer horário do dia.",
  },
  {
    icon: ShieldCheck,
    title: "Nenhuma oportunidade perdida por falta de follow-up",
    desc: "O sistema garante que cada lead receba acompanhamento até a conversão.",
  },
  {
    icon: BarChart3,
    title: "Previsibilidade real sobre seu funil e suas vendas",
    desc: "Dados em tempo real para prever receita e otimizar cada etapa do pipeline.",
  },
];

export const BenefitsSection = () => {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section ref={ref as React.RefObject<HTMLElement>} className="py-20 sm:py-28 w-full relative">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-3 leading-tight">
            Mais vendas,{" "}
            <span className="text-shimmer-highlight">menos esforço</span>
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Uma operação comercial que trabalha por você, todos os dias.
          </p>
        </motion.div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {benefits.map((b, i) => (
            <motion.div
              key={b.title}
              initial={{ opacity: 0, y: 20 }}
              animate={isVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 + 0.1 * i }}
              className="group relative p-7 sm:p-8 rounded-2xl border border-border/60 bg-white/[0.03] hover:bg-white/[0.06] hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300"
            >
              {/* Subtle glow */}
              <div className="absolute -bottom-8 -right-8 w-36 h-36 rounded-full bg-primary/[0.04] blur-[60px] pointer-events-none" />

              <div className="relative z-10">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                  <b.icon size={20} className="text-primary" />
                </div>
                <h3 className="font-semibold text-foreground text-[15px] mb-1.5 leading-snug">{b.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
