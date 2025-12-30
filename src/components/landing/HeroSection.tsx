import { Button } from "@/components/ui/button";
import { ArrowRight, Search, Download, Zap, MapPin, Brain, Target, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

export const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-hero" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-glow opacity-50" />
      <div className="absolute top-20 right-20 w-2 h-2 bg-primary rounded-full animate-pulse-glow" />
      <div className="absolute bottom-40 left-20 w-3 h-3 bg-primary/50 rounded-full animate-pulse-glow" style={{ animationDelay: "0.5s" }} />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8 animate-fade-in">
            <Brain size={16} className="text-primary" />
            <span className="text-sm text-muted-foreground">
              IA que identifica leads com maior potencial de conversão
            </span>
          </div>

          {/* Main heading */}
          <h1 className="font-display text-5xl md:text-7xl font-bold mb-6 animate-slide-up" style={{ animationDelay: "0.1s" }}>
            Prospecção{" "}
            <span className="text-gradient">Inteligente</span>
            {" "}com IA
          </h1>

          {/* Subheading */}
          <p className="text-xl md:text-2xl text-muted-foreground mb-6 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: "0.2s" }}>
            Nossa IA analisa milhares de empresas e entrega apenas os leads estratégicos:
            empresas ativas, com contatos verificados e alto potencial de conversão.
          </p>

          {/* AI Value Proposition */}
          <div className="glass rounded-xl px-6 py-4 mb-10 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: "0.25s" }}>
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 text-sm">
              <div className="flex items-center gap-2">
                <Target size={18} className="text-primary" />
                <span>Leads pré-qualificados</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp size={18} className="text-primary" />
                <span>Maior taxa de conversão</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap size={18} className="text-primary" />
                <span>Até 50 leads por busca</span>
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-slide-up" style={{ animationDelay: "0.3s" }}>
            <Link to="/signup">
              <Button variant="hero" size="xl" className="group">
                Começar com 10 buscas grátis
                <ArrowRight className="group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <a href="#features">
              <Button variant="hero-outline" size="xl">
                Ver como funciona
              </Button>
            </a>
          </div>

          {/* Feature highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto animate-slide-up" style={{ animationDelay: "0.4s" }}>
            <div className="flex items-center justify-center gap-3 text-muted-foreground">
              <Search size={20} className="text-primary" />
              <span>Busca por palavra-chave</span>
            </div>
            <div className="flex items-center justify-center gap-3 text-muted-foreground">
              <MapPin size={20} className="text-primary" />
              <span>Filtro por cidade/região</span>
            </div>
            <div className="flex items-center justify-center gap-3 text-muted-foreground">
              <Download size={20} className="text-primary" />
              <span>Download em planilha</span>
            </div>
          </div>
        </div>

        {/* Dashboard preview */}
        <div className="mt-20 mb-24 max-w-5xl mx-auto animate-slide-up" style={{ animationDelay: "0.5s" }}>
          <div className="relative">
            <div className="absolute -inset-4 bg-primary/10 blur-3xl rounded-3xl" />
            <div className="relative glass rounded-2xl p-6 shadow-card">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-destructive/60" />
                <div className="w-3 h-3 rounded-full bg-warning/60" />
                <div className="w-3 h-3 rounded-full bg-success/60" />
              </div>
              <div className="bg-background/50 rounded-xl p-6">
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="flex-1 bg-secondary rounded-lg px-4 py-3 text-muted-foreground">
                    🔍 restaurantes italianos
                  </div>
                  <div className="flex-1 bg-secondary rounded-lg px-4 py-3 text-muted-foreground">
                    📍 São Paulo, SP
                  </div>
                  <div className="bg-primary text-primary-foreground rounded-lg px-6 py-3 font-medium">
                    Buscar Leads
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-secondary/50 rounded-lg p-4">
                      <div className="h-3 bg-muted rounded w-3/4 mb-2" />
                      <div className="h-2 bg-muted/50 rounded w-1/2" />
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
