import { SEO } from "@/components/SEO";
import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { CTASection } from "@/components/landing/CTASection";
import { Footer } from "@/components/landing/Footer";
import { useLandingPageTracking } from "@/hooks/useLandingPageTracking";

const Index = () => {
  // Track the main index page
  const { trackSignupClick } = useLandingPageTracking('index');

  return (
    <>
      <SEO 
        title="Prospecção Inteligente com IA | Disparos em Massa WhatsApp"
        description="Prospecte novos clientes com IA. Encontre leads qualificados, faça disparos em massa via WhatsApp e aumente suas vendas. Teste grátis por 30 dias com 10 buscas e 400 disparos!"
        keywords="prospecção, leads, vendas, IA, inteligência artificial, disparos em massa, WhatsApp, WiizeProspect, prospectar clientes, geração de leads, marketing digital, vendas B2B, automação WhatsApp, captação de clientes, prospecção inteligente, buscar leads, encontrar clientes"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebApplication",
          "name": "WiizeProspect",
          "applicationCategory": "BusinessApplication",
          "operatingSystem": "Web",
          "description": "Plataforma de prospecção inteligente com IA para encontrar leads qualificados e fazer disparos em massa via WhatsApp",
          "url": "https://wiizeprospect.com.br",
          "offers": {
            "@type": "AggregateOffer",
            "lowPrice": "97",
            "highPrice": "497",
            "priceCurrency": "BRL",
            "offerCount": "3"
          },
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.9",
            "ratingCount": "500",
            "bestRating": "5"
          }
        }}
      />
      <main className="min-h-screen bg-background overflow-x-hidden">
        <Navbar onSignupClick={trackSignupClick} />
        <HeroSection onSignupClick={trackSignupClick} />
        <FeaturesSection />
        <TestimonialsSection />
        <PricingSection />
        <FAQSection />
        <CTASection onSignupClick={trackSignupClick} />
        <Footer />
      </main>
    </>
  );
};

export default Index;
