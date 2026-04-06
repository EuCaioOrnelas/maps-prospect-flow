import { useEffect, useState, useRef } from "react";
import metaIcon from "@/assets/logos/meta-icon.png";
import { Button } from "@/components/ui/button";
import { ArrowRight, Search, Zap, TrendingUp, MessageCircle, Users, Send, Check, ChevronDown } from "lucide-react";
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
    searchTerm: "academias",
    location: "São Paulo, SP",
    leads: [
      { emoji: "🏋️", name: "CrossFit Box SP", phone: "(11) 99XXX-XXXX", rating: "4.8" },
      { emoji: "💪", name: "Arena Fit Training", phone: "(11) 98XXX-XXXX", rating: "4.6" },
      { emoji: "🔥", name: "Power Gym Plus", phone: "(11) 97XXX-XXXX", rating: "4.9" },
    ]
  },
  {
    searchTerm: "dentistas",
    location: "Rio de Janeiro, RJ",
    leads: [
      { emoji: "🦷", name: "OdontoLife Centro", phone: "(21) 99XXX-XXXX", rating: "4.9" },
      { emoji: "😁", name: "Sorriso Perfeito", phone: "(21) 98XXX-XXXX", rating: "4.7" },
      { emoji: "🏥", name: "Dental Prime RJ", phone: "(21) 97XXX-XXXX", rating: "4.8" },
    ]
  },
  {
    searchTerm: "restaurantes",
    location: "Belo Horizonte, MG",
    leads: [
      { emoji: "🍝", name: "Trattoria Bella", phone: "(31) 99XXX-XXXX", rating: "4.9" },
      { emoji: "🍕", name: "Cantina do Nonno", phone: "(31) 98XXX-XXXX", rating: "4.7" },
      { emoji: "🍷", name: "Bistrô Mineiro", phone: "(31) 97XXX-XXXX", rating: "4.8" },
    ]
  },
  {
    searchTerm: "advogados",
    location: "Curitiba, PR",
    leads: [
      { emoji: "⚖️", name: "Silva & Associados", phone: "(41) 99XXX-XXXX", rating: "4.9" },
      { emoji: "📜", name: "Advocacia Martins", phone: "(41) 98XXX-XXXX", rating: "4.8" },
      { emoji: "🏛️", name: "Jurídico Paraná", phone: "(41) 97XXX-XXXX", rating: "4.7" },
    ]
  },
];

// Typing animation component with callback for index changes
const useTypingAnimation = (texts: string[], typingSpeed = 80, deletingSpeed = 40, pauseDuration = 1800) => {
  const [displayText, setDisplayText] = useState("");
  const [textIndex, setTextIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [phase, setPhase] = useState<'typing' | 'showing' | 'sending' | 'deleting'>('typing');
  const [sendingIndex, setSendingIndex] = useState(-1);

  useEffect(() => {
    const currentFullText = texts[textIndex];
    
    if (isPaused) {
      if (phase === 'showing') {
        const sendTimer = setTimeout(() => {
          setPhase('sending');
          setSendingIndex(0);
        }, pauseDuration);
        return () => clearTimeout(sendTimer);
      }
      if (phase === 'sending') {
        if (sendingIndex < 2) {
          const nextTimer = setTimeout(() => {
            setSendingIndex(prev => prev + 1);
          }, 600);
          return () => clearTimeout(nextTimer);
        } else {
          const deleteTimer = setTimeout(() => {
            setIsPaused(false);
            setIsDeleting(true);
            setPhase('deleting');
            setSendingIndex(-1);
          }, 1000);
          return () => clearTimeout(deleteTimer);
        }
      }
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
        setPhase('showing');
      }
    }
  }, [displayText, isDeleting, isPaused, textIndex, texts, typingSpeed, deletingSpeed, pauseDuration, phase, sendingIndex]);

  return { displayText, textIndex, phase, sendingIndex };
};

