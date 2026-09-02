import { useMemo } from "react";
import { motion } from "framer-motion";
import { HiCheckCircle, HiBolt, HiArrowTrendingUp, HiSparkles, HiShieldCheck } from "react-icons/hi2";

const METRIC_ICONS = [HiArrowTrendingUp, HiBolt, HiSparkles, HiShieldCheck];

import { ProductStageShowcase } from "./ProductStageShowcase";
import { getCardTheme } from "./productCardThemes";
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
    <h2 className="mt-3 max-w-full font-display text-[clamp(1.55rem,3.05vw,2.6rem)] font-extrabold leading-[1.12] tracking-tight text-foreground">
      {parts.before && <span className={parts.match ? "block whitespace-nowrap" : "line-clamp-2"}>{parts.before.trim()}</span>}
      {parts.match && (
        <span className="block whitespace-nowrap text-shimmer-highlight">{parts.match}</span>
      )}
      {parts.after && <span>{parts.after}</span>}
    </h2>
  );
}

export const ProductFeatureBlock = ({ feature, visual, index = 0 }: ProductFeatureBlockProps) => {
  const reversed = feature.reverse ?? index % 2 === 1;
  // Mantém as laterais alinhadas entre seções: a coluna da esquerda sempre
  // mede 0.9fr e a da direita 1fr, independente de ser texto+imagem ou imagem+texto.
  const gridCols = "lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)]";

  const textColumn = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="order-1 min-w-0 lg:order-none"
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
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/15">
              <HiCheckCircle className="h-3.5 w-3.5 text-primary" />
            </span>
            {b}
          </li>
        ))}
      </ul>
      {feature.metrics && (
        <div className="mt-7 grid max-w-md grid-cols-1 gap-3 sm:grid-cols-2">
          {feature.metrics.map((m, mi) => {
            const Icon = METRIC_ICONS[mi % METRIC_ICONS.length];
            return (
              <div
                key={m.label}
                className="flex items-center gap-3 rounded-panel border border-border/50 p-3.5"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase leading-tight tracking-[0.14em] text-muted-foreground">
                    {m.label}
                  </p>
                  <p className="mt-0.5 font-display text-base font-bold leading-tight text-primary">
                    {m.value}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );

  const visualColumn = (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.55, delay: 0.05, ease: "easeOut" }}
      className={`order-2 flex min-w-0 justify-center lg:order-none ${reversed ? "lg:justify-start" : "lg:justify-end"}`}
    >
      <div
        className={`group mx-auto w-full min-w-0 lg:mx-0 ${reversed ? "lg:mr-auto" : "lg:ml-auto"}`}
        style={{ maxWidth: "clamp(19rem, 32vw, 30rem)" }}
      >
        <div className="overflow-hidden rounded-panel border border-border/60 bg-card/60">
          <div
            className={`relative h-[clamp(19rem,26vw,24rem)] overflow-hidden bg-gradient-to-br ${getCardTheme(visual)}`}
          >
            <div
              className="pointer-events-none absolute -left-10 top-6 h-32 w-32 rounded-full bg-emerald-400/40 blur-3xl"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -right-8 bottom-10 h-28 w-28 rounded-full bg-teal-400/35 blur-3xl"
              aria-hidden
            />
            <div className="pointer-events-none absolute inset-x-0 top-7 flex justify-center px-6">
              <div className="w-full max-w-[26rem] origin-top scale-[0.94] transition-transform duration-500 group-hover:scale-[0.97]">
                <ProductStageShowcase visual={visual} stageIndex={index} playOnce />
              </div>
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card via-card/70 to-transparent" />
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <section className="w-full py-12 sm:py-16">
      <div className="container mx-auto w-full max-w-[90rem] px-6 sm:px-10 lg:px-16">
        <div className={`grid grid-cols-1 items-center gap-8 sm:gap-10 ${gridCols} lg:gap-12`}>
          {reversed ? (
            <>
              {visualColumn}
              {textColumn}
            </>
          ) : (
            <>
              {textColumn}
              {visualColumn}
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default ProductFeatureBlock;
