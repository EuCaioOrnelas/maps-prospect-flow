import { ProductStageShowcase } from "./ProductStageShowcase";
import type { ProductConfig } from "@/data/products";

export const PV_STEPS_SECTION = "pv-steps-section";

/** Conteúdo visual do produto: mockup animado correspondente ao produto. */
export const ProductVisualContent = ({ product }: { product: ProductConfig }) => (
  <div className="w-full">
    <ProductStageShowcase visual={product.key} />
  </div>
);

export default ProductVisualContent;
