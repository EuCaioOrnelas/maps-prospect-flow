import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Search, MessageCircle, TrendingUp, ArrowRight, ChevronRight, Sparkles, Zap, Target } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Search,
    secondaryIcon: Target,
    title: "Encontre",
    subtitle: "Leads Qualificados",
    description: "Busque por nicho e localização. Nossa IA analisa milhares de empresas e entrega apenas leads com alto potencial.",
    color: "from-blue-500 to-cyan-500",
    bgColor: "bg-blue-500/10",
    glowColor: "shadow-blue-500/20",
  },
  {
    number: "02",
    icon: MessageCircle,
    secondaryIcon: Zap,
    title: "Conecte",
    subtitle: "Via WhatsApp",
    description: "Conecte seu WhatsApp em segundos via QR Code. Configure mensagens personalizadas com variações automáticas.",
    color: "from-green-500 to-emerald-500",
    bgColor: "bg-green-500/10",
    glowColor: "shadow-green-500/20",
  },
  {
    number: "03",
    icon: TrendingUp,
    secondaryIcon: Sparkles,
    title: "Prospecte",
    subtitle: "Em Escala",
    description: "Dispare mensagens em massa com intervalos inteligentes. Acompanhe taxas de entrega e respostas em tempo real.",
    color: "from-primary to-purple-500",
    bgColor: "bg-primary/10",
    glowColor: "shadow-primary/20",
  },
];

export const HowItWorksSection = () => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      id="how-it-works"
      className="py-20 sm:py-28 relative overflow-hidden"
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-secondary/30 to-background" />
      
      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10 max-w-6xl">
        {/* Section header */}
        <div
          className={`text-center mb-16 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20 mb-4">
            Simples e Eficiente
          </span>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            Como <span className="text-gradient">Funciona</span>
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
            Em apenas 3 passos, transforme sua prospecção e alcance mais clientes
          </p>
        </div>

        {/* Steps - Desktop */}
        <div className="hidden md:block">
          <div className="relative">
            {/* Connection line */}
            <div className="absolute top-24 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-blue-500/50 via-green-500/50 to-primary/50 z-0" />
            
            <div className="grid grid-cols-3 gap-8 relative z-10">
              {steps.map((step, index) => (
                <div
                  key={step.number}
                  className={`relative transition-all duration-700 ${
                    isVisible
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-12"
                  }`}
                  style={{ transitionDelay: `${index * 200 + 200}ms` }}
                >
                  {/* Animated Icon Container - Outside card */}
                  <div className="flex justify-center mb-6">
                    <div className="relative group">
                      {/* Glow effect */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${step.color} rounded-2xl blur-xl opacity-40 group-hover:opacity-60 transition-opacity duration-500`} />
                      
                      {/* Main icon container */}
                      <div className={`relative w-20 h-20 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg ${step.glowColor} group-hover:scale-110 transition-all duration-500`}>
                        <step.icon className="w-10 h-10 text-white animate-pulse" style={{ animationDuration: '3s' }} />
                        
                        {/* Floating secondary icon */}
                        <div className={`absolute -top-2 -right-2 w-8 h-8 rounded-full bg-background border-2 border-current flex items-center justify-center ${step.bgColor} animate-bounce`} style={{ animationDuration: '2s', animationDelay: `${index * 0.3}s` }}>
                          <step.secondaryIcon className="w-4 h-4 text-foreground" />
                        </div>
                      </div>

                      {/* Orbiting dots */}
                      <div className="absolute inset-0 animate-spin" style={{ animationDuration: '8s' }}>
                        <div className={`absolute -top-1 left-1/2 w-2 h-2 rounded-full bg-gradient-to-br ${step.color}`} />
                      </div>
                      <div className="absolute inset-0 animate-spin" style={{ animationDuration: '12s', animationDirection: 'reverse' }}>
                        <div className={`absolute top-1/2 -right-1 w-1.5 h-1.5 rounded-full bg-gradient-to-br ${step.color} opacity-60`} />
                      </div>
                    </div>
                  </div>

                  {/* Arrow between steps */}
                  {index < steps.length - 1 && (
                    <div className="absolute right-0 top-12 translate-x-1/2 z-20 hidden lg:flex items-center justify-center">
                      <div className={`w-10 h-10 rounded-full bg-background border-2 border-border flex items-center justify-center shadow-md transition-all duration-300 ${isVisible ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`} style={{ transitionDelay: `${index * 200 + 400}ms` }}>
                        <ChevronRight className="w-5 h-5 text-primary animate-pulse" />
                      </div>
                    </div>
                  )}

                  {/* Card */}
                  <div className="group/card relative bg-card/50 backdrop-blur-sm rounded-2xl p-6 border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 h-full">
                    {/* Step number badge */}
                    <div className="absolute -top-3 left-6">
                      <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full bg-gradient-to-br ${step.color} text-white text-xs font-bold shadow-lg`}>
                        Passo {step.number}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="mt-4">
                      <h3 className="text-xl font-bold mb-1">{step.title}</h3>
                      <p className="text-primary text-sm font-medium mb-3">{step.subtitle}</p>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {step.description}
                      </p>
                    </div>

                    {/* Decorative corner */}
                    <div className={`absolute bottom-0 right-0 w-16 h-16 bg-gradient-to-tl ${step.color} opacity-5 rounded-tl-3xl rounded-br-2xl`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Steps - Mobile (icons inside cards) */}
        <div className="md:hidden space-y-6">
          {steps.map((step, index) => (
            <div
              key={step.number}
              className={`relative transition-all duration-700 ${
                isVisible
                  ? "opacity-100 translate-x-0"
                  : "opacity-0 -translate-x-8"
              }`}
              style={{ transitionDelay: `${index * 150 + 200}ms` }}
            >
              {/* Card with icon inside */}
              <div className="relative bg-card/50 backdrop-blur-sm rounded-2xl p-5 border border-border/50">
                {/* Step badge */}
                <div className="absolute -top-3 left-4">
                  <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full bg-gradient-to-br ${step.color} text-white text-xs font-bold shadow-lg`}>
                    Passo {step.number}
                  </span>
                </div>

                <div className="flex gap-4 items-start mt-3">
                  {/* Icon inside card */}
                  <div className="flex-shrink-0 relative">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg`}>
                      <step.icon className="w-7 h-7 text-white" />
                    </div>
                    {/* Secondary icon */}
                    <div className={`absolute -top-1 -right-1 w-6 h-6 rounded-full bg-background border border-border flex items-center justify-center ${step.bgColor}`}>
                      <step.secondaryIcon className="w-3 h-3 text-foreground" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold">{step.title}</h3>
                    <p className="text-primary text-xs font-medium mb-2">{step.subtitle}</p>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>

                {/* Decorative corner */}
                <div className={`absolute bottom-0 right-0 w-12 h-12 bg-gradient-to-tl ${step.color} opacity-5 rounded-tl-2xl rounded-br-2xl`} />
              </div>

              {/* Arrow down for mobile */}
              {index < steps.length - 1 && (
                <div className="flex justify-center py-3">
                  <div className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center">
                    <ArrowRight className="w-4 h-4 text-primary rotate-90" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
