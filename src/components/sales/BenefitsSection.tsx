import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { motion } from "framer-motion";
import { Rocket, Target, MessageCircle, Headphones, RefreshCw, LayoutGrid } from "lucide-react";

const benefits = [
  { icon: Rocket, title: "Mais oportunidades", desc: "Captação automática gera leads sem esforço manual. Sua equipe foca em vender." },
  { icon: Target, title: "Menos tempo perdido", desc: "Qualificação por IA filtra leads fracos antes de você investir tempo." },
  { icon: MessageCircle, title: "Mais respostas", desc: "Mensagens personalizadas com contexto geram até 3x mais interesse." },
  { icon: Headphones, title: "Operação 24/7", desc: "Atendimento automatizado mantém sua operação ativa o dia inteiro." },
  { icon: RefreshCw, title: "Zero oportunidades perdidas", desc: "Follow-up inteligente reengaja leads no momento certo." },
  { icon: LayoutGrid, title: "Visão total do funil", desc: "CRM integrado com score, histórico e automação em um só lugar." },
];

export const BenefitsSection = () => {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section ref={ref as React.RefObject<HTMLElement>} className="py-20 sm:py-32 w-full relative">
      <div className="container mx-auto px-4 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase bg-primary/10 text-primary mb-4">
            Resultados reais
          </span>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
            Menos esforço.<br />
            <span className="text-shimmer-highlight">Mais resultado.</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A Wiize reduz custo operacional, aumenta produtividade comercial e transforma vendas em um processo previsível e escalável.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((b, i) => (
            <motion.div
              key={b.title}
              initial={{ opacity: 0, y: 20 }}
              animate={isVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 * i }}
              className="group p-8 rounded-2xl border border-border bg-card/30 hover:bg-card/60 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <b.icon size={22} className="text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{b.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
