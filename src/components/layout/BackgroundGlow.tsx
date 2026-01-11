export function BackgroundGlow() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Main primary glow - top right */}
      <div 
        className="absolute top-0 right-0 w-[600px] h-[600px] opacity-30"
        style={{
          background: 'radial-gradient(circle, hsl(var(--primary) / 0.4) 0%, transparent 70%)',
          transform: 'translate(30%, -30%)',
          filter: 'blur(80px)',
        }}
      />
      
      {/* Secondary glow - bottom left */}
      <div 
        className="absolute bottom-0 left-0 w-[500px] h-[500px] opacity-20"
        style={{
          background: 'radial-gradient(circle, hsl(var(--primary) / 0.3) 0%, transparent 70%)',
          transform: 'translate(-30%, 30%)',
          filter: 'blur(100px)',
        }}
      />
      
      {/* Accent glow - center left */}
      <div 
        className="absolute top-1/2 left-0 w-[400px] h-[400px] opacity-15"
        style={{
          background: 'radial-gradient(circle, hsl(170 65% 32% / 0.4) 0%, transparent 70%)',
          transform: 'translate(-50%, -50%)',
          filter: 'blur(80px)',
        }}
      />
      
      {/* Small accent glow - top center */}
      <div 
        className="absolute top-20 left-1/2 w-[300px] h-[300px] opacity-10"
        style={{
          background: 'radial-gradient(circle, hsl(var(--primary) / 0.5) 0%, transparent 70%)',
          transform: 'translateX(-50%)',
          filter: 'blur(60px)',
        }}
      />
      
      {/* Subtle grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />
    </div>
  );
}
