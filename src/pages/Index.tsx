import { SEO } from "@/components/SEO";
import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
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
        title="Prospecção Inteligente e Disparos em Massa"
        description="Encontre leads estratégicos com IA e faça disparos em massa via WhatsApp. Prospecção inteligente B2B, automação de mensagens e geração de leads qualificados."
        keywords="prospecção, leads, vendas, IA, inteligência artificial, clientes, B2B, geração de leads, marketing digital, disparos em massa, WhatsApp marketing, automação WhatsApp, prospecção de clientes, WiizeProspect, ferramenta de prospecção, captar clientes, envio de mensagens em massa, leads qualificados, prospectar novos clientes"
      />
      <main className="min-h-screen bg-background overflow-x-hidden w-full max-w-full">
        <Navbar onSignupClick={trackSignupClick} />
        <HeroSection onSignupClick={trackSignupClick} />
        <HowItWorksSection />
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
