import { useEffect, useState } from "react";
import { ProductHeroVisual } from "./ProductHeroVisual";
import prospeccaoHeroAsset from "@/assets/prospeccao-hero-v2.png.asset.json";
import type { ProductConfig } from "@/data/products";

export const PV_HERO_ANCHOR = "pv-anchor-hero";
export const PV_STEPS_ANCHOR = "pv-anchor-steps";
export const PV_STEPS_SECTION = "pv-steps-section";

/** Conteúdo visual do produto (imagem real ou mockup animado). */
export const ProductVisualContent = ({ product }: { product: ProductConfig }) => {
  if (product.key === "prospeccao") {
    return (
      <div className="pv-float relative w-full">
        <img
          src={prospeccaoHeroAsset.url}
          alt="Painel de Prospecção Inteligente Wiize: busca de empresas, análise com score e próximo passo"
          className="h-auto w-full"
          loading="eager"
        />
      </div>
    );
  }
  return (
    <div className="flex w-full justify-center xl:justify-end">
      <ProductHeroVisual visual={product.key} />
    </div>
  );
};

type Pos = { left: number; top: number; width: number };

/**
 * Visual fixo que acompanha o scroll: começa no hero (direita) e desliza
 * para a coluna esquerda de "Como funciona", ficando ancorado até o fim
 * da seção. Ativo apenas em telas grandes.
 */
export const ProductFloatingVisual = ({ product }: { product: ProductConfig }) => {
  const [pos, setPos] = useState<Pos | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1280px)");
    let raf = 0;

    const update = () => {
      raf = 0;
      const hero = document.getElementById(PV_HERO_ANCHOR);
      const steps = document.getElementById(PV_STEPS_ANCHOR);
      const section = document.getElementById(PV_STEPS_SECTION);
      if (!mq.matches || !hero || !steps || !section) {
        setPos(null);
        return;
      }
      const ra = hero.getBoundingClientRect();
      const rb = steps.getBoundingClientRect();
      const scrollY = window.scrollY;
      const start = scrollY + ra.top;
      const end = scrollY + section.getBoundingClientRect().top - 120;
      const raw = end > start ? (scrollY - start) / (end - start) : 0;
      const t = Math.min(1, Math.max(0, raw));
      const e = t * t * (3 - 2 * t);
      setPos({
        left: ra.left + (rb.left - ra.left) * e,
        top: ra.top + (rb.top - ra.top) * e,
        width: ra.width + (rb.width - ra.width) * e,
      });
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    const timer = window.setTimeout(update, 400);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, [product.key]);

  if (!pos) return null;

  return (
    <div
      className="pointer-events-none fixed z-30 hidden xl:block"
      style={{ left: pos.left, top: pos.top, width: pos.width, willChange: "transform" }}
      aria-hidden
    >
      <ProductVisualContent product={product} />
    </div>
  );
};

export default ProductFloatingVisual;
