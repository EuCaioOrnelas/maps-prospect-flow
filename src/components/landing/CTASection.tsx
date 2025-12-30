import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export const CTASection = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-glow" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-display text-4xl md:text-6xl font-bold mb-6">
            Comece a prospectar{" "}
            <span className="text-gradient">agora mesmo</span>
          </h2>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Não perca mais tempo buscando leads manualmente.
            Experimente grátis e veja os resultados.
          </p>
          <Link to="/signup">
            <Button variant="hero" size="xl" className="group">
              Criar conta gratuita
              <ArrowRight className="group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <p className="text-sm text-muted-foreground mt-6">
            10 buscas grátis • Sem cartão de crédito • Comece em 30 segundos
          </p>
        </div>
      </div>
    </section>
  );
};
