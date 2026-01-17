import { motion } from "framer-motion";
import { Bot, Sparkles, MessageSquare, Zap, Clock, Target, CheckCircle, Brain, Wand2, ArrowRight, AlertTriangle } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

export const AIAgentsSection = () => {
  const { ref, isVisible } = useScrollAnimation();

  const problems = [
    "Leads respondem, mas você demora a ver",
    "Escrever mensagens personalizadas é demorado",
    "Não sabe programar chatbots ou automações",
    "Respostas genéricas afastam clientes"
  ];

  const features = [
    {
      icon: Wand2,
      title: "Prompts Simplificados",
      description: "Configure seu agente com linguagem natural. Sem código, sem complicação. Basta descrever o que você quer."
    },
    {
      icon: Clock,
      title: "Respostas em Segundos",
      description: "Seu agente responde leads automaticamente 24/7, enquanto você foca no que importa."
    },
    {
      icon: Target,
      title: "Personalização Inteligente",
      description: "A IA adapta as respostas baseado no contexto da conversa e no perfil do lead."
    },
    {
      icon: Brain,
      title: "Aprende seu Estilo",
      description: "Configure o tom de voz: profissional, casual ou técnico. O agente mantém sua identidade."
    }
  ];

  const useCases = [
    {
      title: "Prospecção",
      description: "Responde leads interessados e qualifica automaticamente",
      icon: Target
    },
    {
      title: "Aquecimento",
      description: "Mantém conversas naturais para preparar chips novos",
      icon: MessageSquare
    },
    {
      title: "Follow-up",
      description: "Retoma conversas paradas e reengaja leads frios",
      icon: ArrowRight
    }
  ];

  return (
    <section 
      id="ai-agents" 
      className="py-16 md:py-24 relative overflow-hidden w-full"
      ref={ref as React.RefObject<HTMLElement>}
    >
      <div className="absolute inset-0 bg-gradient-glow opacity-20" />
      
      <div className="container mx-auto px-4 relative z-10 max-w-6xl">
        {/* Header */}
        <div 
          className={`text-center mb-12 md:mb-16 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6">
            <Bot size={16} className="text-primary" />
            <span className="text-sm text-muted-foreground">Agentes de IA</span>
            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-500 text-xs font-semibold rounded-full">BETA</span>
          </div>
          
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            IA que responde por você <span className="text-gradient">sem complicação</span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            Crie agentes de IA em minutos, sem saber programar. 
            Configure com linguagem natural e deixe a automação trabalhar.
          </p>
        </div>

        {/* Problem Statement */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="glass rounded-2xl p-6 md:p-8 mb-12 md:mb-16 border-amber-500/20"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <h3 className="font-display text-xl font-semibold">Você já passou por isso?</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {problems.map((problem, index) => (
              <div key={index} className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
                <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-amber-500 text-sm font-bold">!</span>
                </div>
                <span className="text-sm text-muted-foreground">{problem}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Solution - Features */}
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8 mb-12 md:mb-16">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="glass rounded-xl p-6 hover:bg-card/90 transition-all duration-300 group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Differentials */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="glass rounded-2xl p-6 md:p-8 mb-12 md:mb-16 bg-gradient-to-br from-primary/10 via-transparent to-transparent border-primary/20"
        >
          <div className="flex flex-col md:flex-row items-start gap-6 md:gap-8">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-display text-xl font-semibold">Diferencial Wiize</h3>
              </div>
              
              <p className="text-muted-foreground mb-6">
                Diferente de chatbots tradicionais que exigem fluxos complexos e código, 
                nossos agentes são configurados com <strong className="text-foreground">prompts em português</strong>. 
                Você descreve como quer que o agente se comporte, e pronto.
              </p>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-sm">Sem necessidade de conhecimento técnico</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-sm">Configure em menos de 5 minutos</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-sm">IA avançada integrada ao WhatsApp</span>
                </div>
              </div>
            </div>

            {/* Example Prompt */}
            <div className="flex-1 w-full">
              <div className="bg-background/50 rounded-xl p-4 border border-border/50">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-xs text-muted-foreground ml-2">Prompt do Agente</span>
                </div>
                <div className="font-mono text-xs text-muted-foreground leading-relaxed">
                  <p className="mb-2">
                    <span className="text-primary">"</span>Você é um assistente de vendas amigável. 
                    Responda de forma casual e direta.
                  </p>
                  <p className="mb-2">
                    Quando alguém perguntar sobre preços, 
                    explique nossos planos brevemente.
                  </p>
                  <p>
                    Sempre termine perguntando se pode ajudar com mais algo.<span className="text-primary">"</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Use Cases */}
        <div 
          className={`transition-all duration-700 delay-300 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <h3 className="font-display text-2xl font-semibold text-center mb-8">Onde usar seus agentes</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {useCases.map((useCase, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="glass rounded-xl p-6 text-center hover:bg-card/90 transition-all duration-300"
              >
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <useCase.icon className="w-7 h-7 text-primary" />
                </div>
                <h4 className="font-semibold text-foreground mb-2">{useCase.title}</h4>
                <p className="text-sm text-muted-foreground">{useCase.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
