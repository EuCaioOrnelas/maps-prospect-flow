import { useTheme } from "@/contexts/ThemeContext";

export function BackgroundGlow() {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";

  return (
    <div 
      className="fixed inset-0 overflow-hidden pointer-events-none z-0"
      aria-hidden="true"
    >
      <div
        className="absolute inset-0"
        style={{
          background: isLight
            ? "radial-gradient(circle at 18% 22%, hsl(158 58% 92% / 0.9) 0%, transparent 22%), radial-gradient(circle at 82% 16%, hsl(200 72% 92% / 0.75) 0%, transparent 24%), radial-gradient(circle at 78% 72%, hsl(160 62% 93% / 0.85) 0%, transparent 26%), radial-gradient(circle at 30% 82%, hsl(45 100% 95% / 0.65) 0%, transparent 18%)"
            : "radial-gradient(circle at 18% 22%, hsl(158 72% 38% / 0.16) 0%, transparent 24%), radial-gradient(circle at 82% 16%, hsl(200 80% 55% / 0.14) 0%, transparent 26%), radial-gradient(circle at 78% 72%, hsl(170 65% 40% / 0.14) 0%, transparent 28%), radial-gradient(circle at 30% 82%, hsl(158 60% 42% / 0.1) 0%, transparent 20%)",
          filter: isLight ? "blur(28px)" : "blur(48px)",
        }}
      />

      <div
        className="absolute inset-0"
        style={{
          backgroundImage: isLight
            ? "radial-gradient(hsl(158 18% 78% / 0.45) 1px, transparent 1px)"
            : "radial-gradient(hsl(210 40% 98% / 0.08) 1px, transparent 1px)",
          backgroundSize: isLight ? "26px 26px" : "24px 24px",
          maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.45), rgba(0,0,0,0.18))",
          WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,0.45), rgba(0,0,0,0.18))",
          opacity: isLight ? 0.32 : 0.18,
        }}
      />
    </div>
  );
}
