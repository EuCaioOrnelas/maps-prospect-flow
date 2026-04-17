import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { useGuidedTour } from "@/hooks/useGuidedTour";
import { Button } from "@/components/ui/button";

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
  const lastScrolledStepRef = useRef<string | null>(null);

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

  // Measure target element and re-measure on resize / scroll / step change.
  // We poll the rect every animation frame for a short window so we capture
  // the FINAL position after sidebar collapse/expand transitions (300ms).
  useLayoutEffect(() => {
    if (!isActive || !step) return;
    if (!step.target) {
      setRect(null);
      lastScrolledStepRef.current = step.id;
      return;
    }

    let rafId: number | null = null;
    let pollTimeoutId: number | undefined;
    let stableTimeoutId: number | undefined;
    let attempts = 0;
    let lastSerialized = "";
    let stableFrames = 0;
    const startedAt = performance.now();

    const measure = () => {
      const el = document.querySelector(step.target!) as HTMLElement | null;
      if (!el) {
        attempts += 1;
        if (attempts < 40) {
          pollTimeoutId = window.setTimeout(() => {
            rafId = window.requestAnimationFrame(measure);
          }, 80);
        } else {
          setRect(null);
        }
        return;
      }

      const currentRect = el.getBoundingClientRect();
      const shouldScrollIntoView = lastScrolledStepRef.current !== step.id;
      const isOffscreen = currentRect.top < POPUP_GAP || currentRect.bottom > window.innerHeight - POPUP_GAP;

      if (shouldScrollIntoView && isOffscreen) {
        lastScrolledStepRef.current = step.id;
        try {
          el.scrollIntoView({ block: "center", behavior: "auto" });
        } catch {}
      } else if (shouldScrollIntoView) {
        lastScrolledStepRef.current = step.id;
      }

      const next = el.getBoundingClientRect();
      const serialized = `${Math.round(next.top)}|${Math.round(next.left)}|${Math.round(next.width)}|${Math.round(next.height)}`;

      // Always commit the latest rect so it animates smoothly toward the target
      setRect({ top: next.top, left: next.left, width: next.width, height: next.height });

      if (serialized === lastSerialized) {
        stableFrames += 1;
      } else {
        stableFrames = 0;
        lastSerialized = serialized;
      }

      // Keep polling for up to 700ms after step start, OR until we get 6 stable frames
      const elapsed = performance.now() - startedAt;
      if (elapsed < 700 && stableFrames < 6) {
        rafId = window.requestAnimationFrame(measure);
      }
    };

    rafId = window.requestAnimationFrame(measure);
    const onViewportChange = () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(measure);
    };
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);
    return () => {
      if (pollTimeoutId) window.clearTimeout(pollTimeoutId);
      if (stableTimeoutId) window.clearTimeout(stableTimeoutId);
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [isActive, step]);

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

  // Fallback dark overlay (used when there is no spotlight target — e.g. center step)
  const showFallbackOverlay = !spot;

  return createPortal(
    <div
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 2147483646 }}
    >
      {/* Fallback full overlay when no spotlight */}
      {showFallbackOverlay && (
        <div
          className="fixed inset-0 pointer-events-auto animate-in fade-in duration-300"
          style={{ background: "rgba(8, 12, 20, 0.72)" }}
        />
      )}

      {/* Spotlight: a single transparent box whose huge box-shadow paints the dark overlay.
          Because the box itself animates, the "hole" and the ring animate together — no desync. */}
      {spot && (
        <div
          className="fixed pointer-events-auto rounded-xl"
          style={{
            top: spot.top,
            left: spot.left,
            width: spot.width,
            height: spot.height,
            zIndex: 2147483646,
            boxShadow: [
              // dark overlay covering the rest of the screen
              "0 0 0 9999px rgba(8, 12, 20, 0.72)",
              // soft inner glow
              "inset 0 0 0 1px hsl(var(--primary) / 0.6)",
              // outer halo
              "0 0 0 3px hsl(var(--primary) / 0.18)",
              "0 0 40px hsl(var(--primary) / 0.35)",
            ].join(", "),
            transition:
              "top 600ms cubic-bezier(0.22, 1, 0.36, 1), left 600ms cubic-bezier(0.22, 1, 0.36, 1), width 600ms cubic-bezier(0.22, 1, 0.36, 1), height 600ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 600ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        />
      )}

      {/* Popup card */}
      <div
        key={step.id}
        className="fixed pointer-events-auto bg-card text-card-foreground border border-border rounded-2xl shadow-2xl p-5 animate-in fade-in zoom-in-95 duration-300"
        style={{ ...popupStyle, zIndex: 2147483647, transition: "top 600ms cubic-bezier(0.22, 1, 0.36, 1), left 600ms cubic-bezier(0.22, 1, 0.36, 1)" }}
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
      <div
        className="fixed bottom-6 left-1/2 -translate-x-1/2 pointer-events-auto"
        style={{ zIndex: 2147483647 }}
      >
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
          {/* Progress bar — smooth fill instead of dots */}
          <div className="relative h-1.5 w-32 rounded-full bg-muted-foreground/15 overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-primary/70 shadow-[0_0_12px_hsl(var(--primary)/0.6)]"
              style={{
                width: `${((currentStepIndex + 1) / total) * 100}%`,
                transition: "width 500ms cubic-bezier(0.65, 0, 0.35, 1)",
              }}
            />
          </div>
          <span className="text-[11px] font-semibold text-muted-foreground tabular-nums px-1 min-w-[36px] text-center">
            {currentStepIndex + 1}/{total}
          </span>
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
