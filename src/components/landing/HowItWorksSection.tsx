import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Search, MessageCircle, TrendingUp, ArrowRight, ChevronRight, Sparkles, Zap, Target } from "lucide-react";

const steps = [
 {
 number: "01",
 icon: Search,
 secondaryIcon: Target,
 title: "Encontre",
 subtitle: "Oportunidades",
 description: "Busque por nicho e localização. Nossa IA analisa empresas e destaca oportunidades com maior potencial de conversão.",
 color: "from-primary to-emerald-500",
 bgColor: "bg-primary/10",
 glowColor: "shadow-primary/20",
 },
 {
 number: "02",
 icon: MessageCircle,
 secondaryIcon: Zap,
 title: "Aborde com",
 subtitle: "Inteligência",
 description: "Gere mensagens personalizadas com IA para cada lead e envie de forma assistida, com contexto e controle.",
 color: "from-primary to-emerald-500",
 bgColor: "bg-primary/10",
 glowColor: "shadow-primary/20",
 },
 {
 number: "03",
 icon: TrendingUp,
 secondaryIcon: Sparkles,
 title: "Converta",
 subtitle: "com IA",
 description: "Nossa IA responde, qualifica e faz follow-up automaticamente, ajudando você a transformar conversas em clientes.",
 color: "from-primary to-emerald-500",
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
 {/* Decorative elements */}
 <div className="absolute top-20 left-10 w-32 h-32 bg-primary/5 rounded-full soft-glow" />
 <div className="absolute bottom-20 right-10 w-40 h-40 bg-primary/5 rounded-full soft-glow" />

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
 <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-4 text-foreground">
 Como Funciona
 </h2>
 <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
 Em apenas 3 passos, transforme sua prospecção e alcance mais clientes
 </p>
 </div>

 {/* Steps - Desktop */}
 <div className="hidden md:block">
 <div className="relative">
 {/* Connection line - positioned at icon center */}
 <div className={`absolute top-[40px] lg:top-[48px] left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-primary/50 via-primary/70 to-primary/50 z-0 transition-all duration-700 delay-500 ${isVisible ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'}`} />
 
 <div className="grid grid-cols-3 gap-6 lg:gap-10 relative z-10">
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
 <div className="flex justify-center mb-4">
 <div className="relative group cursor-pointer">
 {/* Glow effect on hover */}
 <div className={`absolute inset-0 bg-gradient-to-br ${step.color} rounded-2xl soft-glow opacity-0 group-hover:opacity-50 transition-opacity duration-500`} />
 
 {/* Main icon container */}
 <div className={`relative w-16 h-16 lg:w-20 lg:h-20 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:shadow-xl transition-all duration-300`}>
 <step.icon className="w-8 h-8 lg:w-10 lg:h-10 text-white group-hover:animate-pulse" />
 
 {/* Floating secondary icon */}
 <div className={`absolute -top-2 -right-2 w-6 h-6 lg:w-7 lg:h-7 rounded-full bg-background border-2 border-border flex items-center justify-center ${step.bgColor} group-hover:scale-110 transition-transform duration-300`}>
 <step.secondaryIcon className="w-3 h-3 lg:w-4 lg:h-4 text-foreground" />
 </div>
 </div>
 
 {/* Pulse ring on hover */}
 <div className={`absolute inset-0 rounded-2xl border-2 border-current opacity-0 group-hover:opacity-30 group-hover:animate-ping transition-opacity`} style={{ borderColor: 'inherit' }} />
 </div>
 </div>

 {/* Arrow between steps - centered with line */}
 {index < steps.length - 1 && (
 <div className="absolute right-0 top-[32px] lg:top-[40px] translate-x-1/2 z-20 hidden lg:flex items-center justify-center">
 <div className={`w-8 h-8 rounded-full bg-background border-2 border-border flex items-center justify-center shadow-sm transition-all duration-300 ${isVisible ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`} style={{ transitionDelay: `${index * 200 + 400}ms` }}>
 <ChevronRight className="w-4 h-4 text-primary" />
 </div>
 </div>
 )}

 {/* Card */}
 <div className="relative bg-card/95 rounded-2xl p-5 lg:p-6 border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
 {/* Step number badge */}
 <div className="absolute -top-3 left-1/2 -translate-x-1/2">
 <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full bg-gradient-to-br ${step.color} text-white text-xs font-bold shadow-lg`}>
 Passo {step.number}
 </span>
 </div>

 {/* Content */}
 <div className="mt-3 text-center">
 <h3 className="text-lg lg:text-xl font-bold mb-1">{step.title}</h3>
 <p className="text-primary text-sm font-medium mb-2">{step.subtitle}</p>
 <p className="text-muted-foreground text-sm leading-relaxed">
 {step.description}
 </p>
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>

 {/* Steps - Mobile (icons inside cards, centered) */}
 <div className="md:hidden space-y-6 px-2">
 {steps.map((step, index) => (
 <div
 key={step.number}
 className={`relative transition-all duration-700 ${
 isVisible
 ? "opacity-100 translate-y-0"
 : "opacity-0 translate-y-8"
 }`}
 style={{ transitionDelay: `${index * 150 + 200}ms` }}
 >
 {/* Card with icon inside */}
 <div className="relative bg-card/95 rounded-2xl p-5 border border-border/50">
 {/* Step badge - centered */}
 <div className="absolute -top-3 left-1/2 -translate-x-1/2">
 <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full bg-gradient-to-br ${step.color} text-white text-xs font-bold shadow-lg`}>
 Passo {step.number}
 </span>
 </div>

 {/* Icon centered */}
 <div className="flex justify-center mt-3 mb-4">
 <div className="relative">
 <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg`}>
 <step.icon className="w-7 h-7 text-white" />
 </div>
 {/* Secondary icon */}
 <div className={`absolute -top-1 -right-1 w-6 h-6 rounded-full bg-background border border-border flex items-center justify-center ${step.bgColor}`}>
 <step.secondaryIcon className="w-3 h-3 text-foreground" />
 </div>
 </div>
 </div>

 {/* Content - centered */}
 <div className="text-center">
 <h3 className="text-lg font-bold">{step.title}</h3>
 <p className="text-primary text-xs font-medium mb-2">{step.subtitle}</p>
 <p className="text-muted-foreground text-sm leading-relaxed">
 {step.description}
 </p>
 </div>
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
