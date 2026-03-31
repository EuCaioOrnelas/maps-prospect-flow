import { useEffect, useState, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Search, Download, Zap, MapPin, Brain, Target, TrendingUp, MessageCircle, Users, Send } from "lucide-react";
import { Link } from "react-router-dom";

// Animated counter component
const AnimatedCounter = ({ value, duration = 2000 }: { value: string; duration?: number }) => {
  const [displayValue, setDisplayValue] = useState("0");
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          
          // Parse the target value
          const isPercentage = value.includes('%');
          const isPlus = value.startsWith('+');
          const hasK = value.includes('K');
          const hasM = value.includes('M');
          
          let numericValue = parseFloat(value.replace(/[^0-9.]/g, ''));
          
          const startTime = performance.now();
          
          const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const currentValue = numericValue * easeOutQuart;
            
            let formatted: string;
            if (hasM) {
              formatted = currentValue.toFixed(1) + 'M+';
            } else if (hasK) {
              formatted = Math.floor(currentValue) + 'K+';
            } else if (isPercentage) {
              formatted = (isPlus ? '+' : '') + Math.floor(currentValue) + '%';
            } else {
              formatted = (isPlus ? '+' : '') + Math.floor(currentValue).toString();
            }
            
            setDisplayValue(formatted);
            
            if (progress < 1) {
              requestAnimationFrame(animate);
            } else {
              setDisplayValue(value);
            }
          };
          
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [value, duration]);

  return <span ref={ref}>{displayValue}</span>;
};

// Data for synchronized demo animation
const demoData = [
  {
    searchTerm: "restaurantes italianos",
    location: "São Paulo, SP",
    leads: [
      { emoji: "🍝", name: "Trattoria Bella Italia", phone: "(11) 99XXX-XXXX", rating: "4.8" },
      { emoji: "🍕", name: "Cantina do Nonno", phone: "(11) 98XXX-XXXX", rating: "4.6" },
      { emoji: "🍷", name: "Ristorante Milano", phone: "(11) 97XXX-XXXX", rating: "4.9" },
    ]
  },
  {
    searchTerm: "clínicas odontológicas",
    location: "Rio de Janeiro, RJ",
    leads: [
      { emoji: "🦷", name: "OdontoLife Centro", phone: "(21) 99XXX-XXXX", rating: "4.9" },
      { emoji: "😁", name: "Sorriso Perfeito", phone: "(21) 98XXX-XXXX", rating: "4.7" },
      { emoji: "🏥", name: "Clínica Dental Prime", phone: "(21) 97XXX-XXXX", rating: "4.8" },
    ]
  },
  {
    searchTerm: "academias crossfit",
    location: "Belo Horizonte, MG",
    leads: [
      { emoji: "🏋️", name: "CrossFit Box BH", phone: "(31) 99XXX-XXXX", rating: "4.9" },
      { emoji: "💪", name: "Arena Fit Training", phone: "(31) 98XXX-XXXX", rating: "4.7" },
      { emoji: "🔥", name: "Power CrossFit", phone: "(31) 97XXX-XXXX", rating: "4.8" },
    ]
  },
  {
    searchTerm: "escritórios advocacia",
    location: "Curitiba, PR",
    leads: [
      { emoji: "⚖️", name: "Silva & Associados", phone: "(41) 99XXX-XXXX", rating: "4.9" },
      { emoji: "📜", name: "Advocacia Martins", phone: "(41) 98XXX-XXXX", rating: "4.8" },
      { emoji: "🏛️", name: "Jurídico Paraná", phone: "(41) 97XXX-XXXX", rating: "4.7" },
    ]
  },
];

