import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { SEO } from "@/components/SEO";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <>
      <SEO 
        title="Página não encontrada"
        description="A página que você está procurando não existe ou foi movida."
        noIndex
      />
      <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="absolute inset-0 bg-gradient-glow opacity-30" />
        
        <div className="text-center relative z-10 max-w-md w-full">
          <div className="flex justify-center mb-6 sm:mb-8">
            <Logo size="lg" />
          </div>
          
          <div className="glass rounded-2xl p-6 sm:p-8">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <span className="text-3xl sm:text-4xl font-bold text-primary">404</span>
            </div>
            
            <h1 className="font-display text-xl sm:text-2xl font-bold mb-2">
              Página não encontrada
            </h1>
            <p className="text-muted-foreground mb-6 sm:mb-8 text-sm sm:text-base">
              A página que você está procurando não existe ou foi movida.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                variant="outline"
                size="lg"
                asChild
                className="h-11 sm:h-12 text-sm sm:text-base"
              >
                <Link to="javascript:history.back()">
                  <ArrowLeft size={18} className="mr-2" />
                  Voltar
                </Link>
              </Button>
              <Button
                variant="hero"
                size="lg"
                asChild
                className="h-11 sm:h-12 text-sm sm:text-base"
              >
                <Link to="/">
                  <Home size={18} className="mr-2" />
                  Ir para Home
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default NotFound;
