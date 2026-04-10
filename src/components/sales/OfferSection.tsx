import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check } from "lucide-react";
import { Link } from "react-router-dom";

const included = [
  "Captação inteligente de leads B2B",
  "Diagnóstico e score com IA",
  "Mensagens personalizadas automaticamente",
  "Envio via WhatsApp API oficial",
  "Agente de IA para atendimento 24/7",
  "Follow-up automático inteligente",
  "CRM integrado com pipeline",
  "Dashboards e métricas em tempo real",
  "Suporte e onboarding incluso",
];

interface OfferSectionProps {
  onSignupClick?: () => void;
}

export const OfferSection = ({ onSignupClick }: OfferSectionProps) => {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section ref={ref as React.RefObject<HTMLElement>} className="py-20 sm:py-32 w-full relative">
      <div className="container mx-auto px-4 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase bg-primary/10 text-primary mb-4">
            A oferta
          </span>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
            Tudo que você precisa<br />
            <span className="text-shimmer-highlight">em uma plataforma</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Para empresas B2B que querem gerar demanda com escala, previsibilidade e inteligência.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="rounded-2xl border border-primary/20 bg-card/30 p-8 sm:p-12 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
            {included.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Check size={12} className="text-primary" />
                </div>
                <span className="text-sm text-foreground">{item}</span>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Link to="/signup" onClick={onSignupClick}>
              <Button variant="hero" size="xl" className="rounded-full group">
                Agendar demonstração
                <ArrowRight className="group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <p className="text-xs text-muted-foreground mt-4">
              Garantia de 7 dias • Sem compromisso • Setup em minutos
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
