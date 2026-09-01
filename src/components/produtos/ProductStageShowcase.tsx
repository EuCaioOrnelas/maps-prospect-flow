import { useEffect, useRef, useState } from "react";
import { STAGE_CONTENT_HEIGHT, STAGE_DURATION } from "@/components/landing/heroStages";
import { PRODUCT_STAGES } from "./productStages";
import type { ProductVisualKey } from "@/data/products";

/** Janela "Wiize Platform" com a animação correspondente ao produto. */
export const ProductStageShowcase = ({
  visual,
  stageIndex,
  playOnce = false,
}: {
  visual: ProductVisualKey;
  /** Fixa a animação em um estágio específico do produto (usado nos blocos de features). */
  stageIndex?: number;
  /** Roda a animação do início ao fim uma única vez e para no estado final. */
  playOnce?: boolean;
}) => {
  const all = PRODUCT_STAGES[visual];
  const stages = stageIndex == null ? all : [all[stageIndex % all.length]];
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [live, setLive] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const startRef = useRef(0);
  const elapsedRef = useRef(0);
  const doneRef = useRef(false);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setProgress(0.85);
      return;
    }
    if (typeof IntersectionObserver === "undefined") {
      setLive(true);
      return;
    }
    const io = new IntersectionObserver(([e]) => setLive(e.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!live) return;
    const total = STAGE_DURATION * stages.length;
    if (playOnce && doneRef.current) return;
    startRef.current = performance.now() - elapsedRef.current;
    let raf = 0;
    const tick = (now: number) => {
      const raw = now - startRef.current;
      if (playOnce && raw >= total) {
        doneRef.current = true;
        elapsedRef.current = total;
        setIndex(stages.length - 1);
        setProgress(1);
        return;
      }
      const cycle = raw % total;
      elapsedRef.current = cycle;
      const next = Math.floor(cycle / STAGE_DURATION);
      setIndex((prev) => (prev === next ? prev : next));
      setProgress((cycle % STAGE_DURATION) / STAGE_DURATION);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [live, stages.length, playOnce]);

  const stage = stages[Math.min(index, stages.length - 1)];
  const Render = stage.render;

  return (
    <div ref={frameRef} className="pv-float relative w-full max-w-[30rem]">
      <div className="absolute -inset-4 rounded-3xl bg-primary/8 soft-glow" aria-hidden />
      <div className="relative rounded-2xl border border-border/50 bg-card p-4 shadow-card sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-warning/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-success/60" />
          </div>
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Wiize Platform
          </span>
        </div>

        <div className="rounded-xl bg-background p-3 sm:p-4">
          <div className="mb-3 flex items-center gap-1">
            {stages.map((s, i) => (
              <button
                key={s.label}
                type="button"
                title={s.label}
                onClick={() => {
                  elapsedRef.current = i * STAGE_DURATION;
                  startRef.current = performance.now() - elapsedRef.current;
                  setIndex(i);
                  setProgress(0);
                }}
                className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary/60 transition-colors hover:bg-secondary/80"
              >
                <div
                  className={`h-full rounded-full ${i <= index ? "bg-primary" : "bg-transparent"}`}
                  style={{ width: i < index ? "100%" : i === index ? `${progress * 100}%` : "0%" }}
                />
              </button>
            ))}
          </div>

          <div className="mb-3 flex items-center gap-2 px-1">
            <stage.icon size={13} className={stage.color} />
            <span className={`text-[12px] font-semibold ${stage.color}`}>{stage.label}</span>
            <span className="ml-auto text-[11px] text-muted-foreground">
              {index + 1}/{stages.length}
            </span>
          </div>

          <div
            key={index}
            className="overflow-hidden"
            style={{ height: STAGE_CONTENT_HEIGHT, animation: "fadeSlideUp 0.4s ease-out" }}
          >
            <Render progress={progress} />
          </div>
        </div>

        <div className="absolute bottom-2 left-4 text-[10px] font-medium tracking-wide text-muted-foreground/40">
          @wiizebrasil
        </div>
      </div>
      <style>{`@keyframes fadeSlideUp { from { opacity: 0; transform: translateY(8px);} to {opacity:1; transform: translateY(0);} }`}</style>
    </div>
  );
};

export default ProductStageShowcase;
