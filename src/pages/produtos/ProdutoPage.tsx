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

        <CTASection />
      </main>

      <Footer />
    </div>
  );
}
