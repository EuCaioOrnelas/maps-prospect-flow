import { motion } from "framer-motion";
import { Shield, CheckCircle, Lock, Zap, Globe, ExternalLink, Star } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

export const OfficialAPISection = () => {
  const { ref, isVisible } = useScrollAnimation();

  const apiFeatures = [
    {
      icon: Shield,
      title: "API Oficial do WhatsApp",
      description: "Utilizamos a API oficial da Meta (Cloud API) para envio de mensagens de relacionamento, garantindo conformidade total com as políticas do WhatsApp.",
    },
    {
      icon: Lock,
      title: "Criptografia de Ponta a Ponta",
      description: "Todas as mensagens são protegidas pela criptografia nativa do WhatsApp. Seus dados e dos seus leads estão seguros.",
    },
    {
      icon: CheckCircle,
      title: "Conta Business Verificada",
      description: "Integração direta com o Meta Business Suite. Seu número é verificado pela Meta, aumentando a confiança e taxa de entrega.",
    },
    {
      icon: Zap,
      title: "Envios sem Risco de Bloqueio",
      description: "Com a API oficial, seu número comercial não é bloqueado. As mensagens passam pelos servidores da Meta com total segurança.",
    },
  ];

  const trustBadges = [
    { label: "Meta Business Partner", sublabel: "Integração Oficial" },
    { label: "Cloud API v21.0", sublabel: "Versão Mais Recente" },
    { label: "LGPD Compliant", sublabel: "Dados Protegidos" },
    { label: "99.9% Uptime", sublabel: "Alta Disponibilidade" },
  ];

  return (
    <section
      id="official-api"
      className="py-16 md:py-24 relative overflow-hidden w-full"
      ref={ref as React.RefObject<HTMLElement>}
    >
      <div className="container mx-auto px-4 relative z-10 max-w-6xl">
        {/* Header */}
        <div
          className={`text-center mb-12 md:mb-16 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6">
            <Shield size={16} className="text-primary" />
            <span className="text-sm text-muted-foreground">API Oficial & Segurança</span>
          </div>

          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-4 text-foreground">
            Tecnologia oficial e segura
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            A Wiize utiliza a API oficial da Meta para campanhas de relacionamento.
            Sem gambiarras, sem riscos desnecessários.
          </p>
        </div>

        {/* Official Badge Hero */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="glass rounded-2xl p-6 md:p-10 mb-10 md:mb-14 border border-primary/20 relative overflow-hidden"
        >
          {/* Decorative glow */}
          <div className="absolute -top-20 -right-20 w-60 h-60 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-primary/5 rounded-full blur-3xl" />

          <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 md:gap-10">
            {/* Verified Icon area */}
            <div className="flex-shrink-0">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 flex items-center justify-center shadow-lg">
                <Star className="w-10 h-10 md:w-12 md:h-12 text-primary fill-primary/20" />
              </div>
            </div>

            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center gap-2 justify-center md:justify-start mb-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <h3 className="font-display text-xl md:text-2xl font-bold">
                  Integração Verificada com a Meta
                </h3>
              </div>
              <p className="text-muted-foreground mb-4 text-sm md:text-base leading-relaxed max-w-2xl">
                A Wiize é integrada diretamente ao <strong className="text-foreground">WhatsApp Business Platform (Cloud API)</strong> da Meta.
                Isso significa que campanhas de relacionamento são enviadas pela infraestrutura oficial,
                com templates aprovados, rastreamento de entrega e conformidade total com as políticas da plataforma.
              </p>

              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
                  <CheckCircle size={12} />
                  Templates Aprovados
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
                  <CheckCircle size={12} />
                  Rastreamento de Entrega
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
                  <CheckCircle size={12} />
                  Sem Risco de Bloqueio
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
                  <CheckCircle size={12} />
                  Envios Ilimitados
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Features grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-10 md:mb-14">
          {apiFeatures.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="glass rounded-xl p-5 md:p-6 hover:bg-card/90 transition-all duration-300 hover:-translate-y-1 border border-border/50 hover:border-primary/20"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <feature.icon size={22} className="text-primary" />
              </div>
              <h3 className="font-display text-base md:text-lg font-semibold mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Trust Badges */}
        <div
          className={`grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 transition-all duration-700 delay-300 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          {trustBadges.map((badge, index) => (
            <div
              key={index}
              className="glass rounded-xl p-4 text-center border border-border/50 hover:border-primary/20 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <CheckCircle size={16} className="text-primary" />
              </div>
              <p className="font-semibold text-sm text-foreground">{badge.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{badge.sublabel}</p>
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground/60 text-center mt-8 max-w-2xl mx-auto">
          *A API oficial da Meta é utilizada para campanhas de relacionamento (inbound). 
          Campanhas de prospecção ativa utilizam a Evolution API com estratégias de proteção e limites diários inteligentes.
        </p>
      </div>
    </section>
  );
};
