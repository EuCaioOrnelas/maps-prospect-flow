import { useMemo } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { ProductStageShowcase } from "./ProductStageShowcase";
import type { ProductFeature, ProductVisualKey } from "@/data/products";

interface ProductFeatureBlockProps {
  feature: ProductFeature;
  visual: ProductVisualKey;
  index?: number;
}

function SplitTitle({ title, highlight }: { title: string; highlight?: string }) {
  const parts = useMemo(() => {
    if (!highlight || !title.includes(highlight)) return { before: title, match: "", after: "" };
    const idx = title.indexOf(highlight);
    return {
      before: title.slice(0, idx),
      match: highlight,
      after: title.slice(idx + highlight.length),
    };
  }, [title, highlight]);

  return (
    <h2 className="mt-3 font-display text-2xl font-extrabold leading-tight tracking-tight text-foreground sm:text-3xl">
      {parts.before && <span>{parts.before}</span>}
      {parts.match && (
        <span className="block text-shimmer-highlight whitespace-nowrap">{parts.match}</span>
      )}
      {parts.after && <span>{parts.after}</span>}
    </h2>
  );
}

export const ProductFeatureBlock = ({ feature, visual, index = 0 }: ProductFeatureBlockProps) => (
  <section className="w-full py-12 sm:py-16">
    <div className="container mx-auto w-full max-w-[90rem] px-6 sm:px-10 lg:px-16">
      <div
        className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-16 ${
          feature.reverse ? "lg:[&>*:first-child]:order-2" : ""
        }`}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            {feature.eyebrow}
          </span>
          <SplitTitle title={feature.title} highlight={feature.titleHighlight} />
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
            {feature.description}
          </p>
          <ul className="mt-6 space-y-3">
            {feature.bullets.map((b) => (
              <li key={b} className="flex items-start gap-3 text-sm text-foreground/85">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Check size={12} className="text-primary" />
                </span>
                {b}
              </li>
            ))}
          </ul>
          {feature.metrics && (
            <div className="mt-7 grid max-w-md grid-cols-2 gap-3">
              {feature.metrics.map((m) => (
                <div key={m.label} className="rounded-panel border border-border/60 bg-card/60 p-3">
                  <p className="text-[11px] text-muted-foreground">{m.label}</p>
                  <p className="text-base font-semibold text-foreground">{m.value}</p>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.55, delay: 0.05, ease: "easeOut" }}
          className="flex justify-center lg:justify-end"
        >
          <ProductStageShowcase visual={visual} stageIndex={index} />
        </motion.div>
      </div>
    </div>
  </section>
);

export default ProductFeatureBlock;
