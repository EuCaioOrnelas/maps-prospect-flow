import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, Check, ChevronRight, Headphones, Kanban, Rocket, Search, Send, Sparkles, Zap } from "lucide-react";
import { useGuidedTour } from "@/hooks/useGuidedTour";
import { Button } from "@/components/ui/button";
import { useConfetti } from "@/components/ui/confetti";
import logoIconNew from "@/assets/logo-icon-new.png";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PADDING = 8;
const POPUP_W = 400;
const POPUP_GAP = 16;

export function GuidedTour() {
  const { isActive, currentStepIndex, steps, direction, next, prev, finish } = useGuidedTour();
  const step = steps[currentStepIndex];
  const hideOnLoad = !!step?.hideSpotlightWhileTargetLoads && direction === "next";
  const [rect, setRect] = useState<Rect | null>(null);
  const [popupAnchorRect, setPopupAnchorRect] = useState<Rect | null>(null);
  const lastScrolledStepRef = useRef<string | null>(null);

  // Lock body + html scroll while tour is active
  useEffect(() => {
    if (!isActive) return;
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.body.classList.add("tour-active");
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
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
      setPopupAnchorRect(null);
      lastScrolledStepRef.current = step.id;
      return;
    }

    if (step.hideSpotlightWhileTargetLoads) {
      setRect(null);
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
        if (step.hideSpotlightWhileTargetLoads) {
          setRect(null);
        }
        attempts += 1;
        if (attempts < 60) {
          // Keep the previous spotlight visible while we wait for the new target
          // to appear — prevents the "focus on nothing" flicker between steps.
          pollTimeoutId = window.setTimeout(() => {
            rafId = window.requestAnimationFrame(measure);
          }, 80);
        }
        return;
      }

      const currentRect = el.getBoundingClientRect();
      const shouldScrollIntoView = lastScrolledStepRef.current !== step.id;
      const isOffscreen = currentRect.top < POPUP_GAP || currentRect.bottom > window.innerHeight - POPUP_GAP;

      if (step.keepViewportTop) {
        if (window.scrollY !== 0) {
          window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        }
        if (shouldScrollIntoView) {
          lastScrolledStepRef.current = step.id;
        }
      } else if (shouldScrollIntoView && isOffscreen) {
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
      setPopupAnchorRect({ top: next.top, left: next.left, width: next.width, height: next.height });

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
  const popupRect = rect ?? (step.hideSpotlightWhileTargetLoads ? popupAnchorRect : null);

  // Compute popup position
  let popupStyle: React.CSSProperties = {};
  if (!popupRect || step.placement === "center") {
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
        top: Math.max(POPUP_GAP, popupRect.top + popupRect.height / 2 - 100),
        left: Math.min(window.innerWidth - w - POPUP_GAP, popupRect.left + popupRect.width + POPUP_GAP),
        width: w,
      };
    } else if (placement === "left") {
      popupStyle = {
        top: Math.max(POPUP_GAP, popupRect.top + popupRect.height / 2 - 100),
        left: Math.max(POPUP_GAP, popupRect.left - w - POPUP_GAP),
        width: w,
      };
    } else if (placement === "top") {
      popupStyle = {
        top: Math.max(POPUP_GAP, popupRect.top - 200 - POPUP_GAP),
        left: Math.max(POPUP_GAP, Math.min(window.innerWidth - w - POPUP_GAP, popupRect.left + popupRect.width / 2 - w / 2)),
        width: w,
      };
    } else {
      // bottom
      popupStyle = {
        top: Math.min(window.innerHeight - 240, popupRect.top + popupRect.height + POPUP_GAP),
        left: Math.max(POPUP_GAP, Math.min(window.innerWidth - w - POPUP_GAP, popupRect.left + popupRect.width / 2 - w / 2)),
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
          style={{ background: isLast ? "rgba(6, 10, 16, 0.78)" : "rgba(8, 12, 20, 0.55)" }}
        />
      )}

      {/* Spotlight */}
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
              "0 0 0 9999px rgba(8, 12, 20, 0.78)",
              "inset 0 0 0 1px hsl(var(--primary) / 0.6)",
              "0 0 0 3px hsl(var(--primary) / 0.18)",
              "0 0 40px hsl(var(--primary) / 0.35)",
            ].join(", "),
            transition:
              "top 480ms cubic-bezier(0.2, 0.8, 0.2, 1), left 480ms cubic-bezier(0.2, 0.8, 0.2, 1), width 480ms cubic-bezier(0.2, 0.8, 0.2, 1), height 480ms cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 480ms cubic-bezier(0.2, 0.8, 0.2, 1)",
          }}
        />
      )}

      {isLast ? (
        <FinalStep title={step.title} body={step.body} onFinish={finish} />
      ) : step.id === "welcome" ? (
        <WelcomeStep title={step.title} body={step.body} onStart={next} />
      ) : (
        <>
          <div
            className="fixed pointer-events-auto bg-card text-card-foreground border border-border rounded-2xl shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-300"
            style={{ ...popupStyle, zIndex: 2147483647, transition: "top 480ms cubic-bezier(0.2, 0.8, 0.2, 1), left 480ms cubic-bezier(0.2, 0.8, 0.2, 1)" }}
          >
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary mb-2.5">
              <Sparkles size={13} />
              Passo {currentStepIndex + 1} de {total}
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2 leading-snug">
              {step.title}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {step.body}
            </p>
          </div>

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
                onClick={next}
                className="rounded-full gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg"
              >
                Próximo
                <ArrowRight size={14} />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>,
    document.body
  );
}

interface FinalStepProps {
  title: string;
  body: string;
  onFinish: () => void;
}

