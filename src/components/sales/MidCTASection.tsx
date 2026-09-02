import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MidCTASectionProps {
  onSignupClick?: () => void;
}

export const MidCTASection = ({ onSignupClick }: MidCTASectionProps) => {
  return (
    <section className="py-14 sm:py-24">
      <div className="container mx-auto px-4 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full overflow-hidden rounded-[28px] border border-primary/25 bg-gradient-to-br from-primary/[0.08] via-card to-primary/[0.05] px-6 py-12 text-center shadow-[0_30px_80px_-32px_hsl(var(--primary)/0.35)] sm:px-12 sm:py-16"
        >
          {/* brilhos suaves */}
          <div
            className="pointer-events-none absolute -top-32 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-40 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl"
            aria-hidden
          />
          {/* linha de brilho no topo */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"
            aria-hidden
          />

          <div className="relative">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              <Sparkles size={13} strokeWidth={2.2} />
              Pronto para simplificar sua operação?
            </div>

            <h2 className="mx-auto max-w-2xl text-balance text-3xl font-bold leading-[1.12] tracking-tight text-foreground sm:text-4xl lg:text-[2.75rem]">
              Sua operação comercial pode{" "}
              <span className="text-primary">funcionar assim.</span>
            </h2>

            <p className="mx-auto mt-4 max-w-xl text-balance text-base leading-relaxed text-muted-foreground sm:text-lg">
              Comece a usar a Wiize e coloque sua operação B2B para trabalhar em um só lugar.
            </p>

            <div className="mt-8 flex justify-center">
              <Link
                to="/signup/escolher-plano"
                className="w-full sm:w-auto"
                onClick={onSignupClick}
              >
                <Button
                  variant="hero"
                  size="lg"
                  className="group h-12 w-full rounded-full px-8 text-sm shadow-[0_14px_36px_-12px_hsl(var(--primary)/0.55)] transition-shadow hover:shadow-[0_18px_44px_-12px_hsl(var(--primary)/0.65)] sm:w-auto sm:px-10 sm:text-base"
                >
                  Iniciar Teste Grátis
                  <ArrowRight
                    size={16}
                    className="ml-2 transition-transform group-hover:translate-x-1"
                  />
                </Button>
              </Link>
            </div>

            <p className="mt-4 text-xs font-medium text-muted-foreground sm:text-sm">
              7 dias para testar <span className="mx-1 text-border">•</span> Sem compromisso
            </p>

            {/* provas de confiança */}
            <div className="mx-auto mt-9 flex max-w-2xl flex-col items-center justify-center gap-3 border-t border-border/50 pt-7 sm:flex-row sm:gap-8">
              {proofPoints.map((point) => (
                <span
                  key={point}
                  className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground sm:text-[13px]"
                >
                  <CheckCircle2 size={15} className="text-primary" strokeWidth={2.2} />
                  {point}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default MidCTASection;
