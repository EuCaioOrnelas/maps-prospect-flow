import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { getRelatedProducts } from "@/data/products";
import { ProductHeroVisual } from "./ProductHeroVisual";

/* Paleta viva por card (tons que conversam com o verde Wiize) */
const CARD_THEMES: Record<string, string> = {
  prospeccao: "from-emerald-500/35 via-teal-400/18 to-lime-400/30",
  sdr: "from-teal-400/35 via-emerald-400/18 to-cyan-400/30",
  agenda: "from-lime-400/35 via-emerald-400/18 to-teal-400/30",
  engajamento: "from-emerald-400/35 via-lime-400/15 to-emerald-500/30",
  automacao: "from-cyan-400/20 via-teal-400/15 to-emerald-400/25",
  contratos: "from-emerald-500/35 via-emerald-300/18 to-lime-300/30",
};

export const RelatedProducts = ({ currentSlug }: { currentSlug: string }) => {
  const others = getRelatedProducts(currentSlug);
  const trackRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const update = () => {
      setAtStart(el.scrollLeft <= 8);
      setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 8);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const scrollBy = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-card]");
    const amount = card ? card.offsetWidth + 20 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  };

  const arrowBase =
    "flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-300";

  return (
    <section className="w-full py-16 sm:py-24">
      <div className="container mx-auto w-full max-w-[90rem] px-6 sm:px-10 lg:px-16">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Capte · Converta · Gerencie · Otimize
            </span>
            <h2 className="mt-3 font-display text-2xl font-extrabold leading-tight tracking-tight text-shimmer-highlight sm:text-3xl md:text-4xl">
              Uma operação comercial. Um único sistema.
            </h2>
            <p className="mt-4 text-sm text-muted-foreground sm:text-base">
              Você não precisa montar sua operação com várias ferramentas desconectadas. Cada produto
              da Wiize cobre uma etapa da jornada comercial e trabalha conectado aos demais.
            </p>
          </div>


          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              aria-label="Ver produtos anteriores"
              onClick={() => scrollBy(-1)}
              disabled={atStart}
              className={`${arrowBase} ${
                atStart
                  ? "cursor-not-allowed border-border/40 bg-muted/40 text-muted-foreground/40"
                  : "border-border/70 bg-card/70 text-foreground hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary"
              }`}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              aria-label="Ver próximos produtos"
              onClick={() => scrollBy(1)}
              disabled={atEnd}
              className={`${arrowBase} ${
                atEnd
                  ? "cursor-not-allowed border-border/40 bg-muted/40 text-muted-foreground/40"
                  : "border-border/70 bg-card/70 text-foreground hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary"
              }`}
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
              className="w-[76%] shrink-0 snap-start sm:w-[44%] lg:w-[28.5%]"
            >
              <Link
                to={`/produtos/${p.slug}`}
                className="group flex h-full flex-col overflow-hidden rounded-panel border border-border/60 bg-card/60 transition-transform duration-300 hover:-translate-y-1 hover:scale-[1.02]"
              >
                <div
                  className={`relative h-52 overflow-hidden border-b border-border/50 bg-gradient-to-br ${
                    CARD_THEMES[p.key] ?? "from-primary/20 via-primary/8 to-emerald-400/15"
                  }`}
                >
                  {/* brilhos internos coloridos */}
                  <div
                    className="pointer-events-none absolute -left-8 top-4 h-24 w-24 rounded-full bg-emerald-400/45 blur-2xl"
                    aria-hidden
                  />
                  <div
                    className="pointer-events-none absolute -right-6 bottom-8 h-20 w-20 rounded-full bg-teal-400/40 blur-2xl"
                    aria-hidden
                  />
                  <div className="pointer-events-none absolute left-1/2 top-7 w-[22rem] origin-top -translate-x-1/2 scale-[0.66] transition-transform duration-500 group-hover:scale-[0.7]">
                    <ProductHeroVisual visual={p.key} />
                  </div>
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-card via-card/70 to-transparent" />
                </div>

                <div className="flex flex-1 flex-col p-5">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                    {p.stage}
                  </span>
                  <div className="mt-2 flex items-start justify-between gap-3">
                    <h3 className="text-base font-semibold text-foreground">{p.name}</h3>
                    <ArrowUpRight
                      size={16}
                      className="shrink-0 text-muted-foreground transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary"
                    />
                  </div>
                  <p className="mt-1 text-sm font-medium text-foreground/80">{p.cardTagline}</p>
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
