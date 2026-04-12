import { motion } from "framer-motion";
import { Shield, Zap, Target, Brain, BarChart3, CheckCircle, Sparkles, TrendingUp, Search, MessageSquare, Clock } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const pillars = [
  {
    icon: Search,
    title: "Dados reais, não achismo",
    subtitle: "Prospecção baseada em evidências",
    description: "A plataforma cruza dados de atividade, nicho e presença digital para encontrar empresas com potencial real de compra — eliminando leads frios da sua operação.",
  },
  {
    icon: Brain,
    title: "IA que entende contexto",
    subtitle: "Abordagem sob medida",
    description: "Cada mensagem é construída com base no perfil real da empresa. Não é template genérico — é comunicação que parece humana e relevante desde o primeiro contato.",
  },
  {
    icon: Zap,
    title: "Processo que escala sozinho",
    subtitle: "Operação autônoma",
    description: "Do primeiro contato ao follow-up, a estrutura opera sem depender de esforço manual. Você configura uma vez e o sistema executa de forma consistente.",
  },
];

const capabilities = [
  { icon: Target, text: "Leads filtrados por aderência, não por volume aleatório" },
  { icon: MessageSquare, text: "Mensagens contextuais que aumentam taxa de resposta em até 3x" },
  { icon: Clock, text: "Timing automático: contato no momento de maior atenção do lead" },
  { icon: TrendingUp, text: "Follow-up estruturado que recupera oportunidades esquecidas" },
  { icon: BarChart3, text: "Funil visível com dados reais para decisões baseadas em evidências" },
  { icon: Shield, text: "Infraestrutura profissional com API oficial e conformidade total" },
];

const comparisonItems = [
  { traditional: "Prospecção manual com listas genéricas", wiize: "IA analisa e prioriza leads com potencial real" },
  { traditional: "Mensagens iguais para todos os leads", wiize: "Abordagem personalizada por nicho e contexto" },
  { traditional: "Follow-up esquecido ou inconsistente", wiize: "Acompanhamento automático e estruturado" },
  { traditional: "Sem visibilidade sobre o funil", wiize: "Métricas em tempo real em cada etapa" },
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
          className={`text-center mb-16 md:mb-20 transition-all duration-700 ${
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
            Não é sobre trabalhar mais. É sobre ter o processo certo em cada etapa — 
            e deixar a estrutura fazer o trabalho pesado por você.
          </p>
        </div>

        {/* 3 Pillars */}
        <div className="grid md:grid-cols-3 gap-5 lg:gap-6 mb-16 md:mb-20">
          {pillars.map((pillar, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.12 }}
              className="group relative rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-7 hover:border-primary/30 hover:bg-card/80 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                <pillar.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground mb-1">{pillar.title}</h3>
              <p className="text-sm text-primary/80 font-medium mb-3">{pillar.subtitle}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{pillar.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Visual + Capabilities */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 mb-16 md:mb-20 items-center">
          {/* Left: Visual block */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="rounded-2xl border border-border/60 bg-card/80 overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border/40 bg-secondary/30">
                <div className="w-3 h-3 rounded-full bg-destructive/60" />
                <div className="w-3 h-3 rounded-full bg-warning/60" />
                <div className="w-3 h-3 rounded-full bg-primary/60" />
                <span className="text-xs text-muted-foreground ml-3 font-medium">Como a Wiize opera</span>
              </div>

              <div className="p-6 space-y-5">
                <div>
                  <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1.5 block">Entrada</label>
                  <div className="rounded-lg bg-secondary/40 border border-border/30 px-4 py-2.5 text-sm text-foreground/90">
                    Empresas do Google Maps com atividade recente
                  </div>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1.5 block">Processamento IA</label>
                  <div className="flex flex-wrap gap-2">
                    {["Análise de nicho", "Score de aderência", "Mensagem contextual"].map((item, i) => (
                      <span
                        key={item}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          i === 2
                            ? "bg-primary/15 border-primary/30 text-primary"
                            : "bg-secondary/30 border-border/30 text-muted-foreground"
                        }`}
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1.5 block">Resultado</label>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-lg bg-secondary/40 border border-border/30 px-4 py-2.5">
                      <span className="text-sm text-foreground/90">Lead qualificado</span>
                      <span className="text-xs bg-primary/15 text-primary px-2.5 py-1 rounded-md font-medium">→ CRM</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-secondary/40 border border-border/30 px-4 py-2.5">
                      <span className="text-sm text-foreground/90">Follow-up automático</span>
                      <span className="text-xs bg-amber-500/15 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-md font-medium">→ Conversão</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-xs text-primary font-medium">Sistema operando 24/7</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right: Capabilities */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <div>
              <h3 className="font-display text-2xl md:text-3xl font-bold mb-3">
                O que isso muda na prática
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Cada etapa do processo foi desenhada para eliminar gargalos e maximizar conversão — sem depender de esforço manual.
              </p>
            </div>

            <div className="space-y-3">
              {capabilities.map((cap, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.08 }}
                  className="flex items-center gap-4 p-3.5 rounded-xl bg-card/50 border border-border/30 hover:border-primary/20 transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <cap.icon className="w-4.5 h-4.5 text-primary" size={18} />
                  </div>
                  <span className="text-sm text-foreground/90">{cap.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Comparison */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm overflow-hidden"
        >
          <div className="p-6 md:p-8 border-b border-border/30">
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h3 className="font-display text-xl md:text-2xl font-semibold">Por que é diferente</h3>
            </div>
            <p className="text-sm text-muted-foreground">Prospecção tradicional vs. Sistema Wiize: estrutura vence esforço.</p>
          </div>

          <div className="divide-y divide-border/20">
            <div className="grid grid-cols-2 gap-4 px-6 md:px-8 py-4 bg-secondary/20">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Prospecção tradicional</div>
              <div className="text-xs font-semibold text-primary uppercase tracking-wider">Sistema Wiize</div>
            </div>

            {comparisonItems.map((item, index) => (
              <div key={index} className="grid grid-cols-2 gap-4 px-6 md:px-8 py-4 hover:bg-secondary/10 transition-colors">
                <div className="flex items-start gap-2.5">
                  <span className="text-destructive/60 mt-0.5 flex-shrink-0">✕</span>
                  <span className="text-sm text-muted-foreground">{item.traditional}</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-foreground">{item.wiize}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};
