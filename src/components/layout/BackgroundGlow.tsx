export function BackgroundGlow() {
  return (
    <div 
      className="fixed inset-0 overflow-hidden pointer-events-none z-0"
      aria-hidden="true"
    >
      {/* Main primary glow - top right */}
      <div 
        className="absolute -top-32 -right-32 w-[800px] h-[800px] animate-pulse-slow"
        style={{
          background: 'radial-gradient(circle at center, hsl(158 72% 38% / 0.12) 0%, hsl(158 72% 38% / 0.06) 30%, transparent 70%)',
          filter: 'blur(100px)',
        }}
      />
      
      {/* Secondary glow - bottom left */}
      <div 
        className="absolute -bottom-32 -left-32 w-[700px] h-[700px]"
        style={{
          background: 'radial-gradient(circle at center, hsl(158 72% 38% / 0.1) 0%, hsl(170 65% 32% / 0.05) 40%, transparent 70%)',
          filter: 'blur(120px)',
        }}
      />
      
      {/* Accent glow - center */}
      <div 
        className="absolute top-1/3 left-1/4 w-[500px] h-[500px]"
        style={{
          background: 'radial-gradient(circle at center, hsl(170 65% 32% / 0.06) 0%, transparent 70%)',
          filter: 'blur(140px)',
        }}
      />
      
      {/* Small accent glow - top center */}
      <div 
        className="absolute top-0 left-1/2 w-[400px] h-[400px] -translate-x-1/2"
        style={{
          background: 'radial-gradient(circle at center, hsl(158 72% 38% / 0.08) 0%, transparent 60%)',
          filter: 'blur(80px)',
        }}
      />
      
      {/* Grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `
            linear-gradient(hsl(210 40% 98% / 0.4) 1px, transparent 1px),
            linear-gradient(90deg, hsl(210 40% 98% / 0.4) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />
    </div>
  );
}
