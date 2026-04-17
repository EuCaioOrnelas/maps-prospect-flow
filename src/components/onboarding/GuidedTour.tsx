import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { useGuidedTour } from "@/hooks/useGuidedTour";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PADDING = 8;
const POPUP_W = 360;
const POPUP_GAP = 16;

export function GuidedTour() {
  const { isActive, currentStepIndex, steps, next, prev, finish } = useGuidedTour();
  const step = steps[currentStepIndex];
  const [rect, setRect] = useState<Rect | null>(null);
  const [tick, setTick] = useState(0);

  // Lock body scroll
  useEffect(() => {
    if (!isActive) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.classList.add("tour-active");
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.classList.remove("tour-active");
    };
  }, [isActive]);

  // Measure target element and re-measure on resize / scroll / step change
  useLayoutEffect(() => {
    if (!isActive || !step) return;
    if (!step.target) {
      setRect(null);
      return;
    }
    let timeoutId: number | undefined;
    let attempts = 0;
    const measure = () => {
      const el = document.querySelector(step.target!) as HTMLElement | null;
      if (!el) {
        attempts += 1;
        if (attempts < 30) {
          timeoutId = window.setTimeout(measure, 100);
        } else {
          setRect(null);
        }
        return;
      }
      try {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
      } catch {}
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    measure();
    const onResize = () => setTick((t) => t + 1);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [isActive, step, tick, currentStepIndex]);

  if (!isActive || !step) return null;

  const total = steps.length;
  const isLast = currentStepIndex === total - 1;
  const isFirst = currentStepIndex === 0;

  // Compute popup position
  let popupStyle: React.CSSProperties = {};
  if (!rect || step.placement === "center") {
    popupStyle = {
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: POPUP_W,
    };
  } else {
    const placement = step.placement ?? "bottom";
    const w = POPUP_W;
    if (placement === "right") {
      popupStyle = {
        top: Math.max(POPUP_GAP, rect.top + rect.height / 2 - 100),
        left: Math.min(window.innerWidth - w - POPUP_GAP, rect.left + rect.width + POPUP_GAP),
        width: w,
      };
    } else if (placement === "left") {
      popupStyle = {
        top: Math.max(POPUP_GAP, rect.top + rect.height / 2 - 100),
        left: Math.max(POPUP_GAP, rect.left - w - POPUP_GAP),
        width: w,
      };
    } else if (placement === "top") {
      popupStyle = {
        top: Math.max(POPUP_GAP, rect.top - 200 - POPUP_GAP),
        left: Math.max(POPUP_GAP, Math.min(window.innerWidth - w - POPUP_GAP, rect.left + rect.width / 2 - w / 2)),
        width: w,
      };
    } else {
      // bottom
      popupStyle = {
        top: Math.min(window.innerHeight - 240, rect.top + rect.height + POPUP_GAP),
        left: Math.max(POPUP_GAP, Math.min(window.innerWidth - w - POPUP_GAP, rect.left + rect.width / 2 - w / 2)),
        width: w,
      };
    }
  }

  // Spotlight rect (with padding)
  const spot = rect
    ? {
        top: rect.top - PADDING,
        left: rect.left - PADDING,
        width: rect.width + PADDING * 2,
        height: rect.height + PADDING * 2,
      }
    : null;

  return createPortal(
    <div className="fixed inset-0 z-[9998] pointer-events-none">
      {/* Dark overlay with hole using SVG mask */}
      <svg
        className="absolute inset-0 pointer-events-auto"
        style={{ width: "100vw", height: "100vh" }}
      >
        <defs>
          <mask id="tour-mask">
            <rect width="100%" height="100%" fill="white" />
            {spot && (
              <rect
                x={spot.left}
                y={spot.top}
                width={spot.width}
                height={spot.height}
                rx={12}
                ry={12}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(8, 12, 20, 0.72)"
          mask="url(#tour-mask)"
        />
      </svg>

      {/* Spotlight ring */}
      {spot && (
        <div
          className="absolute pointer-events-none rounded-xl ring-2 ring-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.18),0_0_60px_hsl(var(--primary)/0.45)]"
          style={{
            top: spot.top,
            left: spot.left,
            width: spot.width,
            height: spot.height,
          }}
        />
      )}

      {/* Popup card */}
      <div
        className="absolute pointer-events-auto bg-card text-card-foreground border border-border rounded-2xl shadow-2xl p-5"
        style={popupStyle}
      >
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary mb-2">
          <Sparkles size={12} />
          Passo {currentStepIndex + 1} de {total}
        </div>
        <h3 className="text-lg font-bold text-foreground mb-1.5 leading-snug">
          {step.title}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {step.body}
        </p>
      </div>

      {/* Footer navigation */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 pointer-events-auto">
        <div className="flex items-center gap-3 bg-card/95 backdrop-blur-md border border-border rounded-full pl-2 pr-2 py-2 shadow-2xl">
          <Button
            size="sm"
            variant="ghost"
            onClick={prev}
            disabled={isFirst}
            className="rounded-full gap-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <ArrowLeft size={14} />
            Voltar
          </Button>
          <div className="flex items-center gap-1.5 px-2">
            {steps.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === currentStepIndex
                    ? "bg-primary w-6"
                    : i < currentStepIndex
                    ? "bg-primary/50 w-1.5"
                    : "bg-muted-foreground/25 w-1.5"
                )}
              />
            ))}
          </div>
          <Button
            size="sm"
            onClick={isLast ? finish : next}
            className="rounded-full gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg"
          >
            {isLast ? "Concluir" : "Próximo"}
            {!isLast && <ArrowRight size={14} />}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
