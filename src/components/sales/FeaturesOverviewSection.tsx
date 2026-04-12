import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search,
  MessageCircle,
  Send,
  LayoutDashboard,
  Zap,
  Bot,
} from "lucide-react";

const features = [
  {
    icon: Search,
    title: "Captação Inteligente",
    description:
      "Encontre leads qualificados no Google Maps com IA. Diagnóstico automático de cada empresa: nicho, porte, telefone validado e score de aderência ao seu produto.",
    stat: "Captação + Diagnóstico",
  },
  {
    icon: MessageCircle,
    title: "Prospecção e Relacionamento",
    description:
      "Abordagem personalizada em escala. Cada lead recebe uma mensagem contextualizada com base no diagnóstico. Relacionamento contínuo com cadência inteligente.",
    stat: "Outreach contextual",
  },
  {
    icon: Send,
    title: "Campanhas via API Oficial Meta",
    description:
      "Disparos em massa com a API oficial do WhatsApp — inbound e outbound. Sem risco de banimento, com templates aprovados e métricas de entrega em tempo real.",
    stat: "Inbound + Outbound",
  },
  {
    icon: LayoutDashboard,
    title: "CRM e Lead Scoring",
    description:
      "Pipeline visual com Kanban, estágios personalizados e scoring automático. Saiba exatamente quais leads priorizar e quando agir para fechar mais vendas.",
    stat: "Gestão completa",
  },
  {
    icon: Zap,
    title: "Automação de Processos",
    description:
      "Automatize follow-ups, movimentação de estágios, notificações e ações repetitivas. Sua operação comercial roda no piloto automático 24/7.",
    stat: "Piloto automático",
  },
  {
    icon: Bot,
    title: "Agente de IA e Fluxos",
    description:
      "Agentes inteligentes que respondem leads, qualificam oportunidades e avançam conversas. Fluxos visuais de automação para criar jornadas personalizadas.",
    stat: "IA conversacional",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 100, damping: 12 },
  },
};

export const FeaturesOverviewSection = () => {
  const { ref, isVisible } = useScrollAnimation();

  const cardGlowMain =
    "absolute -bottom-16 -right-16 w-44 h-44 rounded-full bg-primary/14 blur-[72px] pointer-events-none opacity-100";
  const cardGlowSecondary =
    "absolute -top-12 -left-12 w-32 h-32 rounded-full bg-primary/10 blur-[60px] pointer-events-none opacity-90";

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
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <motion.div key={feature.title} variants={itemVariants}>
                  <Card className="group relative overflow-hidden border-border/70 bg-card/80 backdrop-blur-sm hover:shadow-md transition-shadow duration-500 h-full">
                    <div className={cardGlowSecondary} />
                    <div className={cardGlowMain} />
                    <CardContent className="p-5 relative z-10 flex flex-col h-full">
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Icon size={20} className="text-primary" />
                        </div>
                        <span className="text-[11px] font-medium text-primary/70 bg-primary/5 px-2.5 py-1 rounded-full">
                          {feature.stat}
                        </span>
                      </div>
                      <h3 className="font-semibold text-foreground text-base mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </section>
  );
};
