/** Esfera clean (sem pontos), em tons neutros, para o topo da Wiize Evolui. */
export function GlobePulse({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={`relative aspect-square select-none ${className}`}>
      <div
        className="absolute inset-0 rounded-full border border-border/60"
        style={{
          background:
            "radial-gradient(circle at 32% 28%, hsl(var(--background)) 0%, hsl(var(--muted)) 45%, hsl(var(--muted-foreground) / 0.25) 100%)",
          boxShadow:
            "inset -40px -50px 90px hsl(var(--foreground) / 0.08), 0 40px 80px -30px hsl(var(--foreground) / 0.18)",
        }}
      />
      <div
        className="absolute inset-[6%] rounded-full opacity-60"
        style={{
          background:
            "radial-gradient(circle at 30% 25%, hsl(var(--background) / 0.9) 0%, transparent 40%)",
        }}
      />
    </div>
  );
}
