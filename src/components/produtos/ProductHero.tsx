import { Link } from "react-router-dom";
import { ArrowRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TRIAL_DISABLED, notifyTrialDisabled } from "@/lib/trialStatus";
import { ProductVisualContent } from "./ProductFloatingVisual";
import type { ProductConfig } from "@/data/products";
import avatar1 from "@/assets/avatars/avatar1.jpg";
import avatar2 from "@/assets/avatars/avatar2.jpg";
import avatar3 from "@/assets/avatars/avatar3.jpg";
import avatar4 from "@/assets/avatars/avatar4.jpg";

interface ProductHeroProps {
  product: ProductConfig;
}

export const ProductHero = ({ product }: ProductHeroProps) => {
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





      <div className="container relative z-10 mx-auto w-full max-w-[90rem] px-6 sm:px-10 lg:px-16">
        <div className="grid grid-cols-1 items-center gap-10 xl:grid-cols-2 xl:gap-[10%]">

          <div className="relative z-20 text-center xl:text-left">
            <div className="animate-fade-in mb-6 inline-flex items-center gap-1.5 rounded-hover border border-primary/10 glass px-2.5 py-1.5 sm:mb-8 sm:gap-2.5 sm:px-3.5 sm:py-2">
              <div className="flex -space-x-1 sm:-space-x-1.5">
                <img src={avatar1} alt="" className="h-4 w-4 rounded-full border border-background object-cover sm:h-7 sm:w-7 sm:border-2" width={28} height={28} />
                <img src={avatar2} alt="" className="h-4 w-4 rounded-full border border-background object-cover sm:h-7 sm:w-7 sm:border-2" width={28} height={28} />
                <img src={avatar3} alt="" className="h-4 w-4 rounded-full border border-background object-cover sm:h-7 sm:w-7 sm:border-2" width={28} height={28} />
                <img src={avatar4} alt="" className="h-4 w-4 rounded-full border border-background object-cover sm:h-7 sm:w-7 sm:border-2" width={28} height={28} />
              </div>
              <span className="text-[10px] font-medium tracking-tight text-foreground sm:text-xs">+500 Empresas já utilizam a Wiize</span>
            </div>

            <h1
              className="animate-slide-up mb-4 font-display font-bold leading-[1.08] tracking-tight text-foreground sm:mb-6"
              style={{ animationDelay: "0.1s" }}
            >
              <span className="block text-[2rem] sm:text-[2.3rem] md:text-[2.9rem] lg:text-[3.1rem]">
                {product.heroTitle}
              </span>
              <span className="mt-1 block whitespace-nowrap text-shimmer-highlight text-[2.3rem] font-extrabold leading-[1.05] drop-shadow-sm sm:mt-2 sm:text-[2.7rem] md:text-[3.2rem] lg:text-[3.5rem]">
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
                  Comece agora em breve
                </Button>
              ) : (
                <Link to="/signup/escolher-plano" className="shrink-0">
                  <Button
                    variant="hero"
                    size="lg"
                    className="group h-11 rounded-full px-6 text-sm sm:h-12 sm:px-8 sm:text-base"
                  >
                    Comece agora
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
                  className="demo-shine h-11 rounded-full border border-border/60 bg-transparent px-6 text-sm transition-all duration-300 hover:-translate-y-1 hover:border-foreground/20 hover:bg-muted/60 hover:shadow-[0_10px_30px_-10px_hsl(220_15%_20%/0.15)] sm:h-12 sm:px-8 sm:text-base"
                >
                  Ver Demonstração
                </Button>
              </Link>

            </div>
          </div>

          <div
            className="animate-slide-up relative mt-10 flex w-full justify-center sm:mt-14 xl:mt-16 xl:justify-end"
            style={{ animationDelay: "0.45s" }}
          >
            {/* Faixa de plasma (verde Wiize) — sempre atrás do mockup, inclusive no mobile */}
            <div
              className="pointer-events-none absolute left-1/2 top-[112%] z-0 h-24 w-[220vw] -translate-x-1/2 -translate-y-1/2 -rotate-[4deg] overflow-hidden sm:h-32"
              aria-hidden
            >
              <div className="wz-band absolute inset-0" />
            </div>
            {/* Âncora: em telas grandes o visual é renderizado flutuante e segue o scroll */}
            <div className="relative z-10 w-full xl:w-[190%]">
              <ProductVisualContent product={product} />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default ProductHero;
