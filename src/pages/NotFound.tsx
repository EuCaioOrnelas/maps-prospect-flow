import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { SEO } from "@/components/SEO";
import { motion } from "framer-motion";

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

  return (
    <>
      <SEO 
        title="Página não encontrada"
        description="A página que você está procurando não existe ou foi movida."
        noIndex
      />
      <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-hidden relative">
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

        {/* Floating particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-primary/40 rounded-full"
              initial={{
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
              }}
              animate={{
                y: [null, -20, 20],
                opacity: [0.2, 0.8, 0.2],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>
        
        <div className="text-center relative z-10 max-w-lg w-full">
          <motion.div 
            className="flex justify-center mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Logo size="lg" />
          </motion.div>
          
          {/* 3D Rotating 404 */}
          <motion.div
            className="relative mb-8 perspective-1000"
            style={{
              perspective: "1000px",
            }}
          >
            <motion.div
              className="relative"
              style={{
                transformStyle: "preserve-3d",
                rotateX: mousePosition.y * 0.5,
                rotateY: mousePosition.x * 0.5,
              }}
            >
              {/* Glowing backdrop */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-primary/50 to-secondary/50 blur-3xl rounded-full"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.5, 0.3],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              
              {/* Main 404 text with 3D layers */}
              <div className="relative">
                {/* Shadow layer */}
                <motion.h1
                  className="text-[120px] sm:text-[180px] font-display font-black text-transparent bg-clip-text bg-gradient-to-b from-muted/20 to-transparent select-none absolute inset-0"
                  style={{
                    transform: "translateZ(-50px) translateY(10px)",
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.3 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                >
                  404
                </motion.h1>
                
                {/* Main layer */}
                <motion.h1
                  className="text-[120px] sm:text-[180px] font-display font-black text-transparent bg-clip-text bg-gradient-to-br from-primary via-primary/80 to-secondary relative"
                  initial={{ opacity: 0, scale: 0.5, rotateX: -90 }}
                  animate={{ opacity: 1, scale: 1, rotateX: 0 }}
                  transition={{ 
                    duration: 0.8, 
                    type: "spring",
                    stiffness: 100,
                  }}
                  style={{
                    textShadow: "0 0 80px hsl(var(--primary) / 0.5)",
                  }}
                >
                  404
                </motion.h1>
              </div>
            </motion.div>
          </motion.div>

          {/* Content card with glassmorphism */}
          <motion.div
            className="glass rounded-3xl p-8 backdrop-blur-xl border border-white/10 shadow-2xl"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            style={{
              transform: `perspective(1000px) rotateX(${mousePosition.y * 0.1}deg) rotateY(${mousePosition.x * 0.1}deg)`,
            }}
          >
            <motion.div
              className="space-y-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
                Página não encontrada
              </h2>
              <p className="text-muted-foreground text-base sm:text-lg max-w-md mx-auto">
                Parece que você se perdeu no espaço digital. A página que você procura não existe ou foi movida.
              </p>
            </motion.div>
            
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center mt-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <Button
                variant="outline"
                size="lg"
                asChild
                className="h-12 px-6 text-base group relative overflow-hidden"
              >
                <Link to="javascript:history.back()">
                  <motion.span
                    className="absolute inset-0 bg-primary/10"
                    initial={{ x: "-100%" }}
                    whileHover={{ x: 0 }}
                    transition={{ duration: 0.3 }}
                  />
                  <ArrowLeft size={18} className="mr-2 group-hover:-translate-x-1 transition-transform" />
                  Voltar
                </Link>
              </Button>
              <Button
                variant="hero"
                size="lg"
                asChild
                className="h-12 px-6 text-base group relative overflow-hidden"
              >
                <Link to="/">
                  <motion.span
                    className="absolute inset-0 bg-white/20"
                    initial={{ x: "-100%" }}
                    whileHover={{ x: 0 }}
                    transition={{ duration: 0.3 }}
                  />
                  <Home size={18} className="mr-2 group-hover:scale-110 transition-transform" />
                  Ir para Home
                </Link>
              </Button>
            </motion.div>
          </motion.div>

          {/* Decorative elements */}
          <motion.div
            className="absolute -top-20 -left-20 w-40 h-40 border border-primary/20 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="absolute -bottom-10 -right-10 w-60 h-60 border border-secondary/20 rounded-full"
            animate={{ rotate: -360 }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          />
        </div>
      </div>
    </>
  );
};

export default NotFound;
