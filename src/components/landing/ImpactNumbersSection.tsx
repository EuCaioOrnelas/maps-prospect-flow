import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useEffect, useState, useRef } from "react";
import { DollarSign, PiggyBank, Building2, TrendingUp } from "lucide-react";

interface CounterProps {
  end: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  isVisible: boolean;
  delay?: number;
}

const AnimatedCounter = ({ end, prefix = "", suffix = "", duration = 2000, isVisible, delay = 0 }: CounterProps) => {
  const [count, setCount] = useState(0);
  const hasStarted = useRef(false);

  useEffect(() => {
    if (!isVisible || hasStarted.current) return;
    
    const timer = setTimeout(() => {
      hasStarted.current = true;
      const startTime = performance.now();
      
      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        setCount(Math.floor(eased * end));
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setCount(end);
        }
      };
      
      requestAnimationFrame(animate);
    }, delay);

    return () => clearTimeout(timer);
  }, [isVisible, end, duration, delay]);

  const formatNumber = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(0)}`;
    if (n >= 1000) return `${(n / 1000).toFixed(0)}`;
    return n.toString();
  };

  return (
    <span className="tabular-nums">
      {prefix}{end >= 1000000 ? `${(count / 1000000).toFixed(count >= end ? 0 : 1)}` : end >= 1000 ? `${(count / 1000).toFixed(0)}` : count}{suffix}
    </span>
  );
};

const stats = [
  {
    icon: DollarSign,
    value: 6000000,
    prefix: "+R$ ",
    suffix: " mi",
    label: "faturados com nossas soluções",
    description: "Resultado direto gerado para nossos clientes",
    accentColor: "from-emerald-400 to-primary",
  },
  {
    icon: PiggyBank,
    value: 532000,
    prefix: "+R$ ",
    suffix: " mil",
    label: "economizados com anúncios",
    description: "Que seriam gastos em tráfego pago convencional",
    accentColor: "from-cyan-400 to-teal-500",
  },
  {
    icon: Building2,
    value: 50000,
    prefix: "+",
    suffix: " mil",
    label: "empresas prospectadas",
    description: "Leads qualificados encontrados pela plataforma",
    accentColor: "from-primary to-emerald-600",
  },
];

export const ImpactNumbersSection = () => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.15 });

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="py-24 sm:py-32 relative overflow-hidden"
    >
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] rounded-full opacity-[0.06]"
          style={{ background: 'radial-gradient(ellipse, hsl(158 72% 45%), transparent 70%)' }} />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      </div>

      <div className="container mx-auto px-4 relative z-10 max-w-6xl">
        {/* Section header */}
        <div className={`text-center mb-16 sm:mb-20 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20 mb-6 transition-all duration-500 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
            <TrendingUp className="w-3.5 h-3.5" />
            Resultados Reais
          </div>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-[3.5rem] font-bold text-foreground leading-tight max-w-3xl mx-auto">
            Nosso negócio é fazer{" "}
            <span className="relative inline-block">
              <span className="text-gradient">negócios crescerem</span>
              <svg className={`absolute -bottom-2 left-0 w-full h-3 transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`} viewBox="0 0 200 8" preserveAspectRatio="none">
                <path d="M0 7 Q50 0 100 5 Q150 0 200 7" stroke="hsl(158 72% 38%)" strokeWidth="2" fill="none" strokeLinecap="round" className={`${isVisible ? 'animate-[draw_1s_ease-out_0.8s_forwards]' : ''}`} style={{ strokeDasharray: 300, strokeDashoffset: isVisible ? 0 : 300, transition: 'stroke-dashoffset 1s ease-out 0.8s' }} />
              </svg>
            </span>
          </h2>
          <p className={`text-muted-foreground text-base sm:text-lg mt-4 max-w-xl mx-auto transition-all duration-700 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            Números que comprovam o impacto da Wiize na prospecção de empresas em todo o Brasil
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className={`group relative transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
              style={{ transitionDelay: `${index * 150 + 300}ms` }}
            >
              {/* Card */}
              <div className="relative h-full rounded-2xl border border-border/50 bg-card/40 backdrop-blur-sm p-8 lg:p-10 overflow-hidden hover:border-primary/30 transition-all duration-500 hover:shadow-xl hover:shadow-primary/5">
                {/* Gradient accent top line */}
                <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${stat.accentColor} opacity-60 group-hover:opacity-100 transition-opacity duration-500`} />
                
                {/* Background glow on hover */}
                <div className={`absolute top-0 left-0 right-0 h-32 bg-gradient-to-b ${stat.accentColor} opacity-0 group-hover:opacity-[0.04] transition-opacity duration-500`} />

                {/* Icon */}
                <div className={`relative mb-6 inline-flex`}>
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${stat.accentColor} flex items-center justify-center shadow-lg transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}>
                    <stat.icon className="w-7 h-7 text-white" />
                  </div>
                  {/* Floating ring */}
                  <div className={`absolute -inset-2 rounded-xl border border-primary/20 opacity-0 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500`} />
                </div>

                {/* Number */}
                <div className="mb-3">
                  <span className={`font-display text-4xl sm:text-5xl lg:text-[3.5rem] font-bold bg-gradient-to-br ${stat.accentColor} bg-clip-text text-transparent leading-none`}>
                    <AnimatedCounter
                      end={stat.value}
                      prefix={stat.prefix}
                      suffix={stat.suffix}
                      isVisible={isVisible}
                      delay={index * 200 + 400}
                      duration={2200}
                    />
                  </span>
                </div>

                {/* Label */}
                <h3 className="text-foreground font-semibold text-lg mb-1.5">
                  {stat.label}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {stat.description}
                </p>

                {/* Decorative dots */}
                <div className="absolute bottom-4 right-4 grid grid-cols-3 gap-1 opacity-20 group-hover:opacity-40 transition-opacity duration-500">
                  {[...Array(9)].map((_, i) => (
                    <div key={i} className="w-1 h-1 rounded-full bg-primary" />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom accent bar */}
        <div className={`mt-12 flex items-center justify-center gap-3 transition-all duration-700 delay-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="h-px w-12 bg-gradient-to-r from-transparent to-primary/40" />
          <span className="text-muted-foreground text-xs tracking-widest uppercase font-medium">Dados até 2025</span>
          <div className="h-px w-12 bg-gradient-to-l from-transparent to-primary/40" />
        </div>
      </div>
    </section>
  );
};
