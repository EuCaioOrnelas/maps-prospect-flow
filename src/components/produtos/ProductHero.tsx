import { Link } from "react-router-dom";
import { HiArrowRight, HiLockClosed } from "react-icons/hi2";
import { Button } from "@/components/ui/button";
import { ShaderBackground } from "@/components/ui/warmth-ripple";

import { TRIAL_DISABLED, notifyTrialDisabled } from "@/lib/trialStatus";
import { ProductVisualContent } from "./ProductFloatingVisual";
import type { ProductConfig } from "@/data/products";
import avatar1 from "@/assets/avatars/avatar1.jpg";
import avatar2 from "@/assets/avatars/avatar2.jpg";
import avatar3 from "@/assets/avatars/avatar3.jpg";
import avatar4 from "@/assets/avatars/avatar4.jpg";

interface ProductHeroProps {
  product: ProductConfig;
  sharedDesktopVisual?: boolean;
}

export const ProductHero = ({ product, sharedDesktopVisual = false }: ProductHeroProps) => {
  return (
    <section className="relative -mt-[72px] w-full overflow-x-clip pb-16 pt-[120px] sm:-mt-[80px] sm:pb-40 sm:pt-[136px] lg:pb-44">
      {/* Faixa de plasma ancorada à divisória entre o hero e "Como funciona" e elevada 60px
          de forma constante em qualquer resolução; somente a imagem do hero pode sobrepô-la. */}
      <div
        className="pointer-events-none absolute bottom-[-3rem] left-1/2 z-[5] h-24 w-[120vw] origin-center -translate-x-1/2 -translate-y-[60px] -rotate-[4deg] overflow-hidden sm:bottom-[-4rem] sm:h-32"
        aria-hidden
      >

        <div className="wz-band absolute inset-0" />
        <div className="absolute inset-0 overflow-hidden opacity-70 mix-blend-screen">
          <ShaderBackground className="h-[300%] w-full -translate-y-[33.33%]" />
        </div>
      </div>

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
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] lg:gap-12">

          <div className="relative z-20 min-w-0 text-center lg:text-left">
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
              <span className="block text-balance text-[clamp(2.1rem,6.5vw,3.1rem)] lg:text-[clamp(2.3rem,3.4vw,3.6rem)]">
                {product.heroTitle}
              </span>
              <span className="mt-1 block whitespace-nowrap text-shimmer-highlight text-[clamp(2.1rem,6.5vw,3.1rem)] font-bold leading-[1.08] drop-shadow-sm sm:mt-2 lg:text-[clamp(2.3rem,3.4vw,3.6rem)]">
                {product.heroHighlight}
              </span>
            </h1>

            <p
              className="animate-slide-up mx-auto mb-6 max-w-xl text-pretty text-sm text-muted-foreground sm:mb-8 sm:text-lg lg:mx-0"
              style={{ animationDelay: "0.2s" }}
            >
              {product.heroDescription}
            </p>

            <div
              className="animate-slide-up flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4 lg:justify-start"
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
                  <HiLockClosed className="mr-1 h-4 w-4" />
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
                    <HiArrowRight
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
                  className="demo-shine h-11 rounded-full border border-border/70 bg-background/80 px-6 text-sm font-medium text-foreground backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-foreground/25 hover:bg-background hover:shadow-[0_10px_30px_-10px_hsl(220_15%_20%/0.15)] sm:h-12 sm:px-8 sm:text-base"
                >
                  Ver Demonstração
                </Button>
              </Link>

            </div>
          </div>

          <div
            className="animate-slide-up relative z-30 flex w-full min-w-0 justify-start"
            style={{ animationDelay: "0.45s" }}
          >
            {/* No desktop, o mesmo visual atravessa Hero + Como funciona via sticky no template. */}
            <div className={`relative z-30 mx-auto w-full max-w-[22rem] sm:max-w-[26rem] lg:mx-0 lg:ml-auto lg:mr-0 lg:max-w-[clamp(19rem,32vw,30rem)] ${sharedDesktopVisual ? "lg:invisible" : ""}`}>

              <ProductVisualContent product={product} />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default ProductHero;
