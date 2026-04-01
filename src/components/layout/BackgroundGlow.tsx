export function BackgroundGlow() {
  return (
    <div 
      className="fixed inset-0 overflow-hidden pointer-events-none z-0"
      aria-hidden="true"
    >
      {/* Top-right emerald blob */}
      <div 
        className="absolute -top-[15%] -right-[10%] w-[55%] h-[45%] rounded-full"
        style={{
          background: 'radial-gradient(ellipse, hsl(158 72% 45% / 0.08), transparent 70%)',
        }}
      />
      
      {/* Center-left cool blob */}
      <div 
        className="absolute top-[25%] -left-[12%] w-[45%] h-[45%] rounded-full"
        style={{
          background: 'radial-gradient(ellipse, hsl(200 80% 55% / 0.06), transparent 70%)',
        }}
      />
      
      {/* Bottom-right warm accent */}
      <div 
        className="absolute top-[55%] right-[5%] w-[40%] h-[35%] rounded-full"
        style={{
          background: 'radial-gradient(ellipse, hsl(170 65% 40% / 0.06), transparent 70%)',
        }}
      />

      {/* Bottom-left subtle glow */}
      <div 
        className="absolute bottom-[5%] -left-[8%] w-[35%] h-[30%] rounded-full"
        style={{
          background: 'radial-gradient(ellipse, hsl(158 60% 42% / 0.05), transparent 70%)',
        }}
      />
      
      {/* Subtle dot grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: 'radial-gradient(hsl(220 25% 14%) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />
    </div>
  );
}
