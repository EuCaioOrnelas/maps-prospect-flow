import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";
import { SEO } from "@/components/SEO";
import logoIconNew from "@/assets/logo-icon-new.png";

const NotFound = () => {
  return (
    <>
      <SEO 
        title="Página não encontrada"
        description="A página que você está procurando não existe ou foi movida."
        noIndex
      />
      <div className="min-h-screen bg-background flex items-center justify-center px-6 relative overflow-hidden">
        {/* Glow effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/15 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] bg-primary/10 rounded-full blur-[80px]" />
        
        <div className="text-center max-w-md relative z-10">
          {/* 4 [logo] 4 */}
          <div className="flex items-center justify-center gap-0 mb-2 select-none">
            <span className="text-[120px] sm:text-[160px] font-bold leading-none tracking-tighter text-foreground/15">
              4
            </span>
            <img 
              src={logoIconNew} 
              alt="Wiize" 
              className="h-[100px] sm:h-[130px] w-auto drop-shadow-[0_0_30px_hsl(var(--primary)/0.4)]" 
            />
            <span className="text-[120px] sm:text-[160px] font-bold leading-none tracking-tighter text-foreground/15">
              4
            </span>
          </div>
          
          {/* Content */}
          <div>
            <h2 className="text-2xl sm:text-3xl font-semibold text-foreground mb-3">
              Página não encontrada
            </h2>
            <p className="text-muted-foreground mb-8 text-base sm:text-lg">
              A página que você procura não existe ou foi movida.
            </p>
            
            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild variant="default" size="lg">
                <Link to="/">
                  <Home className="w-4 h-4 mr-2" />
                  Ir para o início
                </Link>
              </Button>
              <Button variant="outline" size="lg" onClick={() => window.history.back()}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default NotFound;
