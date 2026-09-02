import { useRef, useState, useMemo } from "react";
import { motion, useScroll, useSpring, useMotionValueEvent, useTransform } from "framer-motion";
import { HiCheckCircle } from "react-icons/hi2";
import type { ProductStep } from "@/data/products";
import { PV_STEPS_SECTION } from "./ProductFloatingVisual";

interface ProductHowItWorksProps {
  title: string;
  highlight?: string;
  steps: ProductStep[];
}

function SplitTitle({ title, highlight }: { title: string; highlight?: string }) {
  const parts = useMemo(() => {
    if (!highlight || !title.includes(highlight)) return { before: title, match: "", after: "" };
    const idx = title.indexOf(highlight);
    return {
      before: title.slice(0, idx),
      match: highlight,
      after: title.slice(idx + highlight.length),
    };
  }, [title, highlight]);

  return (
    <h2 className="mt-3 max-w-full font-display text-[clamp(1.6rem,3.25vw,2.9rem)] font-extrabold leading-[1.12] tracking-tight text-foreground">
      {parts.before && <span className="block whitespace-nowrap">{parts.before.trim()}</span>}
      {parts.match && <span className="block whitespace-nowrap text-shimmer-highlight">{parts.match}</span>}
      {parts.after && <span>{parts.after}</span>}
    </h2>
  );
}

export const ProductHowItWorks = ({ title, highlight, steps }: ProductHowItWorksProps) => {
  const listRef = useRef<HTMLOListElement>(null);
  const [active, setActive] = useState(0);
  const [trackH, setTrackH] = useState(0);

  // Mede a altura da trilha para animar só com transform (sem layout por frame)
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const update = () => setTrackH(el.getBoundingClientRect().height);
    update();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { scrollYProgress } = useScroll({
    target: listRef,
    // Trecho de scroll mais longo = animação mais lenta e confortável
    offset: ["start 92%", "end 30%"],
  });
  // Spring suave: sem travadas e sem "pulos" em telas fracas
  const progress = useSpring(scrollYProgress, { stiffness: 55, damping: 26, mass: 0.4 });
  // Linha e bolinha usam a MESMA fonte, só com transform (GPU)
  const fillScale = useTransform(progress, (v) => Math.min(1, Math.max(0, v)));
  const dotY = useTransform(progress, (v) => Math.min(1, Math.max(0, v)) * trackH);

  useMotionValueEvent(progress, "change", (v) => {
    // Ativa o passo assim que a bolinha alcança a posição do número
    const idx = Math.min(steps.length - 1, Math.max(0, Math.floor(v * steps.length)));
    setActive((prev) => (prev === idx ? prev : idx));
  });



  return (
    <section id={PV_STEPS_SECTION} className="w-full py-16 sm:py-24">
      <div className="container mx-auto w-full max-w-[90rem] px-6 sm:px-10 lg:px-16">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] lg:gap-12">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Como funciona
            </span>
            <SplitTitle title={title} highlight={highlight} />

            <ol ref={listRef} className="relative mt-10 space-y-8 pl-6 sm:mt-12 sm:space-y-10 sm:pl-8">
            {/* trilha + progresso + bolinha (mesma origem, sempre sincronizados) */}
            <span className="absolute left-0 top-0 h-full w-px bg-border/70" aria-hidden />
            <motion.span
              className="absolute left-0 top-0 w-px bg-primary"
              style={{ height: fillHeight, willChange: "height" }}
              aria-hidden
            >
              <span className="absolute -bottom-[5px] -left-[5px] h-[11px] w-[11px] rounded-full bg-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.15)]" />
            </motion.span>


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
                      ? { scale: 1.16, backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", borderColor: "hsl(var(--primary))" }
                      : { scale: 1, backgroundColor: "hsl(var(--card))", color: "hsl(var(--muted-foreground))", borderColor: "hsl(var(--border))" }
                  }
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute -left-[2.1rem] z-10 flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-bold shadow-[0_0_0_4px_hsl(var(--background))] sm:-left-[2.6rem]"
                >
                  {String(i + 1).padStart(2, "0")}
                </motion.span>
                <h3 className="text-base font-semibold text-foreground sm:text-lg">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
                <div className="mt-4 rounded-panel border border-border/60 bg-card/60 p-3 sm:p-4">
                  <ul className="space-y-2">
                    {step.preview.map((line) => (
                      <li key={line} className="flex items-center gap-2 text-[13px] text-foreground/80">
                        <HiCheckCircle className="h-4 w-4 shrink-0 text-primary" />
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.li>
            ))}
            </ol>
          </div>

          <div className="hidden min-h-full lg:block" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
};

export default ProductHowItWorks;
