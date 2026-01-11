export function BackgroundGlow() {
  return (
    <>
      {/* Background glow effects - positioned absolutely within the page */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
        {/* Main primary glow - top right */}
        <div 
          className="absolute top-0 right-0 w-[600px] h-[600px]"
          style={{
            background: 'radial-gradient(circle, hsl(158 72% 38% / 0.15) 0%, transparent 70%)',
            transform: 'translate(30%, -30%)',
            filter: 'blur(100px)',
          }}
        />
        
        {/* Secondary glow - bottom left */}
        <div 
          className="absolute bottom-0 left-0 w-[500px] h-[500px]"
          style={{
            background: 'radial-gradient(circle, hsl(158 72% 38% / 0.12) 0%, transparent 70%)',
            transform: 'translate(-30%, 30%)',
            filter: 'blur(120px)',
          }}
        />
        
        {/* Accent glow - center left */}
        <div 
          className="absolute top-1/2 left-0 w-[400px] h-[400px]"
          style={{
            background: 'radial-gradient(circle, hsl(170 65% 32% / 0.1) 0%, transparent 70%)',
            transform: 'translate(-50%, -50%)',
            filter: 'blur(100px)',
          }}
        />
        
        {/* Small accent glow - top center */}
        <div 
          className="absolute top-20 left-1/2 w-[300px] h-[300px]"
          style={{
            background: 'radial-gradient(circle, hsl(158 72% 38% / 0.1) 0%, transparent 70%)',
            transform: 'translateX(-50%)',
            filter: 'blur(80px)',
          }}
        />
        
        {/* Subtle grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `
              linear-gradient(hsl(210 40% 98%) 1px, transparent 1px),
              linear-gradient(90deg, hsl(210 40% 98%) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />
      </div>
    </>
  );
}
