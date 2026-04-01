import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";

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
    label: "faturados com nossas soluções",
  },
  {
    value: 532000,
    prefix: "+R$ ",
    suffix: " mil",
    label: "economizados com anúncios",
  },
  {
    value: 50000,
    prefix: "+",
    suffix: " mil",
    label: "empresas prospectadas",
  },
];

export const ImpactNumbersSection = () => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.15 });

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="relative overflow-hidden py-28 sm:py-36"
    >
      {/* Animated paths background – always rendered, infinite */}
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

      {/* Top + bottom divider lines */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="container mx-auto px-4 relative z-10 max-w-5xl">
        {/* Headline */}
        <motion.h2
          className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-bold text-center text-foreground leading-[1.15] mb-20"
          initial={{ opacity: 0, y: 24 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          Nosso negócio é fazer{" "}
          <span className="text-gradient">negócios crescerem</span>
        </motion.h2>

        {/* Stats row */}
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border/60">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              className="flex flex-col items-center text-center py-8 md:py-0 md:px-6 lg:md:px-8 first:pt-0 last:pb-0 md:first:pl-0 md:last:pr-0"
              initial={{ opacity: 0, y: 20 }}
              animate={isVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.25 + i * 0.15, ease: "easeOut" }}
            >
              <span className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-none mb-3 whitespace-nowrap">
                <AnimatedCounter
                  end={stat.value}
                  prefix={stat.prefix}
                  suffix={stat.suffix}
                  isVisible={isVisible}
                  delay={300 + i * 200}
                  duration={2200}
                />
              </span>
              <span className="text-muted-foreground text-sm sm:text-base max-w-[220px]">
                {stat.label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
