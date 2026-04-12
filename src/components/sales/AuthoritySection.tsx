import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Cpu, MessageSquare, Server } from "lucide-react";

/* ── Animated counter ── */
const AnimatedCounter = ({ end, suffix = "", isVisible, delay = 0 }: { end: number; suffix?: string; isVisible: boolean; delay?: number }) => {
  const [count, setCount] = useState(0);
  const hasStarted = useRef(false);

  useEffect(() => {
    if (!isVisible || hasStarted.current) return;
    const timer = setTimeout(() => {
      hasStarted.current = true;
      const startTime = performance.now();
      const duration = 2200;
      const animate = (t: number) => {
        const p = Math.min((t - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        setCount(Math.floor(eased * end));
        if (p < 1) requestAnimationFrame(animate);
        else setCount(end);
      };
      requestAnimationFrame(animate);
    }, delay);
    return () => clearTimeout(timer);
  }, [isVisible, end, delay]);

  const display = () => {
    if (end >= 1000000) return `${(count / 1000000).toFixed(1)}`;
    if (end >= 1000) return new Intl.NumberFormat("pt-BR").format(count);
    return count.toString();
  };

  return <span className="tabular-nums">{display()}{suffix}</span>;
};

const stats = [
  { value: 50000, prefix: "+", suffix: "", label: "leads analisados e processados" },
  { value: 500, prefix: "+", suffix: "", label: "empresas utilizando a plataforma" },
  { value: 6, prefix: "+R$ ", suffix: " mi", label: "em vendas geradas com o sistema" },
];

const techPillars = [
  { icon: Cpu, label: "IA avançada" },
  { icon: MessageSquare, label: "API oficial do WhatsApp" },
  { icon: Server, label: "Infraestrutura escalável" },
];

export const AuthoritySection = () => {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section ref={ref as React.RefObject<HTMLElement>} className="py-20 sm:py-28 w-full relative overflow-hidden">
      {/* Background accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.015] to-transparent pointer-events-none" />

      <div className="container mx-auto px-4 max-w-5xl relative z-10">
        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-3 leading-tight">
            Crescimento validado{" "}
            <span className="text-shimmer-highlight">na prática</span>
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Números que representam impacto real em operações comerciais B2B.
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-14"
        >
          {stats.map((s, i) => (
            <div
              key={s.label}
              className="relative text-center p-8 rounded-2xl border border-border/60 bg-white/[0.03]"
            >
              <div className="absolute -bottom-6 -right-6 w-28 h-28 rounded-full bg-primary/[0.04] blur-[50px] pointer-events-none" />
              <div className="relative z-10">
                <span className="font-display text-4xl sm:text-5xl font-bold text-foreground block mb-2">
                  {s.prefix}
                  <AnimatedCounter end={s.value} suffix={s.suffix} isVisible={isVisible} delay={300 + i * 200} />
                </span>
                <span className="text-sm text-muted-foreground">{s.label}</span>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Tech pillars */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10"
        >
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
            Sistema baseado em
          </span>
          <div className="flex items-center gap-8">
            {techPillars.map((p) => (
              <div key={p.label} className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <p.icon size={16} className="text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground">{p.label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};
