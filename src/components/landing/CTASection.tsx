import { Button } from "@/components/ui/button";
import { ArrowRight, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

interface CTASectionProps {
  onSignupClick?: () => void;
}

export const CTASection = ({ onSignupClick }: CTASectionProps) => {
  const { ref, isVisible } = useScrollAnimation();
  
  return (
    <section 
      className="py-16 sm:py-24 relative overflow-hidden w-full"
      ref={ref as React.RefObject<HTMLElement>}
    >
      <div className="absolute left-1/2 top-1/2 h-72 w-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-glow opacity-20 blur-3xl" />
      <div className="absolute bottom-0 left-0 w-[40rem] h-[20rem] rounded-full bg-primary/[0.06] blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[30rem] h-[16rem] rounded-full bg-primary/[0.04] blur-[80px] pointer-events-none" />
      
      <div className="container mx-auto px-4 relative z-10 max-w-6xl">
        <div 
          className={`max-w-4xl mx-auto text-center px-2 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6">
            <Zap size={16} className="text-primary" />
            <span className="text-sm text-muted-foreground">Comece em menos de 1 minuto</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl md:text-6xl font-bold mb-6 text-foreground">
            Comece a prospectar<br />
            <span className="text-shimmer-highlight">agora mesmo</span>
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Não perca mais tempo buscando leads manualmente.
            Automatize sua prospecção e escale seus resultados.
          </p>
          <Link to="/signup" onClick={onSignupClick}>
            <Button variant="hero" size="xl" className="group rounded-full">
              Começar Agora
              <ArrowRight className="group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <p className="text-sm text-muted-foreground mt-6">
            Garantia de 7 dias • Cancele quando quiser • Setup em 30 segundos
          </p>
        </div>
      </div>
    </section>
  );
};
