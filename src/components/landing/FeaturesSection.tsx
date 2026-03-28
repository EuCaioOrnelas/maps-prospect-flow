import { useState, useEffect, useCallback } from "react";
import { Search, MapPin, Download, Zap, Shield, Brain, Target, TrendingUp, CheckCircle, MessageSquare, BarChart3, Flame, Bot, ChevronLeft, ChevronRight } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: Brain,
    title: "Curadoria com IA",
    description: "Nossa inteligência artificial analisa e filtra resultados para entregar apenas empresas ativas com maior potencial de conversão.",
    highlight: "IA avançada filtra leads ruins automaticamente",
  },
  {
    icon: Target,
    title: "Leads Estratégicos e Geolocalizados",
    description: "Cada lead é selecionado por localização, atividade recente e contatos verificados. Filtre por cidade, bairro ou região.",
    highlight: "Busca por cidade, bairro ou região específica",
  },
  {
    icon: Bot,
    title: "Agente de IA no WhatsApp",
    description: "Um vendedor virtual que responde, qualifica e organiza seus leads 24h. Configure em minutos e ele cuida do operacional.",
    badge: "Beta",
    highlight: "Atendimento automático 24 horas por dia",
  },
  {
    icon: Download,
    title: "Até 50 Leads por Busca",
    description: "Cada busca estratégica retorna até 50 leads qualificados, prontos para download em planilha Excel.",
    highlight: "Export direto para Excel em um clique",
  },
  {
    icon: MessageSquare,
    title: "Disparos em Massa via WhatsApp",
    description: "Envie mensagens automatizadas para seus leads com limite de 200 disparos/dia. Sistema de janelas inteligente com API oficial.",
    badge: "Novo",
    highlight: "200 disparos/dia com intervalos inteligentes",
  },
  {
    icon: BarChart3,
    title: "Relatórios Inteligentes",
    description: "Acompanhe métricas de campanhas, taxa de conversão e performance dos leads com dashboards visuais completos.",
    badge: "Novo",
    highlight: "Dashboards visuais em tempo real",
  },
  {
    icon: Flame,
    title: "Aquecimento de Chips",
    description: "Prepare números novos para uso comercial em 20 dias. Simula uso natural do WhatsApp com mensagens automáticas para evitar bloqueios.",
    badge: "Novo",
    highlight: "20 dias para chip pronto para campanhas",
  },
  {
    icon: TrendingUp,
    title: "Maior Taxa de Conversão",
    description: "Leads curados significam menos tempo desperdiçado e mais oportunidades reais de negócio fechado.",
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
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-4 px-2">
            Tudo que você precisa para{" "}
            <span className="text-gradient">vender mais</span>
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
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Zap size={20} className="text-primary" />
            </div>
            <div>
              <h3 className="font-display text-lg sm:text-xl font-semibold mb-2">
                Menos leads, mais resultados
              </h3>
              <p className="text-muted-foreground text-sm sm:text-base">
                Em vez de entregar centenas de contatos desatualizados, o Wiize entrega até 50 leads
                estrategicamente selecionados por busca. Empresas com atividade recente,
                avaliações positivas e informações de contato verificadas.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="flex items-center gap-3 bg-primary/5 rounded-lg p-3 sm:p-4">
              <CheckCircle size={18} className="text-primary flex-shrink-0" />
              <span className="text-xs sm:text-sm">Empresas com atividade recente</span>
            </div>
            <div className="flex items-center gap-3 bg-primary/5 rounded-lg p-3 sm:p-4">
              <CheckCircle size={18} className="text-primary flex-shrink-0" />
              <span className="text-xs sm:text-sm">Contatos ativos e verificados</span>
            </div>
            <div className="flex items-center gap-3 bg-primary/5 rounded-lg p-3 sm:p-4">
              <CheckCircle size={18} className="text-primary flex-shrink-0" />
              <span className="text-xs sm:text-sm">Alto potencial de conversão</span>
            </div>
          </div>
        </div>

        {/* Carousel */}
        <div
          className={`transition-all duration-700 delay-200 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          {/* Main feature display */}
          <div className="glass rounded-2xl border border-border/50 overflow-hidden mb-6">
            <div className="flex flex-col lg:flex-row">
              {/* Left: Feature showcase */}
              <div className="flex-1 p-6 sm:p-8 lg:p-10 flex flex-col justify-center min-h-[280px] relative">
                {/* Badge */}
                {activeFeature.badge && (
                  <span className="absolute top-4 right-4 sm:top-6 sm:right-6 px-2.5 py-1 text-xs font-semibold bg-primary text-primary-foreground rounded-full">
                    {activeFeature.badge}
                  </span>
                )}

                <div
                  key={activeIndex}
                  className="animate-in fade-in slide-in-from-right-4 duration-500"
                >
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center mb-5 shadow-lg shadow-primary/20">
                    <activeFeature.icon size={28} className="text-white" />
                  </div>

                  <h3 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold mb-3">
                    {activeFeature.title}
                  </h3>

                  <p className="text-muted-foreground text-sm sm:text-base leading-relaxed mb-5 max-w-lg">
                    {activeFeature.description}
                  </p>

                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/5 border border-primary/10">
                    <CheckCircle size={16} className="text-primary flex-shrink-0" />
                    <span className="text-sm font-medium text-foreground">{activeFeature.highlight}</span>
                  </div>
                </div>
              </div>

              {/* Right: Navigation thumbnails (desktop) */}
              <div className="hidden lg:flex flex-col w-72 border-l border-border/50 bg-muted/20">
                <div className="p-3 overflow-y-auto max-h-[400px] space-y-1 scrollbar-none">
                  {features.map((feature, index) => (
                    <button
                      key={index}
                      onClick={() => handleManualNav(index)}
                      className={cn(
                        "w-full flex items-center gap-3 rounded-xl p-3 text-left transition-all duration-300",
                        index === activeIndex
                          ? "bg-primary/10 border border-primary/20 shadow-sm"
                          : "hover:bg-muted/50 border border-transparent"
                      )}
                    >
                      <div
                        className={cn(
                          "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                          index === activeIndex ? "bg-primary/20" : "bg-muted/50"
                        )}
                      >
                        <feature.icon
                          size={16}
                          className={cn(
                            "transition-colors",
                            index === activeIndex ? "text-primary" : "text-muted-foreground"
                          )}
                        />
                      </div>
                      <div className="min-w-0">
                        <p
                          className={cn(
                            "text-sm font-medium truncate transition-colors",
                            index === activeIndex ? "text-foreground" : "text-muted-foreground"
                          )}
                        >
                          {feature.title}
                        </p>
                        {feature.badge && (
                          <span className="text-[10px] font-semibold text-primary">{feature.badge}</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom controls */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-border/50 bg-muted/10">
              <div className="flex items-center gap-1">
                {features.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => handleManualNav(index)}
                    className={cn(
                      "transition-all duration-300 rounded-full",
                      index === activeIndex
                        ? "w-6 h-2 bg-primary"
                        : "w-2 h-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                    )}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground mr-2 hidden sm:inline">
                  {activeIndex + 1} / {features.length}
                </span>
                <button
                  onClick={() => { prev(); setIsAutoPlaying(false); setTimeout(() => setIsAutoPlaying(true), 10000); }}
                  className="w-9 h-9 rounded-lg border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={() => { next(); setIsAutoPlaying(false); setTimeout(() => setIsAutoPlaying(true), 10000); }}
                  className="w-9 h-9 rounded-lg border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
