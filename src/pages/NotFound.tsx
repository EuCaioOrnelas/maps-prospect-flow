import { Link, useLocation } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { SEO } from "@/components/SEO";
import { motion } from "framer-motion";

// Animated Astronaut Component with cord
const FloatingAstronaut = ({ showCord = false }: { showCord?: boolean }) => {
  return (
    <motion.div
      className="relative w-40 h-40 sm:w-52 sm:h-52"
      animate={{
        y: [0, -15, 0],
        rotate: [0, 3, -3, 0],
      }}
      transition={{
        duration: 5,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      <svg viewBox="0 0 200 200" className="w-full h-full" style={{ filter: "drop-shadow(0 0 20px hsl(var(--primary) / 0.4))" }}>
        <defs>
          {/* Enhanced gradients for more vibrant look */}
          <radialGradient id="helmetGlow" cx="50%" cy="30%" r="60%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.5" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="suitGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="50%" stopColor="#e8e8e8" />
            <stop offset="100%" stopColor="#d0d0d0" />
          </linearGradient>
          <linearGradient id="suitShadow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f5f5f5" />
            <stop offset="100%" stopColor="#b8b8b8" />
          </linearGradient>
          <linearGradient id="visorGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="40%" stopColor="hsl(var(--secondary))" />
            <stop offset="100%" stopColor="#1a1a2e" />
          </linearGradient>
          <linearGradient id="goldAccent" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffd700" />
            <stop offset="100%" stopColor="#ff8c00" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Backpack */}
        <rect
          x="72"
          y="78"
          width="56"
          height="65"
          rx="8"
          fill="#8a8a8a"
          stroke="#666"
          strokeWidth="2"
        />
        <rect x="78" y="85" width="18" height="22" rx="4" fill="#555" />
        <rect x="78" y="112" width="18" height="18" rx="4" fill="#444" />
        {/* Backpack vents */}
        <rect x="100" y="88" width="20" height="3" rx="1" fill="#333" />
        <rect x="100" y="94" width="20" height="3" rx="1" fill="#333" />
        <rect x="100" y="100" width="20" height="3" rx="1" fill="#333" />
        
        {/* Body */}
        <ellipse
          cx="100"
          cy="118"
          rx="42"
          ry="48"
          fill="url(#suitGradient)"
          stroke="#999"
          strokeWidth="2"
        />
        
        {/* Chest details */}
        <rect x="88" y="85" width="24" height="60" rx="6" fill="url(#suitShadow)" opacity="0.5" />
        
        {/* NASA-style logo area */}
        <ellipse cx="100" cy="95" rx="12" ry="8" fill="hsl(var(--primary))" opacity="0.8" />
        
        {/* Control panel on chest */}
        <rect x="82" y="108" width="36" height="24" rx="4" fill="#1a1a2e" stroke="#444" strokeWidth="1" />
        <motion.circle
          cx="90"
          cy="116"
          r="4"
          fill="#ff4444"
          filter="url(#glow)"
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        />
        <motion.circle
          cx="100"
          cy="116"
          r="4"
          fill="#44ff44"
          filter="url(#glow)"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        />
        <motion.circle
          cx="110"
          cy="116"
          r="4"
          fill="#4488ff"
          filter="url(#glow)"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        <rect x="86" y="123" width="28" height="5" rx="2" fill="#333" />

        {/* Left Arm */}
        <motion.g
          animate={{ rotate: [0, 12, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "58px 105px" }}
        >
          <ellipse cx="48" cy="112" rx="16" ry="24" fill="url(#suitGradient)" stroke="#999" strokeWidth="2" />
          {/* Glove */}
          <circle cx="44" cy="132" r="11" fill="url(#suitShadow)" stroke="#888" strokeWidth="2" />
          {/* Gold ring */}
          <ellipse cx="48" cy="95" rx="14" ry="4" fill="url(#goldAccent)" />
        </motion.g>
        
        {/* Right Arm - waving */}
        <motion.g
          animate={{ rotate: [0, -20, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
          style={{ transformOrigin: "142px 105px" }}
        >
          <ellipse cx="152" cy="112" rx="16" ry="24" fill="url(#suitGradient)" stroke="#999" strokeWidth="2" />
          {/* Glove */}
          <circle cx="156" cy="132" r="11" fill="url(#suitShadow)" stroke="#888" strokeWidth="2" />
          {/* Gold ring */}
          <ellipse cx="152" cy="95" rx="14" ry="4" fill="url(#goldAccent)" />
        </motion.g>
        
        {/* Left Leg */}
        <motion.g
          animate={{ rotate: [0, 6, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "78px 158px" }}
        >
          <ellipse cx="78" cy="168" rx="14" ry="22" fill="url(#suitGradient)" stroke="#999" strokeWidth="2" />
          {/* Boot */}
          <ellipse cx="75" cy="188" rx="14" ry="9" fill="#666" stroke="#555" strokeWidth="2" />
          {/* Gold ring */}
          <ellipse cx="78" cy="152" rx="12" ry="3" fill="url(#goldAccent)" />
        </motion.g>
        
        {/* Right Leg */}
        <motion.g
          animate={{ rotate: [0, -6, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          style={{ transformOrigin: "122px 158px" }}
        >
          <ellipse cx="122" cy="168" rx="14" ry="22" fill="url(#suitGradient)" stroke="#999" strokeWidth="2" />
          {/* Boot */}
          <ellipse cx="125" cy="188" rx="14" ry="9" fill="#666" stroke="#555" strokeWidth="2" />
          {/* Gold ring */}
          <ellipse cx="122" cy="152" rx="12" ry="3" fill="url(#goldAccent)" />
        </motion.g>
        
        {/* Helmet */}
        <circle cx="100" cy="52" r="38" fill="url(#suitGradient)" stroke="#999" strokeWidth="3" />
        
        {/* Gold helmet ring */}
        <ellipse cx="100" cy="85" rx="30" ry="6" fill="url(#goldAccent)" />
        
        {/* Helmet glow */}
        <circle cx="100" cy="52" r="42" fill="url(#helmetGlow)" />
        
        {/* Visor */}
        <ellipse cx="100" cy="52" rx="26" ry="23" fill="url(#visorGradient)" />
        
        {/* Visor reflections */}
        <motion.ellipse
          cx="88"
          cy="44"
          rx="10"
          ry="6"
          fill="white"
          opacity="0.5"
          animate={{ opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 2.5, repeat: Infinity }}
        />
        <ellipse cx="108" cy="58" rx="5" ry="3" fill="white" opacity="0.2" />
        
        {/* Antenna */}
        <line x1="128" y1="28" x2="140" y2="12" stroke="#888" strokeWidth="3" strokeLinecap="round" />
        <motion.circle
          cx="142"
          cy="10"
          r="5"
          fill="hsl(var(--primary))"
          filter="url(#glow)"
          animate={{ 
            scale: [1, 1.4, 1],
            opacity: [0.8, 1, 0.8]
          }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      </svg>

      {/* Cord connecting to popup - goes down */}
      {showCord && (
        <svg
          className="absolute left-1/2 -translate-x-1/2 top-full w-4 h-16"
          viewBox="0 0 20 80"
          style={{ marginTop: "-10px" }}
        >
          <motion.path
            d="M10,0 Q5,20 10,40 Q15,60 10,80"
            stroke="hsl(var(--primary))"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            opacity="0.6"
            animate={{
              d: [
                "M10,0 Q5,20 10,40 Q15,60 10,80",
                "M10,0 Q15,20 10,40 Q5,60 10,80",
                "M10,0 Q5,20 10,40 Q15,60 10,80"
              ]
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Cord glow */}
          <motion.path
            d="M10,0 Q5,20 10,40 Q15,60 10,80"
            stroke="hsl(var(--primary))"
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
            opacity="0.2"
            animate={{
              d: [
                "M10,0 Q5,20 10,40 Q15,60 10,80",
                "M10,0 Q15,20 10,40 Q5,60 10,80",
                "M10,0 Q5,20 10,40 Q15,60 10,80"
              ]
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
        </svg>
      )}
    </motion.div>
  );
};

// Floating Planet Component
const FloatingPlanet = ({ className = "", size = "lg" }: { className?: string; size?: "sm" | "md" | "lg" }) => {
  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-20 h-20",
    lg: "w-32 h-32",
  };

  return (
    <motion.div
      className={`${sizeClasses[size]} ${className}`}
      animate={{
        y: [0, -10, 0],
        rotate: 360,
      }}
      transition={{
        y: { duration: 4, repeat: Infinity, ease: "easeInOut" },
        rotate: { duration: 20, repeat: Infinity, ease: "linear" },
      }}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <defs>
          <linearGradient id="planetGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--secondary))" />
          </linearGradient>
          <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--primary) / 0.2)" />
            <stop offset="50%" stopColor="hsl(var(--primary) / 0.6)" />
            <stop offset="100%" stopColor="hsl(var(--primary) / 0.2)" />
          </linearGradient>
        </defs>
        
        {/* Ring behind */}
        <ellipse cx="50" cy="50" rx="45" ry="12" fill="none" stroke="url(#ringGradient)" strokeWidth="4" opacity="0.5" />
        
        {/* Planet */}
        <circle cx="50" cy="50" r="30" fill="url(#planetGradient)" />
        
        {/* Planet texture */}
        <ellipse cx="40" cy="45" rx="8" ry="5" fill="hsl(var(--primary-foreground) / 0.2)" />
        <ellipse cx="55" cy="55" rx="6" ry="4" fill="hsl(var(--primary-foreground) / 0.15)" />
        <ellipse cx="60" cy="40" rx="4" ry="3" fill="hsl(var(--primary-foreground) / 0.1)" />
        
        {/* Ring front */}
        <ellipse cx="50" cy="50" rx="45" ry="12" fill="none" stroke="url(#ringGradient)" strokeWidth="4" strokeDasharray="60 40" />
      </svg>
    </motion.div>
  );
};

// Star component
const Star = ({ delay = 0, x = 0, y = 0 }: { delay?: number; x?: number; y?: number }) => (
  <motion.div
    className="absolute w-1 h-1 bg-white rounded-full"
    style={{ left: `${x}%`, top: `${y}%` }}
    animate={{
      scale: [0, 1, 0],
      opacity: [0, 1, 0],
    }}
    transition={{
      duration: 2,
      repeat: Infinity,
      delay,
    }}
  />
);

const NotFound = () => {
  const location = useLocation();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 20;
      const y = (e.clientY / window.innerHeight - 0.5) * 20;
      setMousePosition({ x, y });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Generate random stars - memoized to prevent regeneration on mouse move
  const stars = useMemo(() => 
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 3,
    })), 
  []);

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

        {/* Animated background gradient orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute w-[500px] h-[500px] rounded-full bg-primary/20 blur-[120px]"
            animate={{
              x: [0, 100, 0],
              y: [0, -50, 0],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{ top: "10%", left: "10%" }}
          />
          <motion.div
            className="absolute w-[400px] h-[400px] rounded-full bg-secondary/30 blur-[100px]"
            animate={{
              x: [0, -80, 0],
              y: [0, 60, 0],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{ bottom: "10%", right: "10%" }}
          />
        </div>

        {/* Floating planets - positioned at edges */}
        <FloatingPlanet className="absolute top-[5%] right-[5%] opacity-40" size="md" />
        <FloatingPlanet className="absolute bottom-[10%] left-[5%] opacity-30" size="sm" />
        
        <div className="text-center relative z-10 max-w-lg w-full flex flex-col items-center">
          <motion.div 
            className="mb-6"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Logo size="lg" />
          </motion.div>

          {/* Astronaut - centered above content with cord */}
          <motion.div
            className="mb-0"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <FloatingAstronaut showCord={true} />
          </motion.div>

          {/* Content card with glassmorphism */}
          <motion.div
            className="glass rounded-3xl p-6 sm:p-8 backdrop-blur-xl border border-white/10 shadow-2xl w-full"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            style={{
              transform: `perspective(1000px) rotateX(${mousePosition.y * 0.05}deg) rotateY(${mousePosition.x * 0.05}deg)`,
            }}
          >
            {/* 3D 404 text */}
            <motion.div
              className="relative mb-4"
              style={{ perspective: "1000px" }}
            >
              <motion.h1
                className="text-[80px] sm:text-[100px] font-display font-black text-transparent bg-clip-text bg-gradient-to-br from-primary via-primary/80 to-secondary leading-none"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, type: "spring", stiffness: 100 }}
                style={{ textShadow: "0 0 80px hsl(var(--primary) / 0.5)" }}
              >
                404
              </motion.h1>
            </motion.div>

            <motion.div
              className="space-y-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
                Perdido no espaço?
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base">
                Nosso astronauta também está procurando essa página, mas parece que ela não existe.
              </p>
            </motion.div>
            
            <motion.div 
              className="flex flex-col sm:flex-row gap-3 justify-center mt-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <Button
                variant="outline"
                size="lg"
                asChild
                className="h-11 px-5 text-sm group relative overflow-hidden"
              >
                <Link to="javascript:history.back()">
                  <ArrowLeft size={16} className="mr-2 group-hover:-translate-x-1 transition-transform" />
                  Voltar
                </Link>
              </Button>
              <Button
                variant="hero"
                size="lg"
                asChild
                className="h-11 px-5 text-sm group relative overflow-hidden"
              >
                <Link to="/">
                  <Home size={16} className="mr-2 group-hover:scale-110 transition-transform" />
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
