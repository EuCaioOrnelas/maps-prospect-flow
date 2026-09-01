import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { getRelatedProducts } from "@/data/products";
import { ProductHeroVisual } from "./ProductHeroVisual";

export const RelatedProducts = ({ currentSlug }: { currentSlug: string }) => {
  const others = getRelatedProducts(currentSlug);
  const trackRef = useRef<HTMLDivElement>(null);

  const scrollBy = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-card]");
    const amount = card ? card.offsetWidth + 20 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  };

  return (
    <section className="w-full py-16 sm:py-24">
      <div className="container mx-auto w-full max-w-[90rem] px-6 sm:px-10 lg:px-16">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
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

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              aria-label="Ver produtos anteriores"
              onClick={() => scrollBy(-1)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-card/70 text-foreground transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              aria-label="Ver próximos produtos"
              onClick={() => scrollBy(1)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-card/70 text-foreground transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div
          ref={trackRef}
          className="mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {others.map((p, i) => (
            <motion.div
              key={p.slug}
              data-card
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45, delay: i * 0.05, ease: "easeOut" }}
              className="w-[78%] shrink-0 snap-start sm:w-[46%] lg:w-[31%]"
            >
              <Link
                to={`/produtos/${p.slug}`}
                className="group flex h-full flex-col overflow-hidden rounded-panel border border-border/60 bg-card/60 transition-transform duration-300 hover:-translate-y-1 hover:scale-[1.02]"
              >
                <div className="relative h-44 overflow-hidden border-b border-border/50 bg-gradient-to-br from-primary/15 via-primary/5 to-emerald-400/10">
                  <div className="pointer-events-none absolute left-1/2 top-6 w-[22rem] origin-top -translate-x-1/2 scale-[0.62] transition-transform duration-500 group-hover:scale-[0.66]">
                    <ProductHeroVisual visual={p.key} />
                  </div>
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-card via-card/70 to-transparent" />
                </div>

                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-semibold text-foreground">{p.name}</h3>
                    <ArrowUpRight
                      size={16}
                      className="shrink-0 text-muted-foreground transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary"
                    />
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {p.cardDescription ?? p.shortDescription}
                  </p>
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
