import { motion } from "framer-motion";
import { Flame, Shield, Clock, Zap, CheckCircle, AlertTriangle, Bot, TrendingUp, MessageSquare } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

export const WarmingSection = () => {
  const { ref, isVisible } = useScrollAnimation();

  const problems = [
    {
      icon: AlertTriangle,
      title: "Número bloqueado",
      description: "Seu WhatsApp foi banido após enviar mensagens em massa"
    },
    {
      icon: Clock,
      title: "Tempo perdido",
      description: "Semanas esperando desbloquear ou configurar novo chip"
    },
    {
      icon: MessageSquare,
      title: "Baixa entrega",
      description: "Mensagens não chegam porque o número é novo demais"
    }
  ];

  const solutions = [
    {
      icon: Bot,
      title: "Aquecimento com IA",
      description: "Nossa IA simula conversas naturais para preparar seu número gradualmente"
    },
    {
      icon: Shield,
      title: "Redução de risco",
      description: "Sistema inteligente que respeita os limites do WhatsApp e prolonga a vida útil do chip"
    },
    {
      icon: TrendingUp,
      title: "20 dias de preparação",
      description: "Processo automatizado que prepara seu chip para maior volume de mensagens"
    }
  ];

  const steps = [
    { day: "Dia 1-5", level: "Frio", color: "bg-blue-500", messages: "5-10 conversas/dia" },
    { day: "Dia 6-12", level: "Morno", color: "bg-yellow-500", messages: "15-25 conversas/dia" },
    { day: "Dia 13-20", level: "Quente", color: "bg-orange-500", messages: "30-50 conversas/dia" },
    { day: "Dia 21+", level: "Preparado", color: "bg-green-500", messages: "Pronto para campanhas" },
  ];

  return (
    <section 
      id="warming" 
      className="py-16 md:py-24 relative overflow-hidden w-full bg-gradient-to-b from-background via-primary/5 to-background"
      ref={ref as React.RefObject<HTMLElement>}
    >
      <div className="container mx-auto px-4 relative z-10 max-w-6xl">
        {/* Header */}
        <div 
          className={`text-center mb-12 md:mb-16 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6">
            <Flame size={16} className="text-orange-500" />
            <span className="text-sm text-muted-foreground">Aquecimento Inteligente</span>
          </div>
          
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-4 text-foreground">
            Reduza o risco de <span className="text-gradient">números bloqueados</span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            O Wiize prepara seus chips automaticamente para campanhas de prospecção em massa, 
            ajudando a reduzir o risco de banimento e prolongar a vida útil do seu número.
          </p>
          <p className="text-sm text-muted-foreground/70 mt-2 max-w-2xl mx-auto">
            *O aquecimento diminui significativamente as chances de bloqueio, mas não elimina completamente o risco inerente ao uso intensivo do WhatsApp.
          </p>
        </div>

        {/* Problem vs Solution */}
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8 mb-12 md:mb-16">
          {/* Problems */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="glass rounded-2xl p-6 md:p-8 border-red-500/20"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="font-display text-xl font-semibold text-red-600 dark:text-red-400">O Problema</h3>
            </div>
            
            <div className="space-y-4">
              {problems.map((problem, index) => (
                <div key={index} className="flex items-start gap-4 p-4 rounded-xl bg-red-500/5 border border-red-500/10">
                  <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
                    <problem.icon className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground mb-1">{problem.title}</h4>
                    <p className="text-sm text-muted-foreground">{problem.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Solutions */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="glass rounded-2xl p-6 md:p-8 border-primary/20"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-display text-xl font-semibold text-primary">A Solução Wiize</h3>
            </div>
            
            <div className="space-y-4">
              {solutions.map((solution, index) => (
                <div key={index} className="flex items-start gap-4 p-4 rounded-xl bg-primary/5 border border-primary/10">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <solution.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground mb-1">{solution.title}</h4>
                    <p className="text-sm text-muted-foreground">{solution.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* How it works - Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="glass rounded-2xl p-6 md:p-8"
        >
          <div className="text-center mb-8">
            <h3 className="font-display text-2xl font-semibold mb-2">Como funciona o aquecimento</h3>
            <p className="text-muted-foreground">Processo 100% automático em 4 etapas</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="relative text-center p-4 rounded-xl bg-muted/30 border border-border/50"
              >
                <div className={`w-4 h-4 rounded-full ${step.color} mx-auto mb-3 shadow-lg`} />
                <p className="text-xs text-muted-foreground mb-1">{step.day}</p>
                <p className="font-semibold text-foreground mb-2">{step.level}</p>
                <p className="text-xs text-muted-foreground">{step.messages}</p>
                
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-6 -right-2 w-4 h-0.5 bg-border" />
                )}
              </motion.div>
            ))}
          </div>

          {/* Benefits */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pt-8 border-t border-border/50">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-primary/10 to-emerald-500/5 border border-primary/15">
              <div className="w-7 h-7 rounded-md bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium text-foreground">Zero intervenção manual</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-primary/10 to-emerald-500/5 border border-primary/15">
              <div className="w-7 h-7 rounded-md bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium text-foreground">Conversas naturais com IA</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-primary/10 to-emerald-500/5 border border-primary/15">
              <div className="w-7 h-7 rounded-md bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium text-foreground">Até 10 chips simultâneos</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
