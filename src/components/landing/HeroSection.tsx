import { useEffect, useState, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Search, Download, Zap, MapPin, Brain, Target, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

export const HeroSection = () => {
  const [scrollY, setScrollY] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrollY(window.scrollY);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const parallaxOffset = scrollY * 0.3;
  const imageScale = 1 + Math.min(scrollY * 0.0002, 0.05);
  const imageOpacity = Math.max(1 - scrollY * 0.001, 0.7);

  // Pontos de brilho pequenos e sutis
  const glowDots = useMemo(() => [
    { left: '10%', top: '30%', delay: 0 },
    { left: '88%', top: '25%', delay: 1.2 },
    { left: '18%', top: '70%', delay: 0.6 },
    { left: '82%', top: '65%', delay: 1.8 },
  ], []);

  return (
    <section 
      ref={sectionRef}
      className="relative min-h-screen flex items-center justify-center pt-16 pb-24 overflow-hidden"
    >
      {/* Parallax Background effects */}
      <div 
        className="absolute inset-0 bg-gradient-hero will-change-transform"
        style={{ transform: `translateY(${parallaxOffset * 0.5}px)` }}
      />
      
      {/* Main glow */}
      <div 
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] md:w-[800px] h-[600px] md:h-[800px] bg-gradient-glow opacity-50 will-change-transform"
        style={{ transform: `translate(-50%, ${parallaxOffset * 0.3}px)` }}
      />
      
      {/* Small glow dots - pontos pequenos com float */}
      {glowDots.map((dot, i) => (
        <div
          key={i}
          className="absolute w-1.5 h-1.5 rounded-full bg-primary/50 pointer-events-none animate-float"
          style={{
            left: dot.left,
            top: dot.top,
            animationDelay: `${dot.delay}s`,
            animationDuration: `${4 + i}s`,
            boxShadow: '0 0 8px 2px hsl(var(--primary) / 0.4)',
          }}
        />
      ))}
      
      {/* Corner accents */}
      <div 
        className="absolute top-20 right-10 md:right-20 w-2 h-2 bg-primary rounded-full animate-pulse-glow will-change-transform" 
        style={{ transform: `translateY(${parallaxOffset * 0.2}px)` }}
      />
      <div 
        className="absolute bottom-40 left-10 md:left-20 w-3 h-3 bg-primary/50 rounded-full animate-pulse-glow will-change-transform" 
        style={{ animationDelay: "0.5s", transform: `translateY(${parallaxOffset * 0.15}px)` }} 
      />
      
      <div className="container mx-auto px-4 relative z-10 max-w-6xl">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full glass mb-6 sm:mb-8 animate-fade-in">
            <Brain size={16} className="text-primary flex-shrink-0" />
            <span className="text-xs sm:text-sm text-muted-foreground">
              IA que identifica leads com maior potencial de conversão
            </span>
          </div>

          {/* Main heading */}
          <h1 className="font-display text-3xl sm:text-5xl md:text-7xl font-bold mb-4 sm:mb-6 animate-slide-up px-2" style={{ animationDelay: "0.1s" }}>
            Prospecção{" "}
            <span className="text-gradient">Inteligente</span>
            {" "}com IA
          </h1>

          {/* Subheading */}
          <p className="text-base sm:text-xl md:text-2xl text-muted-foreground mb-4 sm:mb-6 max-w-2xl mx-auto animate-slide-up px-2" style={{ animationDelay: "0.2s" }}>
            Nossa IA analisa milhares de empresas e entrega apenas os leads estratégicos:
            empresas ativas, com contatos verificados e alto potencial de conversão.
          </p>

          {/* AI Value Proposition */}
          <div className="glass rounded-xl px-4 sm:px-6 py-3 sm:py-4 mb-8 sm:mb-10 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: "0.25s" }}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 md:gap-8 text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <Target size={16} className="text-primary flex-shrink-0" />
                <span>Leads pré-qualificados</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-primary flex-shrink-0" />
                <span>Maior taxa de conversão</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-primary flex-shrink-0" />
                <span>Até 50 leads por busca</span>
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-12 sm:mb-16 animate-slide-up px-4" style={{ animationDelay: "0.3s" }}>
            <Link to="/signup" className="w-full sm:w-auto">
              <Button variant="hero" size="xl" className="group w-full sm:w-auto">
                Começar com 10 buscas grátis
                <ArrowRight className="group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <a href="#features" className="w-full sm:w-auto">
              <Button variant="hero-outline" size="xl" className="w-full sm:w-auto">
                Ver como funciona
              </Button>
            </a>
          </div>

          {/* Feature highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 max-w-3xl mx-auto animate-slide-up px-2" style={{ animationDelay: "0.4s" }}>
            <div className="flex items-center justify-center gap-3 text-muted-foreground text-sm sm:text-base">
              <Search size={18} className="text-primary flex-shrink-0" />
              <span>Busca por palavra-chave</span>
            </div>
            <div className="flex items-center justify-center gap-3 text-muted-foreground text-sm sm:text-base">
              <MapPin size={18} className="text-primary flex-shrink-0" />
              <span>Filtro por cidade/região</span>
            </div>
            <div className="flex items-center justify-center gap-3 text-muted-foreground text-sm sm:text-base">
              <Download size={18} className="text-primary flex-shrink-0" />
              <span>Download em planilha</span>
            </div>
          </div>
        </div>

        {/* Dashboard preview with parallax */}
        <div 
          className="mt-12 sm:mt-20 max-w-6xl mx-auto animate-slide-up will-change-transform px-2" 
          style={{ 
            animationDelay: "0.5s",
            transform: `translateY(${-parallaxOffset * 0.1}px) scale(${imageScale})`,
            opacity: imageOpacity
          }}
        >
          <div className="relative">
            <div 
              className="absolute -inset-4 bg-primary/10 blur-3xl rounded-3xl will-change-transform"
              style={{ transform: `scale(${1 + scrollY * 0.0001})` }}
            />
            <div className="relative glass rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-card hover:shadow-glow transition-shadow duration-500">
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-destructive/60" />
                <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-warning/60" />
                <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-success/60" />
              </div>
              <div className="bg-background/50 rounded-lg sm:rounded-xl p-4 sm:p-6">
                <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <div className="flex-1 bg-secondary rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-muted-foreground text-sm sm:text-base">
                      🔍 restaurantes italianos
                    </div>
                    <div className="flex-1 bg-secondary rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-muted-foreground text-sm sm:text-base">
                      📍 São Paulo, SP
                    </div>
                  </div>
                  <div className="bg-primary text-primary-foreground rounded-lg px-4 sm:px-6 py-2 sm:py-3 font-medium text-center text-sm sm:text-base">
                    Buscar Leads
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-secondary/50 rounded-lg p-3 sm:p-4">
                      <div className="h-2 sm:h-3 bg-muted rounded w-3/4 mb-2" />
                      <div className="h-1.5 sm:h-2 bg-muted/50 rounded w-1/2" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
