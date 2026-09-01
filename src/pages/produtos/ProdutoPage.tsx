import { Navigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { CTASection } from "@/components/landing/CTASection";
import { SEO } from "@/components/SEO";
import { ProductHero } from "@/components/produtos/ProductHero";
import { ProductHowItWorks } from "@/components/produtos/ProductHowItWorks";
import { ProductFeatureBlock } from "@/components/produtos/ProductFeatureBlock";
import { ProductSectionDivider } from "@/components/produtos/ProductSectionDivider";
import { RelatedProducts } from "@/components/produtos/RelatedProducts";
import { getProductBySlug, PRODUCTS } from "@/data/products";

const SITE_URL = "https://wiize.com.br";

export default function ProdutoPage() {
  const { slug } = useParams();
  const product = getProductBySlug(slug);

  if (!product) {
    return <Navigate to={`/produtos/${PRODUCTS[0].slug}`} replace />;
  }

  const url = `${SITE_URL}/produtos/${product.slug}`;

  return (
    <div className="min-h-screen w-full overflow-x-clip bg-background">
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
        <ProductHero product={product} />

        {/* Conteúdo acima da faixa de plasma que cruza o fim do hero */}
        <div className="relative z-10">
          <ProductHowItWorks title={product.howItWorksTitle} steps={product.howItWorks} />

          {product.features.map((feature, i) => (
            <div key={feature.title}>
              {i === 2 && <ProductSectionDivider />}
              <ProductFeatureBlock feature={feature} visual={product.key} />
            </div>
          ))}

          {/* Prova visual */}
          <section className="w-full py-12 sm:py-16">
            <div className="container mx-auto w-full max-w-[90rem] px-6 sm:px-10 lg:px-16">
              <div className="grid gap-4 sm:grid-cols-3">
                {product.proof.map((p, i) => (
                  <motion.div
                    key={p.label}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.4, delay: i * 0.05, ease: "easeOut" }}
                    className="rounded-panel border border-border/60 bg-card/60 p-5"
                  >
                    <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                      {p.label}
                    </p>
                    <p className="mt-2 font-display text-2xl font-bold text-foreground">{p.value}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{p.hint}</p>
                  </motion.div>
                ))}
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
