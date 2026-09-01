import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { getRelatedProducts } from "@/data/products";
import { ProductHeroVisual } from "./ProductHeroVisual";

export const RelatedProducts = ({ currentSlug }: { currentSlug: string }) => {
  const others = getRelatedProducts(currentSlug);

  return (
    <section className="w-full py-16 sm:py-24">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="max-w-2xl">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            Plataforma Wiize
          </span>
          <h2 className="mt-3 font-display text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-3xl md:text-4xl">
            Escolha seu caminho
          </h2>
          <p className="mt-4 text-sm text-muted-foreground sm:text-base">
            Combine inteligência, automação e relacionamento para construir uma operação comercial
            mais eficiente.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {others.map((p, i) => (
            <motion.div
              key={p.slug}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45, delay: i * 0.05, ease: "easeOut" }}
            >
              <Link
                to={`/produtos/${p.slug}`}
                className="group flex h-full flex-col overflow-hidden rounded-panel border border-border/60 bg-card/60 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_18px_40px_-24px_hsl(var(--primary)/0.45)]"
              >
                <div className="relative h-40 overflow-hidden border-b border-border/50 bg-gradient-to-br from-primary/8 via-background to-background">
                  <div className="pointer-events-none absolute left-1/2 top-6 w-[22rem] origin-top -translate-x-1/2 scale-[0.62] transition-transform duration-500 group-hover:scale-[0.65]">
                    <ProductHeroVisual visual={p.key} />
                  </div>
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-card to-transparent" />
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-semibold text-foreground">{p.name}</h3>
                    <ArrowUpRight
                      size={16}
                      className="shrink-0 text-muted-foreground transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary"
                    />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{p.shortDescription}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RelatedProducts;
