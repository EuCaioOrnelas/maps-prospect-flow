import { useState, useEffect, useCallback } from "react";
import { Search, MapPin, Download, Zap, Shield, Brain, Target, TrendingUp, CheckCircle, MessageSquare, BarChart3, Bot, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: Brain,
    title: "Curadoria com IA",
    description: "Nossa inteligência artificial analisa milhares de resultados do Google Maps e filtra automaticamente empresas inativas, números inválidos e contatos desatualizados. O resultado? Apenas empresas com atividade recente, avaliações positivas e alto potencial de conversão chegam até você.",
    highlight: "IA avançada filtra leads ruins automaticamente",
  },
  {
    icon: Target,
    title: "Leads Estratégicos e Geolocalizados",
    description: "Cada lead é selecionado criteriosamente por localização geográfica, atividade recente no Google e contatos verificados. Filtre por cidade, bairro ou região específica e encontre exatamente os clientes que estão na sua área de atuação — sem perder tempo com leads distantes ou irrelevantes.",
    highlight: "Busca por cidade, bairro ou região específica",
  },
  {
    icon: Sparkles,
    title: "Mensagens Personalizadas com IA",
    description: "O Wiize analisa cada lead prospectado — nome da empresa, categoria, localização e contexto — e gera automaticamente uma mensagem única e personalizada com inteligência artificial. Cada abordagem é diferente, relevante e pensada para maximizar a taxa de resposta e conversão.",
    badge: "Novo",
    highlight: "IA gera mensagens únicas para cada lead",
  },
  {
    icon: Bot,
    title: "Agente de IA no WhatsApp",
    description: "Um vendedor virtual que trabalha 24 horas por dia, 7 dias por semana. Ele responde mensagens automaticamente, qualifica leads com perguntas inteligentes e organiza tudo no CRM. Sem prompts complexos — configure em poucos minutos e deixe a IA cuidar do operacional enquanto você foca em fechar negócios.",
    badge: "Beta",
    highlight: "Atendimento automático 24 horas por dia",
  },
  {
    icon: Download,
    title: "Até 60 Leads por Busca",
    description: "Cada busca estratégica retorna até 60 leads qualificados com nome da empresa, telefone, endereço, categoria e link do Google Maps. Todos prontos para download em planilha Excel, facilitando a organização e o início imediato da sua prospecção.",
    highlight: "Export direto para Excel em um clique",
  },
  {
    icon: BarChart3,
    title: "Relatórios Inteligentes",
    description: "Acompanhe em tempo real as métricas das suas campanhas: taxa de entrega, respostas recebidas, performance por número e evolução diária. Dashboards visuais completos que mostram exatamente o que está funcionando e onde otimizar sua estratégia de prospecção.",
    badge: "Novo",
    highlight: "Dashboards visuais em tempo real",
  },
  {
    icon: TrendingUp,
    title: "Maior Taxa de Conversão",
    description: "Leads curados por inteligência artificial significam menos tempo desperdiçado com contatos frios e mais oportunidades reais de negócio. Nossos usuários reportam taxas de resposta significativamente maiores comparado a listas genéricas de prospecção.",
    highlight: "Foco em qualidade, não quantidade",
  },
];

