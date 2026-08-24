import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MidCTASectionProps {
  onSignupClick?: () => void;
}

export const MidCTASection = ({ onSignupClick }: MidCTASectionProps) => {
  return (
    <section className="py-12 sm:py-16">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mx-auto max-w-3xl rounded-panel border border-border/60 bg-primary/5 px-6 py-8 text-center sm:px-10 sm:py-10"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            Pronto para simplificar sua operação?
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Sua operação comercial pode funcionar assim.
          </h2>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            Comece a usar a Wiize e coloque sua operação B2B para trabalhar em um só lugar.
          </p>
          <div className="mt-6 flex justify-center">
            <Link
              to="/signup/escolher-plano"
              className="w-full sm:w-auto"
              onClick={onSignupClick}
            >
              <Button
                variant="hero"
                size="lg"
                className="group w-full rounded-full text-sm sm:w-auto sm:text-base px-6 sm:px-8 h-11 sm:h-12"
              >
                Iniciar Teste Grátis
                <ArrowRight
                  size={14}
                  className="ml-1.5 sm:ml-2 group-hover:translate-x-0.5 transition-transform"
                />
              </Button>
            </Link>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            7 dias para testar • Sem compromisso
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default MidCTASection;