function FinalStep({ title, body, onFinish }: FinalStepProps) {
  const { fireRealistic, fireSides } = useConfetti();
  const [celebrated, setCelebrated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => fireSides(), 250);
    return () => clearTimeout(t);
  }, [fireSides]);

  const handleFinish = () => {
    if (celebrated) {
      onFinish();
      return;
    }
    setCelebrated(true);
    // Fire confetti and close the tour immediately so the user sees the full burst
    fireRealistic();
    setTimeout(() => fireSides(), 150);
    onFinish();
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center px-4 pointer-events-auto"
      style={{ zIndex: 2147483647 }}
    >
      <div className="relative w-full max-w-md bg-card text-card-foreground border border-border rounded-3xl shadow-2xl p-8 sm:p-10 text-center animate-in fade-in zoom-in-95 duration-500 overflow-hidden">
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[420px] h-[420px] rounded-full opacity-40 pointer-events-none blur-3xl"
          style={{
            background:
              "radial-gradient(circle, hsl(var(--primary) / 0.55) 0%, transparent 65%)",
          }}
        />

        <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center">
          <span
            className="absolute inset-0 rounded-full bg-primary/20 animate-ping"
            style={{ animationDuration: "1.8s" }}
          />
          <span className="absolute inset-2 rounded-full bg-primary/15" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 shadow-[0_10px_40px_hsl(var(--primary)/0.55)]">
            <Check
              size={40}
              strokeWidth={3}
              className="text-primary-foreground animate-in zoom-in-50 duration-500"
            />
          </div>
        </div>

        <div className="relative">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary mb-3">
            <Sparkles size={12} />
            Onboarding concluído
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold text-foreground mb-3 leading-tight">
            {title}
          </h3>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-8">
            {body}
          </p>

          <Button
            size="xl"
            onClick={handleFinish}
            className="w-full gap-2 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:shadow-[0_12px_40px_hsl(var(--primary)/0.5)] hover:-translate-y-0.5 transition-all duration-300 text-base font-semibold"
          >
            <Rocket size={20} />
            Escalar minha operação
          </Button>

          <button
            onClick={onFinish}
            className="mt-4 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

interface WelcomeStepProps {
  title: string;
  body: string;
  onStart: () => void;
}

function WelcomeStep({ title, body, onStart }: WelcomeStepProps) {
  const pillars = [
    { label: "Captação", icon: Search },
    { label: "Prospecção", icon: Send },
    { label: "Atendimento", icon: Headphones },
    { label: "Gestão", icon: Kanban },
  ];

  return (
    <div
      className="fixed inset-0 flex items-center justify-center px-4 pointer-events-auto"
      style={{ zIndex: 2147483647 }}
    >
      <div className="relative w-full max-w-xl bg-card text-card-foreground border border-border rounded-3xl shadow-2xl p-8 sm:p-10 text-center animate-in fade-in zoom-in-95 duration-500 overflow-hidden">
        {/* Decorative gradient halo */}
        <div
          className="absolute -top-40 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full opacity-50 pointer-events-none blur-3xl"
          style={{
            background:
              "radial-gradient(circle, hsl(var(--primary) / 0.45) 0%, transparent 65%)",
          }}
        />

        {/* Logo with halo — no inner card so PNG background doesn't clash */}
        <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center">
          <span
            className="absolute inset-0 rounded-full bg-primary/15 animate-ping"
            style={{ animationDuration: "2.4s" }}
          />
          <span className="absolute inset-2 rounded-full bg-primary/10 blur-md" />
          <img
            src={logoIconNew}
            alt="Wiize"
            className="relative h-20 w-20 object-contain rounded-2xl drop-shadow-[0_10px_30px_hsl(var(--primary)/0.45)] animate-in zoom-in-50 duration-500"
          />
        </div>

        <div className="relative">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary mb-3">
            <Sparkles size={12} />
            Sua operação comercial
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold text-foreground mb-3 leading-tight">
            {title}
          </h3>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-8 max-w-md mx-auto">
            {body}
          </p>

          {/* Funnel pillars with arrows */}
          <div className="flex items-stretch justify-center gap-1.5 mb-8 flex-wrap sm:flex-nowrap">
            {pillars.map((p, idx) => {
              const Icon = p.icon;
              return (
                <div key={p.label} className="flex items-center gap-1.5">
                  <div
                    className="flex flex-col items-center justify-center gap-2 px-3 py-3 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 min-w-[88px] animate-in fade-in slide-in-from-bottom-2 duration-500"
                    style={{ animationDelay: `${idx * 120}ms`, animationFillMode: "backwards" }}
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                      <Icon size={16} strokeWidth={2.2} />
                    </div>
                    <div className="flex flex-col items-center leading-tight">
                      <span className="text-[9px] font-bold text-primary tabular-nums tracking-wider">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <span className="text-xs font-semibold text-foreground mt-0.5">
                        {p.label}
                      </span>
                    </div>
                  </div>
                  {idx < pillars.length - 1 && (
                    <ChevronRight
                      size={18}
                      className="text-primary/50 shrink-0 hidden sm:block animate-in fade-in duration-500"
                      style={{ animationDelay: `${idx * 120 + 60}ms`, animationFillMode: "backwards" }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <Button
            size="xl"
            onClick={onStart}
            className="w-full gap-2 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:shadow-[0_12px_40px_hsl(var(--primary)/0.5)] hover:-translate-y-0.5 transition-all duration-300 text-base font-semibold"
          >
            <Zap size={20} />
            Começar tour guiado
          </Button>
        </div>
      </div>
    </div>
  );
}