export const FeaturesSection = () => {
  const { ref, isVisible } = useScrollAnimation();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const next = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % features.length);
  }, []);

  const prev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + features.length) % features.length);
  }, []);

  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(next, 5000);
    return () => clearInterval(interval);
  }, [isAutoPlaying, next]);

  const handleManualNav = (index: number) => {
    setActiveIndex(index);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const activeFeature = features[activeIndex];

  return (
    <section
      id="features"
      className="py-16 md:py-24 relative overflow-hidden w-full"
      ref={ref as React.RefObject<HTMLElement>}
    >
      <div className="absolute inset-0 bg-gradient-glow opacity-30" />

      <div className="container mx-auto px-4 relative z-10 max-w-6xl">
        {/* Header */}
        <div
          className={`text-center mb-8 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full glass mb-4 sm:mb-6">
            <Brain size={16} className="text-primary" />
            <span className="text-xs sm:text-sm text-muted-foreground">Tecnologia de Prospecção Inteligente</span>
          </div>
           <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-4 px-2 text-foreground">
             Tudo que você precisa para vender mais
           </h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto px-4">
            Prospecção inteligente, automação de mensagens e IA que qualifica seus leads.
            Uma plataforma completa para transformar contatos em clientes.
          </p>
        </div>

        {/* AI Value Block */}
        <div
          className={`glass rounded-xl sm:rounded-2xl p-5 sm:p-8 mb-10 sm:mb-14 transition-all duration-700 delay-150 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="flex flex-col sm:flex-row items-start gap-4 mb-4 sm:mb-6">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/20">
              <Zap size={20} className="text-white" />
            </div>
            <div>
               <h3 className="font-display text-lg sm:text-xl font-semibold mb-2 text-foreground">
                 Menos leads, mais resultados
               </h3>
              <p className="text-muted-foreground text-sm sm:text-base">
                Em vez de entregar centenas de contatos desatualizados, o Wiize entrega até 60 leads
                estrategicamente selecionados por busca. Empresas com atividade recente,
                avaliações positivas e informações de contato verificadas.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="flex items-center gap-3 rounded-lg p-3 sm:p-4 bg-gradient-to-r from-primary/10 to-emerald-500/5 border border-primary/15">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center flex-shrink-0">
                <CheckCircle size={16} className="text-white" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-foreground">Empresas com atividade recente</span>
            </div>
            <div className="flex items-center gap-3 rounded-lg p-3 sm:p-4 bg-gradient-to-r from-primary/10 to-emerald-500/5 border border-primary/15">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center flex-shrink-0">
                <CheckCircle size={16} className="text-white" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-foreground">Contatos ativos e verificados</span>
            </div>
            <div className="flex items-center gap-3 rounded-lg p-3 sm:p-4 bg-gradient-to-r from-primary/10 to-emerald-500/5 border border-primary/15">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center flex-shrink-0">
                <CheckCircle size={16} className="text-white" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-foreground">Alto potencial de conversão</span>
            </div>
          </div>
        </div>

        {/* Carousel */}
        <div
          className={`transition-all duration-700 delay-200 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div
            className="glass rounded-2xl border border-border/50 overflow-hidden"
            onMouseEnter={() => setIsAutoPlaying(false)}
            onMouseLeave={() => setIsAutoPlaying(true)}
          >
            <div className="relative p-5 sm:p-8 lg:p-10 min-h-[340px] sm:min-h-[360px] flex flex-col items-center justify-center text-center">
              {activeFeature.badge && (
                <span className="absolute top-4 right-4 sm:top-6 sm:right-6 px-2.5 py-1 text-xs font-semibold bg-primary text-primary-foreground rounded-full z-10">
                  {activeFeature.badge}
                </span>
              )}

              <div
                key={activeIndex}
                className="animate-in fade-in slide-in-from-right-4 duration-500 flex flex-col items-center"
              >
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center mb-5 shadow-lg shadow-primary/20">
                  <activeFeature.icon size={28} className="text-white" />
                </div>

                <h3 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold mb-3 text-foreground">
                  {activeFeature.title}
                </h3>

                <p className="text-muted-foreground text-sm sm:text-base leading-relaxed mb-5 max-w-2xl">
                  {activeFeature.description}
                </p>

                <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary/5 border border-primary/10">
                  <CheckCircle size={16} className="text-primary flex-shrink-0" />
                  <span className="text-sm font-medium text-foreground">{activeFeature.highlight}</span>
                </div>
              </div>
            </div>

            {/* Navigation: arrows + dots */}
            <div className="flex items-center justify-center gap-3 pb-5 px-5">
              <button
                onClick={() => { prev(); setIsAutoPlaying(false); setTimeout(() => setIsAutoPlaying(true), 10000); }}
                className="w-9 h-9 rounded-full border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 hover:border-primary/30 transition-all shrink-0"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="flex items-center gap-1.5">
                {features.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => handleManualNav(index)}
                    className={cn(
                      "rounded-full transition-all duration-300",
                      index === activeIndex
                        ? "w-6 h-2 bg-primary"
                        : "w-2 h-2 bg-muted-foreground/25 hover:bg-primary/40"
                    )}
                  />
                ))}
              </div>

              <button
                onClick={() => { next(); setIsAutoPlaying(false); setTimeout(() => setIsAutoPlaying(true), 10000); }}
                className="w-9 h-9 rounded-full border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 hover:border-primary/30 transition-all shrink-0"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
