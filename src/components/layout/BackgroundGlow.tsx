export function BackgroundGlow() {
  return (
    <div 
      className="internal-glow-layer fixed inset-0 overflow-hidden pointer-events-none z-0"
      aria-hidden="true"
      style={{
        opacity: "var(--internal-glow-layer-opacity, 1)",
        transition: "opacity 240ms ease",
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: "var(--internal-glow-backdrop)",
          filter: "blur(var(--internal-glow-blur))",
          opacity: "var(--internal-glow-opacity)",
        }}
      />

      <div
        className="absolute -top-[16%] left-[-10%] h-[68%] w-[74%]"
        style={{
          background: "var(--internal-glow-sheen)",
          filter: "blur(var(--internal-glow-sheen-blur))",
          opacity: "var(--internal-glow-sheen-opacity)",
          transform: "rotate(-10deg)",
          transformOrigin: "center",
        }}
      />

      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "var(--internal-glow-grid)",
          backgroundSize: "var(--internal-glow-grid-size)",
          maskImage: "var(--internal-glow-mask)",
          WebkitMaskImage: "var(--internal-glow-mask)",
          opacity: "var(--internal-glow-grid-opacity)",
        }}
      />
    </div>
  );
}
