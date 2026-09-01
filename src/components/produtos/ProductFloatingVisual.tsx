import { ProductHeroVisual } from "./ProductHeroVisual";
import prospeccaoHeroAsset from "@/assets/prospeccao-hero-v2.png.asset.json";
import type { ProductConfig } from "@/data/products";

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

export default ProductVisualContent;
