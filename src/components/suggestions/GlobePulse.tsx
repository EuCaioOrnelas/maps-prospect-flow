import { useEffect, useRef } from "react";
import createGlobe from "cobe";

const MARKERS: [number, number][] = [
  [-23.55, -46.63], [-22.91, -43.17], [-15.79, -47.88], [-3.73, -38.52],
  [-30.03, -51.23], [-12.97, -38.5], [-8.05, -34.9], [-25.43, -49.27],
];

/** Globo animado (cobe) nas cores da Wiize, com marcadores no Brasil. */
export function GlobePulse({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drag = useRef<number | null>(null);
  const offset = useRef(0);
  const dragDelta = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let globe: ReturnType<typeof createGlobe> | null = null;
    let raf = 0;
    let phi = 4.4;
    const dark = document.documentElement.classList.contains("dark");

    const init = () => {
      const width = canvas.offsetWidth;
      if (!width || globe) return;
      globe = createGlobe(canvas, {
        devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        width: width * 2,
        height: width * 2,
        phi,
        theta: 0.25,
        dark: dark ? 1 : 0,
        diffuse: 1.4,
        mapSamples: 16000,
        mapBrightness: dark ? 6 : 1.4,
        baseColor: dark ? [0.25, 0.3, 0.28] : [1, 1, 1],
        markerColor: [0.1, 0.65, 0.42],
        glowColor: dark ? [0.05, 0.25, 0.16] : [0.82, 0.95, 0.88],
        markers: MARKERS.map((location) => ({ location, size: 0.06 })),
        opacity: 0.9,
      } as any);
      const animate = () => {
        if (drag.current === null) phi += 0.0035;
        globe!.update({ phi: phi + offset.current + dragDelta.current });
        raf = requestAnimationFrame(animate);
      };
      animate();
      requestAnimationFrame(() => (canvas.style.opacity = "1"));
    };

    const ro = new ResizeObserver(() => init());
    ro.observe(canvas);
    init();

    const move = (e: PointerEvent) => {
      if (drag.current !== null) dragDelta.current = (e.clientX - drag.current) / 200;
    };
    const up = () => {
      if (drag.current !== null) {
        offset.current += dragDelta.current;
        dragDelta.current = 0;
      }
      drag.current = null;
      canvas.style.cursor = "grab";
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerup", up, { passive: true });

    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
      globe?.destroy();
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, []);

  return (
    <div className={`relative aspect-square select-none ${className}`}>
      <div aria-hidden className="absolute inset-[12%] rounded-full bg-primary/20 blur-3xl" />
      <canvas
        ref={canvasRef}
        onPointerDown={(e) => {
          drag.current = e.clientX;
          e.currentTarget.style.cursor = "grabbing";
        }}
        className="relative h-full w-full rounded-full"
        style={{ opacity: 0, transition: "opacity 1.2s ease", cursor: "grab", touchAction: "none" }}
      />
    </div>
  );
}
