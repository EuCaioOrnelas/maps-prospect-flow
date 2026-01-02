import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";
import { SEO } from "@/components/SEO";

const NotFound = () => {
  return (
    <>
      <SEO 
        title="Página não encontrada"
        description="A página que você está procurando não existe ou foi movida."
        noIndex
      />
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          {/* 404 Number */}
          <h1 className="text-[120px] sm:text-[160px] font-bold leading-none tracking-tighter text-primary/10 select-none">
            404
          </h1>
          
          {/* Content */}
          <div className="-mt-6 sm:-mt-8">
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
