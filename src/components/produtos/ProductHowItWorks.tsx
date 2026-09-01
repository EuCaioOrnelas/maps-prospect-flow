import { useRef, useState } from "react";
import { motion, useScroll, useSpring, useMotionValueEvent } from "framer-motion";
import { Check } from "lucide-react";
import type { ProductStep } from "@/data/products";

interface ProductHowItWorksProps {
  title: string;
  steps: ProductStep[];
}

export const ProductHowItWorks = ({ title, steps }: ProductHowItWorksProps) => {
  const listRef = useRef<HTMLOListElement>(null);
  const [active, setActive] = useState(0);

  const { scrollYProgress } = useScroll({
    target: listRef,
    offset: ["start 70%", "end 60%"],
  });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 24, mass: 0.4 });

  useMotionValueEvent(progress, "change", (v) => {
    const idx = Math.min(steps.length - 1, Math.max(0, Math.round(v * (steps.length - 1))));
    setActive(idx);
  });

  return (
    <section className="w-full py-16 sm:py-24">
      <div className="container mx-auto w-full max-w-[90rem] px-6 sm:px-10 lg:px-16">
        <div className="grid gap-10 lg:grid-cols-[0.95fr_1fr] lg:gap-16">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Como funciona
            </span>
            <h2 className="mt-3 font-display text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-3xl md:text-4xl">
              {title}
            </h2>
          </div>

          <ol ref={listRef} className="relative space-y-8 pl-6 sm:space-y-10 sm:pl-8">
            {/* trilha + progresso */}
            <span className="absolute left-0 top-0 h-full w-px bg-border/70" aria-hidden />
            <motion.span
              className="absolute left-0 top-0 h-full w-px origin-top bg-primary"
              style={{ scaleY: progress }}
              aria-hidden
            />
            {/* bolinha que acompanha o scroll */}
            <motion.span
              className="absolute -left-[5px] top-0 h-[11px] w-[11px] rounded-full bg-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.15)]"
              style={{ top: useTopPercent(progress) }}
              aria-hidden
            />

            {steps.map((step, i) => (
              <motion.li
                key={step.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.45, delay: i * 0.05, ease: "easeOut" }}
                className="relative"
              >
                <motion.span
                  animate={
                    active === i
                      ? { scale: 1.18, backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }
                      : { scale: 1, backgroundColor: "hsl(var(--primary) / 0.1)", color: "hsl(var(--primary))" }
                  }
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="absolute -left-[2.1rem] flex h-7 w-7 items-center justify-center rounded-full border border-primary/20 text-[11px] font-bold sm:-left-[2.6rem]"
                >
                  {String(i + 1).padStart(2, "0")}
                </motion.span>
                <h3 className="text-base font-semibold text-foreground sm:text-lg">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
                <div className="mt-4 rounded-panel border border-border/60 bg-card/60 p-3 sm:p-4">
                  <ul className="space-y-2">
                    {step.preview.map((line) => (
                      <li key={line} className="flex items-center gap-2 text-[13px] text-foreground/80">
                        <Check size={13} className="shrink-0 text-primary" />
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
};

export default ProductHowItWorks;