// Floating stats cards data - positioned around the demo
const floatingCards = [
  { 
    icon: Send, 
    value: "900K+", 
    label: "Mensagens enviadas", 
    position: "-left-[10.5rem] top-4",
    delay: "0.8s"
  },
  { 
    icon: Users, 
    value: "1.2M+", 
    label: "Leads prospectados", 
    position: "-right-12 -top-5",
    delay: "1.2s"
  },
  { 
    icon: TrendingUp, 
    value: "63%", 
    label: "Taxa de resposta", 
    position: "-left-[7.5rem] bottom-[5.5rem]",
    delay: "1.6s"
  },
  { 
    icon: Zap, 
    value: "+40%", 
    label: "Conversão vs tradicional", 
    position: "-right-10 -bottom-3",
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
  const { displayText, textIndex, phase, sendingIndex } = useTypingAnimation(
    demoData.map(d => d.searchTerm),
    80,
    40,
    1800
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


  return (
    <section 
      ref={sectionRef}
      className="relative min-h-[85vh] flex items-center justify-center pt-16 pb-10 overflow-x-clip overflow-y-visible w-full"
    >
      {/* Parallax background overlay */}
      <div 
        className="absolute inset-0 will-change-transform"
        style={{
          transform: `translateY(${parallaxOffset * 0.5}px)`,
          background: "linear-gradient(180deg, hsl(var(--background) / 0.92) 0%, hsl(var(--background) / 0.72) 58%, hsl(var(--background) / 0.28) 100%)"
        }}
      />

      {/* World map dot pattern */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.14] will-change-transform"
        style={{
          transform: `translateY(${parallaxOffset * 0.2}px)`,
          backgroundImage: `radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)`,
          backgroundSize: '18px 18px',
          maskImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 600'%3E%3Cellipse cx='350' cy='220' rx='180' ry='200' fill='white'/%3E%3Cellipse cx='370' cy='420' rx='80' ry='120' fill='white'/%3E%3Cellipse cx='550' cy='180' rx='200' ry='180' fill='white'/%3E%3Cellipse cx='560' cy='380' rx='100' ry='100' fill='white'/%3E%3Cellipse cx='750' cy='250' rx='180' ry='150' fill='white'/%3E%3Cellipse cx='800' cy='400' rx='60' ry='80' fill='white'/%3E%3Cellipse cx='900' cy='300' rx='120' ry='100' fill='white'/%3E%3Cellipse cx='1000' cy='350' rx='80' ry='120' fill='white'/%3E%3Cellipse cx='200' cy='250' rx='100' ry='80' fill='white'/%3E%3C/svg%3E")`,
          WebkitMaskImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 600'%3E%3Cellipse cx='350' cy='220' rx='180' ry='200' fill='white'/%3E%3Cellipse cx='370' cy='420' rx='80' ry='120' fill='white'/%3E%3Cellipse cx='550' cy='180' rx='200' ry='180' fill='white'/%3E%3Cellipse cx='560' cy='380' rx='100' ry='100' fill='white'/%3E%3Cellipse cx='750' cy='250' rx='180' ry='150' fill='white'/%3E%3Cellipse cx='800' cy='400' rx='60' ry='80' fill='white'/%3E%3Cellipse cx='900' cy='300' rx='120' ry='100' fill='white'/%3E%3Cellipse cx='1000' cy='350' rx='80' ry='120' fill='white'/%3E%3Cellipse cx='200' cy='250' rx='100' ry='80' fill='white'/%3E%3C/svg%3E")`,
          maskSize: 'cover',
          WebkitMaskSize: 'cover',
          maskPosition: 'center',
          WebkitMaskPosition: 'center',
        }}
      />
      
      {/* Main glow - softer */}
      <div 
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] md:w-[800px] h-[600px] md:h-[800px] bg-gradient-glow opacity-20 will-change-transform"
        style={{ transform: `translate(-50%, ${parallaxOffset * 0.3}px)` }}
      />
      
      <div className="container mx-auto px-6 sm:px-10 lg:px-16 relative z-10 max-w-[90rem] w-full">
        {/* Two-column layout: text left, demo right */}
        <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_1fr] gap-2 xl:gap-4 items-center">
          
          {/* LEFT: Text content */}
          <div className="text-center xl:text-left">
            {/* Trust badge with avatars */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full glass mb-6 sm:mb-8 animate-fade-in border border-primary/10">
              <Users size={14} className="text-primary" />
              <span className="text-xs font-medium text-foreground tracking-tight">+500 empresas já utilizam a Wiize</span>
            </div>

            {/* Main heading - always 3 lines */}
            <h1 className="font-display text-[2.5rem] sm:text-[3rem] md:text-[3.5rem] lg:text-[3.75rem] xl:text-[4.25rem] font-bold mb-4 sm:mb-6 animate-slide-up text-foreground leading-[1.12]" style={{ animationDelay: "0.1s" }}>
              Transforme
              <br />
              Leads B2B em
              <br />
              <span className="text-shimmer-highlight">Clientes com IA</span>
            </h1>

            {/* Subheading */}
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 sm:mb-8 max-w-lg mx-auto xl:mx-0 animate-slide-up" style={{ animationDelay: "0.2s" }}>
              Encontre leads qualificados, gere mensagens personalizadas com IA, automatize seu atendimento e follow-up no WhatsApp com inteligência artificial.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center xl:justify-start gap-3 sm:gap-4 mb-8 animate-slide-up" style={{ animationDelay: "0.3s" }}>
              <Link to="/signup" className="shrink-0" onClick={onSignupClick}>
                <Button variant="hero" size="lg" className="group rounded-full text-base px-8 h-12">
                  Começar agora
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <a href="#features" className="group shrink-0">
                <Button variant="ghost" size="lg" className="rounded-full text-base px-8 h-12 border border-transparent hover:border-primary hover:bg-primary hover:text-primary-foreground transition-all">
                  Ver como funciona
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </Button>
              </a>
            </div>

          </div>

          {/* RIGHT: Animated Demo - hidden on small screens */}
          <div 
            className="animate-slide-up will-change-transform w-full hidden xl:flex xl:justify-end"
            style={{ 
              animationDelay: "0.5s",
              transform: `translateY(${-parallaxOffset * 0.05}px)`,
              opacity: imageOpacity
            }}
          >
            <div className="relative w-full max-w-[28rem] 2xl:max-w-[30rem]">
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
                  <div className="flex gap-2 mb-3 sm:mb-4">
                    <div className="flex-1 flex flex-col gap-2">
                      <div className="bg-secondary rounded-lg px-3 py-2 text-xs sm:text-sm flex items-center">
                        <span className="text-muted-foreground mr-2">🔍</span>
                        <span className="text-foreground">{displayText}</span>
                        <span className="typing-cursor">|</span>
                      </div>
                      <div className="bg-secondary rounded-lg px-3 py-2 text-xs sm:text-sm text-muted-foreground">
                        📍 {currentData.location}
                      </div>
                    </div>
                    <button className="bg-primary text-primary-foreground rounded-lg px-3 font-medium text-xs flex flex-col items-center justify-center gap-1 search-pulse aspect-square">
                      <Search size={16} />
                      <span>Buscar</span>
                    </button>
                  </div>
                  
                  {/* Animated leads */}
                  <div className="space-y-2 min-h-[180px]">
                    {currentData.leads.map((lead, idx) => (
                      <div 
                        key={`${textIndex}-${idx}`}
                        className={`flex items-center gap-3 bg-secondary/50 rounded-lg p-3 transition-all duration-500 ${
                          phase === 'showing' || phase === 'sending' ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
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
                        {/* Send status icon */}
                        <div className="flex items-center gap-1.5 min-w-[70px] justify-end">
                          {phase === 'sending' && sendingIndex >= idx ? (
                            <div className="flex items-center gap-1">
                              <div className="bg-primary/20 text-primary rounded-full p-1.5">
                                {sendingIndex === idx ? (
                                  <Send size={11} className="animate-pulse" />
                                ) : (
                                  <Check size={11} />
                                )}
                              </div>
                              <span className="text-[9px] text-primary font-medium">
                                {sendingIndex > idx ? 'Enviada ✓' : 'Enviando...'}
                              </span>
                            </div>
                          ) : (
                            <div 
                              className={`transition-all duration-300 ${phase === 'showing' || phase === 'sending' ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}
                              style={{ transitionDelay: phase === 'showing' ? `${800 + idx * 200}ms` : '0ms' }}
                            >
                              <div className="bg-success/20 text-success rounded-full p-1.5">
                                <MessageCircle size={12} />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Sending progress bar */}
                  <div className="mt-2 h-10">
                    <div className={`transition-all duration-400 ${phase === 'sending' ? 'opacity-100' : 'opacity-0'}`}>
                      <div className="bg-primary/10 rounded-lg p-2 flex items-center gap-2">
                        <Send size={12} className="text-primary animate-pulse" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-medium text-primary">Disparando mensagens...</span>
                            <span className="text-[10px] text-primary">{Math.min(sendingIndex + 1, 3)}/3</span>
                          </div>
                          <div className="w-full bg-primary/10 rounded-full h-1">
                            <div className="bg-primary h-1 rounded-full transition-all duration-500 ease-out" style={{ width: `${((sendingIndex + 1) / 3) * 100}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
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

            </div>
          </div>
        </div>
      </div>
      {/* Scroll indicator */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 animate-bounce opacity-50">
        <ChevronDown size={22} className="text-muted-foreground" />
      </div>
    </section>
  );
};
