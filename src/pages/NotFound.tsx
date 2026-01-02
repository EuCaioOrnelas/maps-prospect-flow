import { Link, useLocation } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { SEO } from "@/components/SEO";
import { motion, useAnimationFrame } from "framer-motion";

// Simplified Astronaut SVG - lighter weight
const AstronautSVG = () => (
  <svg viewBox="0 0 100 120" className="w-full h-full" style={{ filter: "drop-shadow(0 0 15px hsl(var(--primary) / 0.3))" }}>
    <defs>
      <linearGradient id="suitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fff" />
        <stop offset="100%" stopColor="#ccc" />
      </linearGradient>
      <linearGradient id="visorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="hsl(var(--primary))" />
        <stop offset="50%" stopColor="hsl(var(--secondary))" />
        <stop offset="100%" stopColor="#1a1a2e" />
      </linearGradient>
      <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#ffd700" />
        <stop offset="100%" stopColor="#ff8c00" />
      </linearGradient>
    </defs>
    
    {/* Backpack - where cord attaches */}
    <rect x="35" y="45" width="30" height="35" rx="5" fill="#777" stroke="#555" strokeWidth="1.5" />
    <rect x="40" y="50" width="8" height="10" rx="2" fill="#444" />
    <rect x="40" y="62" width="8" height="8" rx="2" fill="#333" />
    
    {/* Cord attachment point indicator */}
    <circle cx="50" cy="80" r="4" fill="hsl(var(--primary))" opacity="0.8" />
    
    {/* Body */}
    <ellipse cx="50" cy="65" rx="25" ry="28" fill="url(#suitGrad)" stroke="#999" strokeWidth="1.5" />
    
    {/* Chest panel */}
    <rect x="42" y="55" width="16" height="12" rx="2" fill="#1a1a2e" />
    <circle cx="47" cy="60" r="2" fill="#ff4444" />
    <circle cx="53" cy="60" r="2" fill="#44ff44" />
    
    {/* Arms */}
    <ellipse cx="22" cy="62" rx="10" ry="14" fill="url(#suitGrad)" stroke="#999" strokeWidth="1.5" />
    <circle cx="18" cy="74" r="6" fill="url(#suitGrad)" stroke="#999" strokeWidth="1.5" />
    <ellipse cx="78" cy="62" rx="10" ry="14" fill="url(#suitGrad)" stroke="#999" strokeWidth="1.5" />
    <circle cx="82" cy="74" r="6" fill="url(#suitGrad)" stroke="#999" strokeWidth="1.5" />
    
    {/* Gold arm rings */}
    <ellipse cx="22" cy="52" rx="8" ry="2" fill="url(#goldGrad)" />
    <ellipse cx="78" cy="52" rx="8" ry="2" fill="url(#goldGrad)" />
    
    {/* Legs */}
    <ellipse cx="38" cy="98" rx="9" ry="14" fill="url(#suitGrad)" stroke="#999" strokeWidth="1.5" />
    <ellipse cx="36" cy="112" rx="8" ry="5" fill="#666" stroke="#555" strokeWidth="1.5" />
    <ellipse cx="62" cy="98" rx="9" ry="14" fill="url(#suitGrad)" stroke="#999" strokeWidth="1.5" />
    <ellipse cx="64" cy="112" rx="8" ry="5" fill="#666" stroke="#555" strokeWidth="1.5" />
    
    {/* Gold leg rings */}
    <ellipse cx="38" cy="88" rx="7" ry="2" fill="url(#goldGrad)" />
    <ellipse cx="62" cy="88" rx="7" ry="2" fill="url(#goldGrad)" />
    
    {/* Helmet */}
    <circle cx="50" cy="28" r="22" fill="url(#suitGrad)" stroke="#999" strokeWidth="2" />
    <ellipse cx="50" cy="48" rx="16" ry="4" fill="url(#goldGrad)" />
    
    {/* Visor */}
    <ellipse cx="50" cy="28" rx="15" ry="13" fill="url(#visorGrad)" />
    <ellipse cx="44" cy="24" rx="5" ry="3" fill="white" opacity="0.4" />
    
    {/* Antenna */}
    <line x1="66" y1="14" x2="74" y2="6" stroke="#888" strokeWidth="2" strokeLinecap="round" />
    <circle cx="75" cy="5" r="3" fill="hsl(var(--primary))" />
  </svg>
);

// Star component
const Star = ({ x, y, delay }: { x: number; y: number; delay: number }) => (
  <motion.div
    className="absolute w-1 h-1 bg-white rounded-full"
    style={{ left: `${x}%`, top: `${y}%` }}
    animate={{ scale: [0, 1, 0], opacity: [0, 0.8, 0] }}
    transition={{ duration: 2.5, repeat: Infinity, delay }}
  />
);

