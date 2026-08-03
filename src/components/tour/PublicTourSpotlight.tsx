import { useLayoutEffect, useRef, useState } from "react";

export type Placement = "top" | "bottom" | "left" | "right" | "center";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PADDING = 8;
const POPUP_W = 400;
const GAP = 18;

export function usePublicSpotlight(selector: string | undefined, deps: unknown[]) {
  const [rect, setRect] = useState<Rect | null>(null);

  useLayoutEffect(() => {
    if (!selector) {
      setRect(null);
      return;
    }
    let raf: number | null = null;
    let attempts = 0;
    const measure = () => {
      const el = document.querySelector(selector) as HTMLElement | null;
      if (!el) {
        attempts += 1;
        if (attempts < 60) raf = window.requestAnimationFrame(measure);
        return;
      }
      const r = el.getBoundingClientRect();
      if (r.top < GAP || r.bottom > window.innerHeight - GAP) {
        try {
          el.scrollIntoView({ block: "center", behavior: "auto" });
        } catch {}
      }
      const n = el.getBoundingClientRect();
      setRect((prev) =>
        prev && Math.round(prev.top) === Math.round(n.top) && Math.round(prev.left) === Math.round(n.left)
          ? prev
          : { top: n.top, left: n.left, width: n.width, height: n.height }
      );
      if (attempts < 40) {
        attempts += 1;
        raf = window.requestAnimationFrame(measure);
      }
    };
    raf = window.requestAnimationFrame(measure);
    const onChange = () => {
      if (raf) window.cancelAnimationFrame(raf);
      attempts = 0;
      raf = window.requestAnimationFrame(measure);
    };
    window.addEventListener("resize", onChange);
    window.addEventListener("scroll", onChange, true);
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", onChange);
      window.removeEventListener("scroll", onChange, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return rect;
}

export function SpotlightRing({ rect }: { rect: Rect | null }) {
  if (!rect) {
    return (
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: "hsl(var(--foreground) / 0.32)", zIndex: 60 }}
      />
    );
  }
  return (
    <div
      className="fixed pointer-events-none rounded-[24px]"
      style={{
        top: rect.top - PADDING,
        left: rect.left - PADDING,
        width: rect.width + PADDING * 2,
        height: rect.height + PADDING * 2,
        zIndex: 60,
        boxShadow: [
          "0 0 0 9999px hsl(var(--foreground) / 0.32)",
          "inset 0 0 0 2px hsl(var(--primary))",
          "0 0 0 4px hsl(var(--primary) / 0.18)",
          "0 0 32px hsl(var(--primary) / 0.35)",
        ].join(", "),
        transition: "all 460ms cubic-bezier(0.2, 0.8, 0.2, 1)",
      }}
    />
  );
}

export function usePopupPosition(
  rect: Rect | null,
  placement: Placement,
  popupRef: React.RefObject<HTMLDivElement>
): React.CSSProperties {
  const [size, setSize] = useState({ width: POPUP_W, height: 200 });
  const raf = useRef<number | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const node = popupRef.current;
      if (!node) return;
      const w = Math.round(node.offsetWidth || POPUP_W);
      const h = Math.round(node.offsetHeight || 200);
      setSize((prev) => (prev.width === w && prev.height === h ? prev : { width: w, height: h }));
    };
    raf.current = window.requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    return () => {
      if (raf.current) window.cancelAnimationFrame(raf.current);
      window.removeEventListener("resize", measure);
    };
  });

  if (!rect || placement === "center") {
    return { top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: POPUP_W };
  }

  const pw = Math.min(size.width || POPUP_W, window.innerWidth - 32);
  const ph = size.height || 200;
  const spot = {
    top: rect.top - PADDING,
    left: rect.left - PADDING,
    right: rect.left + rect.width + PADDING,
    bottom: rect.top + rect.height + PADDING,
  };
  const clampX = (v: number) => Math.max(GAP, Math.min(window.innerWidth - GAP - pw, v));
  const clampY = (v: number) => Math.max(GAP, Math.min(window.innerHeight - GAP - ph - 80, v));

  const fits = (p: Exclude<Placement, "center">) => {
    if (p === "top") return spot.top - ph - GAP > GAP;
    if (p === "bottom") return spot.bottom + ph + GAP < window.innerHeight - 96;
    if (p === "right") return spot.right + pw + GAP < window.innerWidth - GAP;
    return spot.left - pw - GAP > GAP;
  };

  const order: Record<Exclude<Placement, "center">, Exclude<Placement, "center">[]> = {
    top: ["top", "bottom", "right", "left"],
    bottom: ["bottom", "top", "right", "left"],
    right: ["right", "left", "bottom", "top"],
    left: ["left", "right", "bottom", "top"],
  };
  const resolved = order[placement].find(fits) ?? placement;

  if (resolved === "top")
    return { top: spot.top - ph - GAP, left: clampX(rect.left + rect.width / 2 - pw / 2), width: pw };
  if (resolved === "bottom")
    return { top: spot.bottom + GAP, left: clampX(rect.left + rect.width / 2 - pw / 2), width: pw };
  if (resolved === "right")
    return { top: clampY(rect.top + rect.height / 2 - ph / 2), left: spot.right + GAP, width: pw };
  return { top: clampY(rect.top + rect.height / 2 - ph / 2), left: spot.left - pw - GAP, width: pw };
}
