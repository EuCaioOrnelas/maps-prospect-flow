import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { SEO } from "@/components/SEO";
import { motion } from "framer-motion";

// Animated Astronaut Component
const FloatingAstronaut = () => {
  return (
    <motion.div
      className="relative w-48 h-48 sm:w-64 sm:h-64"
      animate={{
        y: [0, -20, 0],
        rotate: [0, 5, -5, 0],
      }}
      transition={{
        duration: 6,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-2xl">
        {/* Glow effect */}
        <defs>
          <radialGradient id="helmetGlow" cx="50%" cy="30%" r="50%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="suitGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--muted))" />
            <stop offset="100%" stopColor="hsl(var(--muted-foreground) / 0.3)" />
          </linearGradient>
          <linearGradient id="visorGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="50%" stopColor="hsl(var(--secondary))" />
            <stop offset="100%" stopColor="hsl(var(--primary) / 0.8)" />
          </linearGradient>
        </defs>

        {/* Backpack */}
        <motion.rect
          x="70"
          y="75"
          width="60"
          height="70"
          rx="8"
          fill="hsl(var(--muted-foreground) / 0.4)"
          stroke="hsl(var(--border))"
          strokeWidth="2"
        />
        
        {/* Backpack details */}
        <rect x="78" y="85" width="15" height="20" rx="3" fill="hsl(var(--primary) / 0.3)" />
        <rect x="78" y="110" width="15" height="15" rx="3" fill="hsl(var(--secondary) / 0.3)" />
        
        {/* Body */}
        <motion.ellipse
          cx="100"
          cy="115"
          rx="45"
          ry="50"
          fill="url(#suitGradient)"
          stroke="hsl(var(--border))"
          strokeWidth="2"
        />
        
        {/* Body stripe */}
        <rect x="90" y="80" width="20" height="70" rx="5" fill="hsl(var(--primary) / 0.3)" />
        
        {/* Control panel on chest */}
        <rect x="85" y="100" width="30" height="20" rx="4" fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth="1" />
        <motion.circle
          cx="92"
          cy="107"
          r="3"
          fill="hsl(var(--destructive))"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
        <motion.circle
          cx="100"
          cy="107"
          r="3"
          fill="hsl(var(--primary))"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        <circle cx="108" cy="107" r="3" fill="hsl(var(--secondary))" />
        <rect x="88" y="112" width="24" height="4" rx="1" fill="hsl(var(--muted-foreground) / 0.5)" />

        {/* Left Arm */}
        <motion.g
          animate={{ rotate: [0, 10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "60px 100px" }}
        >
          <ellipse cx="45" cy="110" rx="18" ry="25" fill="url(#suitGradient)" stroke="hsl(var(--border))" strokeWidth="2" />
          <circle cx="40" cy="130" r="12" fill="url(#suitGradient)" stroke="hsl(var(--border))" strokeWidth="2" />
        </motion.g>
        
        {/* Right Arm */}
        <motion.g
          animate={{ rotate: [0, -15, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          style={{ transformOrigin: "140px 100px" }}
        >
          <ellipse cx="155" cy="110" rx="18" ry="25" fill="url(#suitGradient)" stroke="hsl(var(--border))" strokeWidth="2" />
          <circle cx="160" cy="130" r="12" fill="url(#suitGradient)" stroke="hsl(var(--border))" strokeWidth="2" />
        </motion.g>
        
        {/* Left Leg */}
        <motion.g
          animate={{ rotate: [0, 5, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "75px 155px" }}
        >
          <ellipse cx="75" cy="170" rx="15" ry="25" fill="url(#suitGradient)" stroke="hsl(var(--border))" strokeWidth="2" />
          <ellipse cx="72" cy="192" rx="12" ry="8" fill="hsl(var(--muted-foreground) / 0.5)" stroke="hsl(var(--border))" strokeWidth="2" />
        </motion.g>
        
        {/* Right Leg */}
        <motion.g
          animate={{ rotate: [0, -5, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
          style={{ transformOrigin: "125px 155px" }}
        >
          <ellipse cx="125" cy="170" rx="15" ry="25" fill="url(#suitGradient)" stroke="hsl(var(--border))" strokeWidth="2" />
          <ellipse cx="128" cy="192" rx="12" ry="8" fill="hsl(var(--muted-foreground) / 0.5)" stroke="hsl(var(--border))" strokeWidth="2" />
        </motion.g>
        
        {/* Helmet */}
        <circle cx="100" cy="50" r="40" fill="url(#suitGradient)" stroke="hsl(var(--border))" strokeWidth="3" />
        
        {/* Helmet glow */}
        <circle cx="100" cy="50" r="42" fill="url(#helmetGlow)" />
        
        {/* Visor */}
        <ellipse cx="100" cy="50" rx="28" ry="25" fill="url(#visorGradient)" opacity="0.9" />
        
        {/* Visor reflection */}
        <motion.ellipse
          cx="88"
          cy="42"
          rx="8"
          ry="5"
          fill="white"
          opacity="0.4"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        
        {/* Antenna */}
        <line x1="130" y1="25" x2="140" y2="10" stroke="hsl(var(--muted-foreground))" strokeWidth="2" />
        <motion.circle
          cx="142"
          cy="8"
          r="4"
          fill="hsl(var(--primary))"
          animate={{ 
            scale: [1, 1.3, 1],
            opacity: [0.7, 1, 0.7]
          }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      </svg>

      {/* Floating cord */}
      <motion.svg
        className="absolute -right-8 top-1/2 w-32 h-16"
        viewBox="0 0 100 50"
        animate={{ 
          d: ["M0,25 Q30,10 60,25 T100,25", "M0,25 Q30,40 60,25 T100,25", "M0,25 Q30,10 60,25 T100,25"]
        }}
      >
        <motion.path
          d="M0,25 Q30,10 60,25 T100,25"
          stroke="hsl(var(--muted-foreground) / 0.5)"
          strokeWidth="2"
          fill="none"
          animate={{
            d: ["M0,25 Q30,10 60,25 T100,25", "M0,25 Q30,40 60,25 T100,25", "M0,25 Q30,10 60,25 T100,25"]
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.svg>
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

  // Generate random stars
  const stars = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 3,
  }));

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

          {/* Astronaut - centered above content */}
          <motion.div
            className="mb-4"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <FloatingAstronaut />
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
