import { Navigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { CTASection } from "@/components/landing/CTASection";
import { SEO } from "@/components/SEO";
import { ProductHero } from "@/components/produtos/ProductHero";
import { ProductVisualContent } from "@/components/produtos/ProductFloatingVisual";

import { ProductHowItWorks } from "@/components/produtos/ProductHowItWorks";
import { ProductFeatureBlock } from "@/components/produtos/ProductFeatureBlock";
import { RelatedProducts } from "@/components/produtos/RelatedProducts";
import { getProductBySlug, PRODUCTS } from "@/data/products";

import { HiRocketLaunch, HiChartBarSquare, HiShieldCheck } from "react-icons/hi2";

const PROOF_ICONS = [HiRocketLaunch, HiChartBarSquare, HiShieldCheck];

const SITE_URL = "https://wiize.com.br";


export default function ProdutoPage() {
  const { slug } = useParams();
  const product = getProductBySlug(slug);

  if (!product) {
    return <Navigate to={`/produtos/${PRODUCTS[0].slug}`} replace />;
  }

  const url = `${SITE_URL}/produtos/${product.slug}`;

  return (
    <div className="min-h-screen w-full bg-background">
      <SEO
        title={product.seoTitle}
        description={product.seoDescription}
        keywords={product.keywords}
        url={url}
        type="website"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: `Wiize ${product.name}`,
          description: product.seoDescription,
          brand: { "@type": "Brand", name: "Wiize" },
          category: product.category,
          url,
        }}
      />

      <Navbar />

      <main>
        {/* Um único mockup acompanha Hero + Como funciona pela coluna direita. */}
        <div className="relative">
          <div className="pointer-events-none absolute inset-0 z-20 hidden lg:block">
            <div className="container mx-auto grid h-full w-full max-w-[90rem] grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] gap-12 lg:gap-12 px-6 sm:px-10 lg:px-16">
              <div aria-hidden="true" />
              <div className="h-full min-w-0">
                <div className="sticky top-24 flex min-h-[calc(100vh-7rem)] items-center">
                  <div className="ml-auto mr-0 w-full min-w-0" style={{ maxWidth: "clamp(19rem, 32vw, 32rem)" }}>
                    <ProductVisualContent product={product} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <ProductHero product={product} sharedDesktopVisual />

          <ProductHowItWorks
            title={product.howItWorksTitle}
            highlight={product.howItWorksHighlight}
            steps={product.howItWorks}
          />
        </div>

        {/* Conteúdo posterior à jornada inicial do produto. */}
        <div className="relative z-10">

          {product.features.map((feature, i) => (
            <ProductFeatureBlock key={feature.title} feature={feature} visual={product.key} index={i} />
          ))}

          {/* Prova visual */}
          <section className="w-full py-12 sm:py-16">
            <div className="container mx-auto w-full max-w-[90rem] px-6 sm:px-10 lg:px-16">
              <div className="grid gap-4 sm:grid-cols-3">
                {product.proof.map((p, i) => {
                  const Icon = PROOF_ICONS[i % PROOF_ICONS.length];
                  return (
                    <motion.div
                      key={p.label}
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.3 }}
                      transition={{ duration: 0.4, delay: i * 0.05, ease: "easeOut" }}
                      className="flex items-center gap-4 rounded-panel border border-border/50 p-5"
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase leading-tight tracking-[0.16em] text-muted-foreground">
                          {p.label}
                        </p>
                        <p className="mt-1 font-display text-xl font-extrabold leading-tight text-primary">
                          {p.value}
                        </p>
                        <p className="mt-1 text-sm leading-snug text-muted-foreground">{p.hint}</p>
                      </div>
                    </motion.div>
                  );
                })}

              </div>
            </div>
          </section>

          <RelatedProducts currentSlug={product.slug} />
        </div>

        <CTASection />
      </main>

      <Footer />
    </div>
  );
}
