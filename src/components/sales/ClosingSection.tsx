import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface ClosingSectionProps {
  onSignupClick?: () => void;
}

export const ClosingSection = ({ onSignupClick }: ClosingSectionProps) => {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section ref={ref as React.RefObject<HTMLElement>} className="py-20 sm:py-32 w-full relative overflow-hidden">
      <div className="absolute left-1/2 top-1/2 h-72 w-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-glow opacity-20 blur-3xl" />
      
      <div className="container mx-auto px-4 max-w-4xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center"
        >
          <p className="text-sm text-muted-foreground uppercase tracking-widest mb-6">Decisão estratégica</p>
          
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
            Enquanto outros tentam crescer<br className="hidden sm:block" />
            com processos manuais,{" "}
            <span className="text-shimmer-highlight">sua empresa já pode operar no automático.</span>
          </h2>
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
            A Wiize foi criada para empresas que entendem que crescimento previsível vem de sistema, não de esforço bruto. Coloque sua operação comercial no próximo nível.
          </p>

          <Link to="/signup" onClick={onSignupClick}>
            <Button variant="hero" size="xl" className="rounded-full group">
              Começar agora
              <ArrowRight className="group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};
