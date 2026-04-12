import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { motion } from "framer-motion";
import {
  Crosshair,
  MessageCircle,
  ShieldCheck,
  LayoutDashboard,
  RefreshCw,
  Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";

const modules = [
  {
    icon: Crosshair,
    title: "Captação com inteligência de mercado",
    what: "Identifica empresas com potencial real de compra usando dados públicos do Google Maps — localização, atividade recente, nicho e porte.",
    how: "Cada lead passa por um diagnóstico automático que valida telefone, classifica aderência e gera um score antes de qualquer abordagem.",
    impact: "Você prospecta apenas quem tem fit com seu produto. Zero esforço manual, zero lista fria.",
    tag: "Captação",
  },
  {
    icon: MessageCircle,
    title: "Abordagem contextualizada em escala",
    what: "Cada lead recebe uma mensagem construída com base no seu perfil real — não um template genérico enviado para centenas de contatos.",
    how: "O sistema usa os dados do diagnóstico para personalizar a abordagem, adaptar o tom e definir a cadência ideal de follow-up.",
    impact: "Taxa de resposta até 4x maior do que disparos tradicionais sem contexto.",
    tag: "Prospecção",
  },
  {
    icon: ShieldCheck,
    title: "Campanhas estáveis via API oficial Meta",
    what: "Envio em massa através da API oficial do WhatsApp Business — inbound e outbound — com templates aprovados e entrega garantida.",
    how: "Sem conexão por QR Code, sem instabilidade, sem risco de banimento. Métricas de entrega, leitura e resposta em tempo real.",
    impact: "Escala com segurança. Seu número e reputação protegidos em cada disparo.",
    tag: "Campanhas",
  },
  {
    icon: LayoutDashboard,
    title: "Pipeline visual com priorização automática",
    what: "CRM integrado com Kanban, estágios personalizados e lead scoring baseado em dados reais de engajamento e perfil.",
    how: "Leads são classificados e priorizados automaticamente. Você sabe exatamente quem abordar primeiro e quando agir para fechar.",
    impact: "Previsibilidade no funil. Decisões baseadas em dados, não em intuição.",
    tag: "CRM + Score",
  },
  {
    icon: RefreshCw,
    title: "Operação comercial sem dependência humana",
    what: "Follow-ups, movimentação de estágios, notificações e ações repetitivas acontecem automaticamente, 24 horas por dia.",
    how: "Regras configuráveis disparam ações em tempo real conforme o lead avança ou esfria no funil.",
    impact: "Sua equipe foca em fechar negócios. O sistema cuida de todo o resto.",
    tag: "Automação",
  },
  {
    icon: Bot,
    title: "IA que conduz conversas e qualifica leads",
    what: "Agentes inteligentes respondem, qualificam e avançam leads em conversas naturais — sem parecer robótico, sem perder contexto.",
    how: "Fluxos visuais permitem criar jornadas completas de atendimento e qualificação, com handoff para o time quando necessário.",
    impact: "Atendimento instantâneo em escala com a personalização de um SDR dedicado.",
    tag: "Agente de IA",
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
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 80, damping: 14 },
  },
};

const cardGlowMain =
  "absolute -bottom-20 -right-20 w-52 h-52 rounded-full bg-primary/12 blur-[80px] pointer-events-none";
const cardGlowSecondary =
  "absolute -top-14 -left-14 w-36 h-36 rounded-full bg-primary/8 blur-[64px] pointer-events-none";

export const FeaturesOverviewSection = () => {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="py-16 sm:py-24 w-full relative"
    >
      <div className="container mx-auto px-4 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase bg-primary/10 text-primary mb-4">
            Sistema integrado
          </span>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-5">
            A estrutura completa por trás
            <br />
            <span className="text-muted-foreground">das suas vendas em escala</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Não são ferramentas isoladas. É um sistema único que conecta captação, qualificação, abordagem, conversão e gestão — cada módulo alimenta o próximo.
          </p>
        </motion.div>

        {isVisible && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {modules.map((mod) => {
              const Icon = mod.icon;
              return (
                <motion.div key={mod.title} variants={itemVariants}>
                  <div className="group rounded-2xl border border-border/70 bg-card/80 backdrop-blur-sm transition-shadow duration-500 ease-out hover:shadow-lg relative overflow-hidden h-full">
                    <div className={cardGlowSecondary} />
                    <div className={cardGlowMain} />

                    <div className="relative z-10 p-5 sm:p-6 flex flex-col h-full">
                      {/* Header */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Icon size={20} className="text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2.5">
                            <h3 className="font-semibold text-foreground text-[15px] leading-snug">
                              {mod.title}
                            </h3>
                            <span className="text-[10px] font-semibold tracking-wider uppercase text-primary/60 bg-primary/5 px-2 py-0.5 rounded-full flex-shrink-0">
                              {mod.tag}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* What */}
                      <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                        {mod.what}
                      </p>

                      {/* How */}
                      <p className="text-xs text-muted-foreground/80 leading-relaxed mb-4 border-l-2 border-primary/20 pl-3">
                        {mod.how}
                      </p>

                      {/* Impact */}
                      <div className="mt-auto pt-2 border-t border-border/40">
                        <p className="text-xs font-medium text-primary/80 leading-relaxed">
                          ↗ {mod.impact}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </section>
  );
};