const NotFound = () => {
  const location = useLocation();
  const cardRef = useRef<HTMLDivElement>(null);
  const [astronautPos, setAstronautPos] = useState({ x: 0, y: -120 });
  const timeRef = useRef(0);

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  // Smooth floating animation using requestAnimationFrame via framer-motion
  useAnimationFrame((time) => {
    timeRef.current = time / 1000; // Convert to seconds
    const t = timeRef.current;
    
    // Gentle figure-8 pattern
    const x = Math.sin(t * 0.3) * 80;
    const y = Math.sin(t * 0.4) * 30 - 140;
    
    setAstronautPos({ x, y });
  });

  // Memoized stars
  const stars = useMemo(() => 
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 3,
    })), 
  []);

  // Calculate cord path from astronaut to card
  const cordPath = useMemo(() => {
    const startX = astronautPos.x;
    const startY = astronautPos.y + 60; // Bottom of astronaut (backpack)
    const endX = 0;
    const endY = 0; // Top of card
    
    // Bezier curve with some slack
    const midX = (startX + endX) / 2 + Math.sin(timeRef.current * 0.5) * 20;
    const midY = (startY + endY) / 2 + 30;
    
    return `M ${startX} ${startY} Q ${midX} ${midY} ${endX} ${endY}`;
  }, [astronautPos]);

  return (
    <>
      <SEO 
        title="Página não encontrada"
        description="A página que você está procurando não existe ou foi movida."
        noIndex
      />
      <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-hidden relative">
        {/* Stars */}
        {stars.map((star) => (
          <Star key={star.id} x={star.x} y={star.y} delay={star.delay} />
        ))}

        {/* Background orbs - simplified */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div 
            className="absolute w-[400px] h-[400px] rounded-full bg-primary/15 blur-[100px] animate-pulse"
            style={{ top: "5%", left: "10%" }}
          />
          <div 
            className="absolute w-[300px] h-[300px] rounded-full bg-secondary/20 blur-[80px] animate-pulse"
            style={{ bottom: "10%", right: "10%", animationDelay: "1s" }}
          />
        </div>
        
        <div className="text-center relative z-10 max-w-lg w-full flex flex-col items-center">
          <motion.div 
            className="mb-6"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Logo size="lg" />
          </motion.div>

          {/* Astronaut floating freely with cord */}
          <div className="relative w-full h-40 mb-4">
            {/* Cord SVG - connects astronaut to card */}
            <svg 
              className="absolute inset-0 w-full h-full overflow-visible pointer-events-none"
              style={{ zIndex: 5 }}
            >
              <motion.path
                d={cordPath}
                stroke="hsl(var(--primary))"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                opacity="0.6"
                style={{
                  transform: "translate(50%, 100%)",
                }}
              />
              {/* Cord glow */}
              <motion.path
                d={cordPath}
                stroke="hsl(var(--primary))"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                opacity="0.15"
                style={{
                  transform: "translate(50%, 100%)",
                }}
              />
            </svg>
            
            {/* Floating astronaut */}
            <motion.div
              className="absolute w-24 h-28 sm:w-28 sm:h-32"
              style={{
                left: "50%",
                top: "50%",
                x: astronautPos.x,
                y: astronautPos.y,
                translateX: "-50%",
                translateY: "-50%",
                zIndex: 10,
              }}
              animate={{
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <AstronautSVG />
            </motion.div>
          </div>

          {/* Content card with glassmorphism */}
          <motion.div
            ref={cardRef}
            className="glass rounded-3xl p-6 sm:p-8 backdrop-blur-xl border border-white/10 shadow-2xl w-full relative"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            {/* Cord anchor point */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-primary/50 border-2 border-primary" />
            
            {/* 404 text */}
            <motion.h1
              className="text-[70px] sm:text-[90px] font-display font-black text-transparent bg-clip-text bg-gradient-to-br from-primary via-primary/80 to-secondary leading-none mb-2"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, type: "spring", stiffness: 100 }}
              style={{ textShadow: "0 0 60px hsl(var(--primary) / 0.4)" }}
            >
              404
            </motion.h1>

            <motion.div
              className="space-y-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <h2 className="font-display text-lg sm:text-xl font-bold text-foreground">
                Perdido no espaço?
              </h2>
              <p className="text-muted-foreground text-sm">
                Nosso astronauta também está procurando essa página, mas parece que ela não existe.
              </p>
            </motion.div>
            
            <motion.div 
              className="flex flex-col sm:flex-row gap-3 justify-center mt-5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <Button
                variant="outline"
                size="lg"
                asChild
                className="h-10 px-4 text-sm"
              >
                <Link to="javascript:history.back()">
                  <ArrowLeft size={16} className="mr-2" />
                  Voltar
                </Link>
              </Button>
              <Button
                variant="hero"
                size="lg"
                asChild
                className="h-10 px-4 text-sm"
              >
                <Link to="/">
                  <Home size={16} className="mr-2" />
                  Ir para Home
                </Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default NotFound;
