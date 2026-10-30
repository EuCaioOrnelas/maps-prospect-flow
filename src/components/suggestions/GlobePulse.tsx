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
    let phi = 3.3;
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
        diffuse: 1.2,
        mapSamples: 12000,
        mapBrightness: dark ? 4 : 2.2,
        baseColor: dark ? [0.3, 0.3, 0.3] : [1, 1, 1],
        markerColor: dark ? [0.85, 0.85, 0.85] : [0.15, 0.15, 0.15],
        glowColor: dark ? [0.18, 0.18, 0.18] : [0.92, 0.92, 0.92],
        markers: [],
        opacity: 0.85,
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
