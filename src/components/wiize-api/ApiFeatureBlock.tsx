import { motion } from "framer-motion";
import { HiCheckCircle } from "react-icons/hi2";
import { ProductStageShowcase } from "@/components/produtos/ProductStageShowcase";
import { getCardTheme } from "@/components/produtos/productCardThemes";
import type { ProductVisualKey } from "@/data/products";

export interface ApiFeature {
  eyebrow: string;
  title: string;
  titleHighlight?: string;
  description: string;
  bullets: string[];
  visual: ProductVisualKey;
}

interface Props {
  feature: ApiFeature;
  index?: number;
}

/** Bloco alternado texto + mockup animado com fundo verde (mesmo padrão das páginas de produto). */
export const ApiFeatureBlock = ({ feature, index = 0 }: Props) => {
  const reversed = index % 2 === 1;

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
      <h2 className="mt-3 font-display text-[clamp(1.55rem,3.05vw,2.6rem)] font-extrabold leading-[1.12] tracking-tight text-foreground">
        <span className="block text-balance">{feature.title}</span>
        {feature.titleHighlight && (
          <span className="block text-balance text-shimmer-highlight">{feature.titleHighlight}</span>
        )}
      </h2>
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
      <div className={`group mx-auto w-full min-w-0 max-w-full lg:mx-0 lg:max-w-[clamp(19rem,32vw,30rem)] ${reversed ? "lg:mr-auto" : "lg:ml-auto"}`}>
        <div className="overflow-hidden rounded-panel border border-border/60 bg-card/60">
          <div
            className={`relative h-[clamp(22rem,58vw,30rem)] overflow-hidden bg-gradient-to-br sm:h-[clamp(20rem,32vw,26rem)] lg:h-[clamp(19rem,26vw,24rem)] ${getCardTheme(feature.visual)}`}
          >
            <div className="pointer-events-none absolute -left-10 top-6 h-32 w-32 rounded-full bg-emerald-400/40 blur-3xl" aria-hidden />
            <div className="pointer-events-none absolute -right-8 bottom-10 h-28 w-28 rounded-full bg-teal-400/35 blur-3xl" aria-hidden />
            <div className="pointer-events-none absolute inset-x-0 top-7 flex justify-center px-4 lg:px-6">
              <div className="w-full max-w-full origin-top transition-transform duration-500 lg:max-w-[26rem] lg:scale-[0.94] lg:group-hover:scale-[0.97]">
                <ProductStageShowcase visual={feature.visual} stageIndex={index} playOnce />
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
      <div className="container mx-auto w-full max-w-[90rem] px-4 sm:px-10 lg:px-16">
        <div className="grid grid-cols-1 items-center gap-8 sm:gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] lg:gap-12">
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

export default ApiFeatureBlock;
