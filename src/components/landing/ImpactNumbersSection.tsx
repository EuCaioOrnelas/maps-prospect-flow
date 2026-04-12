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

/* ── Floating SVG paths – infinite loop, softer ── */
function FloatingPaths({ position }: { position: number }) {
  const paths = Array.from({ length: 28 }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${380 - i * 5 * position} -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${152 - i * 5 * position} ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${684 - i * 5 * position} ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    width: 0.3 + i * 0.015,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <svg className="w-full h-full" viewBox="0 0 696 316" fill="none" preserveAspectRatio="xMidYMid slice">
        <title>Decorative paths</title>
        {paths.map((path) => (
          <motion.path
            key={path.id}
            d={path.d}
            stroke="hsl(158 72% 38%)"
            strokeWidth={path.width}
            strokeOpacity={0.03 + path.id * 0.004}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: [0, 1, 0] }}
            transition={{
              duration: 8 + path.id * 0.3,
              delay: path.id * 0.12,
              ease: "easeInOut",
              repeat: Infinity,
              repeatType: "mirror",
            }}
          />
        ))}
      </svg>
    </div>
  );
}

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
      {/* Animated paths background */}
      <FloatingPaths position={1} />
      <FloatingPaths position={-1} />

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
          className="text-center mb-10 sm:mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-semibold text-foreground leading-tight">
            Crescimento validado{" "}
            <span className="text-shimmer-highlight">na prática</span>
          </h2>
        </motion.div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-7">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                className="relative rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-7 sm:p-8 text-center overflow-hidden group hover:shadow-[0_8px_30px_-10px_hsl(var(--primary)/0.12)] hover:border-primary/25 transition-all duration-300"
                initial={{ opacity: 0, y: 24 }}
                animate={isVisible ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.15 + i * 0.12, ease: "easeOut" }}
              >
                {/* Subtle glow */}
                <div className="absolute -bottom-12 -right-12 w-36 h-36 rounded-full bg-primary/8 blur-[60px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Icon */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={isVisible ? { scale: 1 } : {}}
                  transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.3 + i * 0.12 }}
                  className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-5"
                >
                  <Icon size={20} className="text-primary" />
                </motion.div>

                {/* Number */}
                <span className="font-display text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-foreground leading-none block mb-2.5">
                  <AnimatedCounter
                    end={stat.value}
                    prefix={stat.prefix}
                    suffix={stat.suffix}
                    isVisible={isVisible}
                    delay={300 + i * 200}
                    duration={2200}
                  />
                </span>

                {/* Label */}
                <span className="text-muted-foreground text-sm max-w-[200px] mx-auto block leading-relaxed">
                  {stat.label}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
