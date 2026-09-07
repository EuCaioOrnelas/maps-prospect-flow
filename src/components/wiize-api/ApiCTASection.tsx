import { Link } from "react-router-dom";
import { ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

/** CTA final do Wiize API — mesmo desenho do CTA da LP principal. */
export const ApiCTASection = () => {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="relative w-full overflow-hidden py-16 sm:py-24"
      style={{
        background:
          "radial-gradient(ellipse 60% 55% at 50% 50%, hsl(var(--primary) / 0.10) 0%, hsl(var(--primary) / 0.04) 40%, transparent 75%), radial-gradient(ellipse 45% 40% at 10% 100%, hsl(var(--primary) / 0.07) 0%, transparent 70%), radial-gradient(ellipse 40% 40% at 95% 100%, hsl(var(--primary) / 0.05) 0%, transparent 70%)",
      }}
    >
      <div className="container relative z-10 mx-auto max-w-6xl px-4">
        <div
          className={`mx-auto max-w-4xl px-2 text-center transition-all duration-700 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <div className="mb-5 inline-flex items-center gap-1.5 rounded-hover glass px-3 py-1.5 sm:mb-6 sm:gap-2 sm:px-4 sm:py-2">
            <Zap size={14} className="text-primary" />
            <span className="text-[11px] text-muted-foreground sm:text-sm">
              Conta gratuita, sem cartão de crédito
            </span>
          </div>
          <h2 className="mb-6 font-display text-4xl font-bold text-foreground sm:text-5xl md:text-6xl">
            Comece a integrar hoje.
            <br />
            <span className="text-shimmer-highlight">Em minutos, não semanas.</span>
          </h2>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            Crie sua conta, gere uma API Key e faça sua primeira chamada usando a mesma
            inteligência que move a plataforma Wiize.
          </p>
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border/70 bg-muted/50 px-5 py-3 text-sm font-medium text-muted-foreground">
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              Beta
            </span>
            Acesso em beta fechado — em breve liberado para todos
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            Ambientes separados • Chaves revogáveis • Documentação completa
          </p>
        </div>
      </div>
    </section>
  );
};

export default ApiCTASection;
