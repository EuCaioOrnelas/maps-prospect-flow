import { motion } from "framer-motion";
import { Check } from "lucide-react";
import type { ProductStep } from "@/data/products";

interface ProductHowItWorksProps {
  title: string;
  steps: ProductStep[];
}

export const ProductHowItWorks = ({ title, steps }: ProductHowItWorksProps) => (
  <section className="w-full py-16 sm:py-24">
    <div className="container mx-auto max-w-6xl px-4">
      <div className="grid gap-10 lg:grid-cols-[0.95fr_1fr] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            Como funciona
          </span>
          <h2 className="mt-3 font-display text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-3xl md:text-4xl">
            {title}
          </h2>
        </div>

        <ol className="relative space-y-8 border-l border-border/70 pl-6 sm:space-y-10 sm:pl-8">
          {steps.map((step, i) => (
            <motion.li
              key={step.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.45, delay: i * 0.05, ease: "easeOut" }}
              className="relative"
            >
              <span className="absolute -left-[2.1rem] flex h-7 w-7 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-[11px] font-bold text-primary sm:-left-[2.6rem]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="text-base font-semibold text-foreground sm:text-lg">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
              <div className="mt-4 rounded-panel border border-border/60 bg-card/60 p-3 sm:p-4">
                <ul className="space-y-2">
                  {step.preview.map((line) => (
                    <li key={line} className="flex items-center gap-2 text-[13px] text-foreground/80">
                      <Check size={13} className="shrink-0 text-primary" />
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.li>
          ))}
        </ol>
      </div>
    </div>
  </section>
);

export default ProductHowItWorks;
