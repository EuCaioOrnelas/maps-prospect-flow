import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { TrendingUp, PiggyBank, Building2 } from "lucide-react";

/* ── Animated counter ── */
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
  }, [isVisible, end, duration, delay]);

  const display = () => {
    if (end >= 1000000) return `${(count / 1000000).toFixed(count >= end ? 0 : 1)}`;
    if (end >= 1000) return `${(count / 1000).toFixed(0)}`;
    return count.toString();
  };

  return <span className="tabular-nums whitespace-nowrap">{prefix}{display()}{suffix}</span>;
};

/* ── Stats data ── */
const stats = [
  {
    value: 6000000,
    prefix: "+R$ ",
    suffix: " mi",
    label: "em faturamento gerado",
    icon: TrendingUp,
  },
  {
    value: 532000,
    prefix: "+R$ ",
    suffix: " mil",
    label: "economizados em aquisição",
    icon: PiggyBank,
  },
  {
    value: 50000,
    prefix: "+",
    suffix: " mil",
    label: "empresas mapeadas com IA",
    icon: Building2,
  },
];

export const ImpactNumbersSection = () => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.15 });

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="relative overflow-hidden py-14 sm:py-20"
    >
      {/* Subtle gradient wash */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[120%] h-[70%] opacity-[0.04]"
          style={{
            background:
              "radial-gradient(ellipse at 50% 100%, hsl(158 72% 45%), transparent 70%)",
          }}
        />
      </div>

      <div className="container mx-auto px-4 relative z-10 max-w-[1160px]">
        {/* Headline */}
        <motion.div
          className="text-center mb-10 sm:mb-14"
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-semibold text-foreground leading-tight">
            Crescimento validado{" "}
            <span className="text-shimmer-highlight">na prática</span>
          </h2>
        </motion.div>

        {/* Stats row — no cards, icon left of label */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                className="text-center"
                initial={{ opacity: 0, y: 32 }}
                animate={isVisible ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.15 + i * 0.12, ease: "easeOut" }}
              >
                {/* Number */}
                <span className="font-display text-4xl sm:text-5xl lg:text-[3.25rem] font-bold text-foreground leading-none block mb-3">
                  <AnimatedCounter
                    end={stat.value}
                    prefix={stat.prefix}
                    suffix={stat.suffix}
                    isVisible={isVisible}
                    delay={300 + i * 200}
                    duration={2200}
                  />
                </span>

                {/* Icon + Label inline */}
                <div className="flex items-center justify-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon size={14} className="text-primary" />
                  </div>
                  <span className="text-muted-foreground text-sm leading-relaxed">
                    {stat.label}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
