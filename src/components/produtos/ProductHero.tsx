import { Link } from "react-router-dom";
import { ArrowRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TRIAL_DISABLED, notifyTrialDisabled } from "@/lib/trialStatus";
import { ProductHeroVisual } from "./ProductHeroVisual";
import type { ProductConfig } from "@/data/products";

interface ProductHeroProps {
  product: ProductConfig;
}

export const ProductHero = ({ product }: ProductHeroProps) => {
  const Icon = product.icon;

  return (
    <section className="relative -mt-[72px] w-full overflow-x-clip pb-32 pt-[120px] sm:-mt-[80px] sm:pb-44 sm:pt-[136px]">
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, hsl(158 35% 97.5%) 0%, hsl(210 30% 99%) 60%, hsl(var(--background)) 100%)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage: "radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
        }}
        aria-hidden
      />

      {/* Faixa de plasma diagonal (verde Wiize) — fina, contínua, topo sempre atrás do mockup */}
      <div className="pointer-events-none absolute inset-0 overflow-x-clip" aria-hidden>
        <div className="absolute -inset-x-[25%] top-full h-24 -translate-y-[125%] -rotate-[5deg] sm:h-32">
          <div className="wz-band absolute inset-0" />
        </div>
      </div>


      <div className="container relative z-10 mx-auto w-full max-w-[90rem] px-6 sm:px-10 lg:px-16">
        <div className="grid grid-cols-1 items-center gap-10 xl:grid-cols-[1.3fr_1fr] xl:gap-4">

          <div className="text-center xl:text-left">
            <span className="animate-fade-in mb-6 inline-flex items-center gap-2 rounded-hover border border-primary/15 glass px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-primary sm:mb-8">
              <Icon size={13} />
              {product.category}
            </span>

            <h1
              className="animate-slide-up mb-4 font-display font-bold leading-[1.08] tracking-tight text-foreground sm:mb-6"
              style={{ animationDelay: "0.1s" }}
            >
              <span className="block text-[2rem] sm:text-[2.3rem] md:text-[2.9rem] lg:text-[3.1rem]">
                {product.heroTitle}
              </span>
              <span className="mt-1 block text-shimmer-highlight text-[2.3rem] font-extrabold leading-[1.05] drop-shadow-sm sm:mt-2 sm:text-[2.7rem] md:text-[3.2rem] lg:text-[3.5rem]">
                {product.heroHighlight}
              </span>
            </h1>

            <p
              className="animate-slide-up mx-auto mb-6 max-w-xl text-sm text-muted-foreground sm:mb-8 sm:text-lg xl:mx-0"
              style={{ animationDelay: "0.2s" }}
            >
              {product.heroDescription}
            </p>

            <div
              className="animate-slide-up flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4 xl:justify-start"
              style={{ animationDelay: "0.3s" }}
            >
              {TRIAL_DISABLED ? (
                <Button
                  variant="hero"
                  size="lg"
                  className="h-11 shrink-0 cursor-not-allowed rounded-full px-6 text-sm opacity-60 sm:h-12 sm:px-8 sm:text-base"
                  disabled
                  aria-disabled="true"
                  onClick={(e) => {
                    e.preventDefault();
                    notifyTrialDisabled();
                  }}
                >
                  <Lock size={16} className="mr-1" />
                  Teste grátis em breve
                </Button>
              ) : (
                <Link to="/signup/escolher-plano" className="shrink-0">
                  <Button
                    variant="hero"
                    size="lg"
                    className="group h-11 rounded-full px-6 text-sm sm:h-12 sm:px-8 sm:text-base"
                  >
                    Iniciar Teste Grátis
                    <ArrowRight
                      size={14}
                      className="ml-1.5 transition-transform group-hover:translate-x-0.5 sm:ml-2"
                    />
                  </Button>
                </Link>
              )}
              <Link to="/tour-guiado" className="group shrink-0">
                <Button
                  variant="ghost"
                  size="lg"
                  className="demo-shine h-11 rounded-full border border-border/60 bg-transparent px-6 text-sm transition-all duration-300 hover:-translate-y-1 hover:border-foreground/20 hover:bg-muted/60 sm:h-12 sm:px-8 sm:text-base"
                >
                  Ver Demonstração
                </Button>
              </Link>
            </div>
          </div>

          <div
            className="animate-slide-up mt-6 flex w-full justify-center sm:mt-10 xl:mt-16 xl:justify-end"
            style={{ animationDelay: "0.45s" }}
          >
            <ProductHeroVisual visual={product.key} />
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProductHero;