// Typing animation component with callback for index changes
const useTypingAnimation = (texts: string[], typingSpeed = 80, deletingSpeed = 40, pauseDuration = 2500) => {
  const [displayText, setDisplayText] = useState("");
  const [textIndex, setTextIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [phase, setPhase] = useState<'typing' | 'showing' | 'deleting'>('typing');

  useEffect(() => {
    const currentFullText = texts[textIndex];
    
    if (isPaused) {
      setPhase('showing');
      const pauseTimer = setTimeout(() => {
        setIsPaused(false);
        setIsDeleting(true);
        setPhase('deleting');
      }, pauseDuration);
      return () => clearTimeout(pauseTimer);
    }

    if (isDeleting) {
      if (displayText.length > 0) {
        const deleteTimer = setTimeout(() => {
          setDisplayText(currentFullText.substring(0, displayText.length - 1));
        }, deletingSpeed);
        return () => clearTimeout(deleteTimer);
      } else {
        setIsDeleting(false);
        setTextIndex((prev) => (prev + 1) % texts.length);
        setPhase('typing');
      }
    } else {
      if (displayText.length < currentFullText.length) {
        const typeTimer = setTimeout(() => {
          setDisplayText(currentFullText.substring(0, displayText.length + 1));
        }, typingSpeed);
        return () => clearTimeout(typeTimer);
      } else {
        setIsPaused(true);
      }
    }
  }, [displayText, isDeleting, isPaused, textIndex, texts, typingSpeed, deletingSpeed, pauseDuration]);

  return { displayText, textIndex, phase };
};

// Floating stats cards data - positioned around the demo
const floatingCards = [
  { 
    icon: Send, 
    value: "900K+", 
    label: "Mensagens enviadas", 
    position: "-left-6 lg:-left-16 xl:-left-24 top-4 lg:top-2",
    delay: "0.8s"
  },
  { 
    icon: Users, 
    value: "1.2M+", 
    label: "Leads prospectados", 
    position: "-right-2 lg:-right-10 xl:-right-16 top-12 lg:top-8",
    delay: "1.2s"
  },
  { 
    icon: TrendingUp, 
    value: "63%", 
    label: "Taxa de resposta", 
    position: "-left-8 lg:-left-20 xl:-left-28 bottom-[160px] lg:bottom-[150px]",
    delay: "1.6s"
  },
  { 
    icon: Zap, 
    value: "+40%", 
    label: "Conversão vs tradicional", 
    position: "-right-4 lg:-right-12 xl:-right-20 bottom-[120px] lg:bottom-[110px]",
    delay: "2s"
  },
];

interface HeroSectionProps {
  onSignupClick?: () => void;
}

export const HeroSection = ({ onSignupClick }: HeroSectionProps) => {
  const [scrollY, setScrollY] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const demoRef = useRef<HTMLDivElement>(null);
  
  // Synchronized typing animation
  const { displayText, textIndex, phase } = useTypingAnimation(
    demoData.map(d => d.searchTerm),
    80,
    40,
    2500
  );
  
  const currentData = demoData[textIndex];

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

  // Control animation based on viewport visibility
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        setIsAnimating(entries[0].isIntersecting);
      },
      { threshold: 0.2 }
    );

    if (demoRef.current) {
      observer.observe(demoRef.current);
    }

    return () => observer.disconnect();
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
      className="relative min-h-screen flex items-center justify-center pt-16 pb-32 overflow-hidden w-full"
    >
      {/* Parallax Background effects */}
      <div 
        className="absolute inset-0 bg-gradient-hero will-change-transform"
        style={{ transform: `translateY(${parallaxOffset * 0.5}px)` }}
      />
      
      {/* Main glow - softer */}
      <div 
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] md:w-[800px] h-[600px] md:h-[800px] bg-gradient-glow opacity-20 will-change-transform"
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
      
      <div className="container mx-auto px-4 relative z-10 max-w-7xl w-full">
        {/* Two-column layout: text left, demo right */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          
          {/* LEFT: Text content */}
          <div className="text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full glass mb-6 sm:mb-8 animate-fade-in">
              <Brain size={16} className="text-primary flex-shrink-0" />
              <span className="text-xs sm:text-sm text-muted-foreground">
                IA que identifica leads com maior potencial de conversão
              </span>
            </div>

            {/* Main heading */}
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] xl:text-6xl font-bold mb-4 sm:mb-6 animate-slide-up text-foreground whitespace-nowrap lg:whitespace-normal" style={{ animationDelay: "0.1s" }}>
              Prospecção Inteligente de{" "}
              <br className="hidden lg:block" />
              <span className="text-shimmer-highlight whitespace-nowrap">Leads B2B com IA</span>
            </h1>

            {/* Subheading */}
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 sm:mb-8 max-w-lg mx-auto lg:mx-0 animate-slide-up" style={{ animationDelay: "0.2s" }}>
              Nossa IA analisa milhares de empresas e entrega apenas os leads estratégicos:
              empresas ativas, com contatos verificados e alto potencial de conversão.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-3 sm:gap-4 mb-8 animate-slide-up" style={{ animationDelay: "0.3s" }}>
              <Link to="/signup" className="w-full sm:w-auto" onClick={onSignupClick}>
                <Button variant="hero" size="xl" className="group w-full sm:w-auto rounded-full">
                  Começar com 10 buscas grátis
                  <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <a href="#features" className="w-full sm:w-auto">
                <Button variant="hero-outline" size="xl" className="w-full sm:w-auto rounded-full">
                  Ver como funciona
                </Button>
              </a>
            </div>

            {/* Feature highlights */}
            <div className="flex flex-col sm:flex-row items-center lg:items-start gap-4 sm:gap-6 animate-slide-up" style={{ animationDelay: "0.4s" }}>
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Search size={16} className="text-primary flex-shrink-0" />
                <span>Busca por palavra-chave</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <MapPin size={16} className="text-primary flex-shrink-0" />
                <span>Filtro por cidade/região</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Download size={16} className="text-primary flex-shrink-0" />
                <span>Download em planilha</span>
              </div>
            </div>
          </div>

          {/* RIGHT: Animated Demo */}
          <div 
            className="animate-slide-up will-change-transform w-full" 
            style={{ 
              animationDelay: "0.5s",
              transform: `translateY(${-parallaxOffset * 0.05}px)`,
              opacity: imageOpacity
            }}
          >
            <div className="relative w-full">
              {/* Background glow */}
              <div 
                className="absolute -inset-4 bg-primary/8 blur-3xl rounded-3xl will-change-transform"
                style={{ transform: `scale(${1 + scrollY * 0.0001})` }}
              />
              
              {/* Floating Stats Cards */}
              {floatingCards.map((card, index) => (
                <div
                  key={index}
                  className={`absolute ${card.position} z-30 floating-card hidden lg:block`}
                  style={{ animationDelay: card.delay }}
                >
                  <div className="glass rounded-lg p-3 shadow-lg shadow-primary/10 border border-border/50 hover:border-primary/20 transition-all hover:scale-105">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <card.icon size={14} className="text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">
                          <AnimatedCounter value={card.value} duration={2000} />
                        </p>
                        <p className="text-[10px] text-muted-foreground whitespace-nowrap">{card.label}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Demo badge */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 hidden sm:block">
                <span className="px-3 py-1 text-xs font-medium bg-primary/20 text-primary border border-primary/30 rounded-full backdrop-blur-sm">
                  ✨ Demonstração em tempo real
                </span>
              </div>
              
              <div ref={demoRef} className={`relative glass rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-card hover:shadow-glow transition-shadow duration-500 ${isAnimating ? 'demo-animating' : 'demo-paused'}`}>
                {/* Window controls */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-warning/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-success/60" />
                  </div>
                </div>
                
                <div className="bg-background/50 rounded-lg sm:rounded-xl p-3 sm:p-4">
                  {/* Search bar simulation */}
                  <div className="flex flex-col sm:flex-row gap-2 mb-3 sm:mb-4">
                    <div className="flex-1 bg-secondary rounded-lg px-3 py-2 text-xs sm:text-sm flex items-center">
                      <span className="text-muted-foreground mr-2">🔍</span>
                      <span className="text-foreground">{displayText}</span>
                      <span className="typing-cursor">|</span>
                    </div>
                    <div className="flex-1 bg-secondary rounded-lg px-3 py-2 text-xs sm:text-sm text-muted-foreground">
                      📍 {currentData.location}
                    </div>
                    <button className="bg-primary text-primary-foreground rounded-lg px-4 py-2 font-medium text-xs sm:text-sm flex items-center justify-center gap-2 search-pulse">
                      <Search size={14} />
                      Buscar
                    </button>
                  </div>
                  
                  {/* Animated leads */}
                  <div className="space-y-2">
                    {currentData.leads.map((lead, idx) => (
                      <div 
                        key={`${textIndex}-${idx}`}
                        className={`flex items-center gap-3 bg-secondary/50 rounded-lg p-3 transition-all duration-300 ${
                          phase === 'showing' ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
                        }`}
                        style={{ transitionDelay: phase === 'showing' ? `${idx * 150}ms` : '0ms' }}
                      >
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-base">{lead.emoji}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs sm:text-sm truncate">{lead.name}</p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground truncate">📱 {lead.phone} • ⭐ {lead.rating}</p>
                        </div>
                        <div 
                          className={`transition-all duration-300 ${phase === 'showing' ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}
                          style={{ transitionDelay: phase === 'showing' ? `${800 + idx * 200}ms` : '0ms' }}
                        >
                          <div className="bg-success/20 text-success rounded-full p-1.5">
                            <MessageCircle size={12} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Stats bar */}
                  <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-[10px] sm:text-xs text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span>
                        <span className="counter-animation">47</span> leads
                      </span>
                      <span className="flex items-center gap-1">
                        <Zap size={10} className="text-primary" />
                        <span className="counter-animation">12</span> enviadas
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3 benefit cards BELOW the demo */}
              <div className="grid grid-cols-3 gap-3 mt-4 animate-slide-up" style={{ animationDelay: "0.7s" }}>
                <div className="glass rounded-2xl px-3 py-3 flex flex-col items-center gap-2 text-center">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center">
                    <Target size={16} className="text-white" />
                  </div>
                  <span className="text-xs font-medium text-foreground leading-tight">Leads pré-qualificados</span>
                </div>
                <div className="glass rounded-2xl px-3 py-3 flex flex-col items-center gap-2 text-center">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center">
                    <MessageCircle size={16} className="text-white" />
                  </div>
                  <span className="text-xs font-medium text-foreground leading-tight">Disparo em massa via WhatsApp</span>
                </div>
                <div className="glass rounded-2xl px-3 py-3 flex flex-col items-center gap-2 text-center">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center">
                    <TrendingUp size={16} className="text-white" />
                  </div>
                  <span className="text-xs font-medium text-foreground leading-tight">Maior taxa de conversão</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
