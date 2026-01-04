import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Search, MessageCircle, TrendingUp, ArrowRight, ChevronRight } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Search,
    title: "Encontre",
    subtitle: "Leads Qualificados",
    description: "Busque por nicho e localização. Nossa IA analisa milhares de empresas e entrega apenas leads com alto potencial.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    number: "02",
    icon: MessageCircle,
    title: "Conecte",
    subtitle: "Via WhatsApp",
    description: "Conecte seu WhatsApp em segundos via QR Code. Configure mensagens personalizadas com variações automáticas.",
    color: "from-green-500 to-emerald-500",
  },
  {
    number: "03",
    icon: TrendingUp,
    title: "Prospecte",
    subtitle: "Em Escala",
    description: "Dispare mensagens em massa com intervalos inteligentes. Acompanhe taxas de entrega e respostas em tempo real.",
    color: "from-primary to-purple-500",
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
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent -translate-y-1/2 z-0" />
            
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
                  {/* Arrow between steps */}
                  {index < steps.length - 1 && (
                    <div className="absolute -right-4 top-1/2 -translate-y-1/2 z-20 hidden lg:flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full bg-background border border-primary/30 flex items-center justify-center">
                        <ChevronRight className="w-4 h-4 text-primary" />
                      </div>
                    </div>
                  )}

                  {/* Card */}
                  <div className="group relative bg-card/50 backdrop-blur-sm rounded-2xl p-6 border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 h-full">
                    {/* Step number badge */}
                    <div className="absolute -top-3 left-6">
                      <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${step.color} text-white text-sm font-bold shadow-lg`}>
                        {step.number}
                      </span>
                    </div>

                    {/* Icon */}
                    <div className="mt-6 mb-4">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${step.color} bg-opacity-10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                        <step.icon className="w-7 h-7 text-white" />
                      </div>
                    </div>

                    {/* Content */}
                    <h3 className="text-xl font-bold mb-1">{step.title}</h3>
                    <p className="text-primary text-sm font-medium mb-3">{step.subtitle}</p>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Steps - Mobile */}
        <div className="md:hidden space-y-4">
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
              {/* Vertical connector */}
              {index < steps.length - 1 && (
                <div className="absolute left-7 top-full h-4 w-0.5 bg-gradient-to-b from-primary/40 to-transparent z-0" />
              )}

              <div className="flex gap-4 items-start">
                {/* Step indicator */}
                <div className="flex-shrink-0 relative">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg`}>
                    <step.icon className="w-7 h-7 text-white" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-background border-2 border-primary flex items-center justify-center text-xs font-bold text-primary">
                    {index + 1}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 bg-card/50 backdrop-blur-sm rounded-xl p-4 border border-border/50">
                  <h3 className="text-lg font-bold">{step.title}</h3>
                  <p className="text-primary text-xs font-medium mb-2">{step.subtitle}</p>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>

              {/* Arrow down for mobile */}
              {index < steps.length - 1 && (
                <div className="flex justify-center py-2">
                  <ArrowRight className="w-5 h-5 text-primary/50 rotate-90" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
