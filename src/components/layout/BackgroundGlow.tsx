export function BackgroundGlow() {
  return (
    <div 
      className="fixed inset-0 overflow-hidden pointer-events-none z-0"
      aria-hidden="true"
    >
      {/* Top-right emerald blob */}
      <div 
        className="absolute -top-[10%] -right-[5%] w-[50%] h-[40%] rounded-full"
        style={{
          background: 'radial-gradient(ellipse, hsl(158 72% 65% / 0.18), transparent 70%)',
        }}
      />
      
      {/* Center-left cool blob */}
      <div 
        className="absolute top-[30%] -left-[8%] w-[40%] h-[40%] rounded-full"
        style={{
          background: 'radial-gradient(ellipse, hsl(200 80% 70% / 0.12), transparent 70%)',
        }}
      />
      
      {/* Bottom-right warm accent */}
      <div 
        className="absolute top-[60%] right-[0%] w-[35%] h-[35%] rounded-full"
        style={{
          background: 'radial-gradient(ellipse, hsl(170 65% 55% / 0.12), transparent 70%)',
        }}
      />

      {/* Bottom-left subtle glow */}
      <div 
        className="absolute bottom-[0%] -left-[5%] w-[30%] h-[25%] rounded-full"
        style={{
          background: 'radial-gradient(ellipse, hsl(158 60% 60% / 0.1), transparent 70%)',
        }}
      />
      
      {/* Subtle dot grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(hsl(220 25% 50%) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />
    </div>
  );
}
