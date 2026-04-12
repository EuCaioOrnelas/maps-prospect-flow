import { motion } from "framer-motion";
import { Crosshair, MessageCircle, Timer, RotateCcw, Workflow, BarChart3 } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const reasons = [
  {
    icon: Crosshair,
    title: "Leads com potencial real",
    description:
      "O sistema identifica empresas com atividade recente e aderência ao seu produto. Você não gasta tempo com contatos aleatórios — só entra em contato com quem tem perfil de compra.",
  },
  {
    icon: MessageCircle,
    title: "Abordagem com contexto",
    description:
      "Cada mensagem é construída com base no nicho, porte e situação real do lead. Isso elimina o efeito de mensagem genérica e aumenta significativamente a taxa de resposta.",
  },
  {
    icon: Timer,
    title: "Timing preciso de contato",
    description:
      "O sistema age no momento certo, sem depender da disponibilidade da sua equipe. O lead recebe atenção quando está mais propenso a responder.",
  },
  {
    icon: RotateCcw,
    title: "Follow-up consistente",
    description:
      "Nenhuma oportunidade é esquecida. O acompanhamento acontece de forma automática e estruturada, mantendo o lead aquecido até a conversão.",
  },
  {
    icon: Workflow,
    title: "Processo acima de esforço",
    description:
      "A operação segue um fluxo definido em vez de depender de iniciativa individual. Isso torna o resultado replicável, independente de quem opera.",
  },
  {
    icon: BarChart3,
    title: "Controle baseado em dados",
    description:
      "Você acompanha cada etapa do funil com métricas reais. Sabe exatamente onde estão os gargalos e o que precisa ser ajustado para vender mais.",
  },
];

export const WhyItWorksSection = () => {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section
      ref={ref}
      className="relative py-20 md:py-28 overflow-hidden"
    >
      {/* Subtle background differentiation */}
      <div className="absolute inset-0 bg-muted/30" />
      <div className="absolute inset-0 opacity-[0.02]"
        style={{ backgroundImage: 'radial-gradient(hsl(var(--foreground)) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

      <div className="relative z-10 container mx-auto px-4 md:px-6 max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <span className="inline-block text-[11px] font-semibold tracking-[0.2em] uppercase text-primary/70 mb-3">
            Lógica do sistema
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground leading-tight mb-4">
            Por que esse modelo gera mais vendas
          </h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Não é sobre trabalhar mais. É sobre aplicar o processo certo em cada etapa da venda.
          </p>
        </motion.div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {reasons.map((reason, index) => {
            const Icon = reason.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 24 }}
                animate={isVisible ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group relative rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-6 md:p-7 transition-all duration-300 hover:shadow-lg hover:shadow-primary/[0.04] hover:-translate-y-0.5 hover:border-primary/20"
              >
                {/* Glow */}
                <div className="absolute -bottom-8 -right-8 w-32 h-32 rounded-full bg-primary/[0.04] blur-[50px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="relative z-10">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <Icon size={17} className="text-primary" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground mb-2 leading-tight">
                    {reason.title}
                  </h3>
                  <p className="text-[13px] text-muted-foreground leading-relaxed">
                    {reason.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
