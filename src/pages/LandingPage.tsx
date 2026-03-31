import { useParams } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { WarmingSection } from "@/components/landing/WarmingSection";
import { OfficialAPISection } from "@/components/landing/OfficialAPISection";
import { AIAgentsSection } from "@/components/landing/AIAgentsSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { CTASection } from "@/components/landing/CTASection";
import { Footer } from "@/components/landing/Footer";
import { useLandingPageTracking } from "@/hooks/useLandingPageTracking";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import NotFound from "./NotFound";

const LandingPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [pageExists, setPageExists] = useState<boolean | null>(null);
  const [pageName, setPageName] = useState<string>("");
  
  const { trackSignupClick } = useLandingPageTracking(slug || 'index');

  useEffect(() => {
    const checkPage = async () => {
      if (!slug) {
        setPageExists(false);
        return;
      }

      const { data } = await supabase
        .from('landing_pages')
        .select('id, name')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();

      setPageExists(!!data);
      if (data) {
        setPageName(data.name);
      }
    };

    checkPage();
  }, [slug]);

  if (pageExists === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!pageExists) {
    return <NotFound />;
  }

  return (
    <>
      <SEO 
        title="Prospecção Inteligente e Disparos em Massa"
        description="Encontre leads estratégicos com IA e faça disparos em massa via WhatsApp. Prospecção inteligente B2B, automação de mensagens e geração de leads qualificados."
        keywords="prospecção, leads, vendas, IA, inteligência artificial, clientes, B2B, geração de leads, marketing digital, disparos em massa, WhatsApp marketing, automação WhatsApp"
      />
      <main className="landing-light min-h-screen bg-background overflow-x-hidden w-full max-w-full">
        <Navbar onSignupClick={trackSignupClick} />
        <HeroSection onSignupClick={trackSignupClick} />
        <HowItWorksSection />
        <FeaturesSection />
        <OfficialAPISection />
        <WarmingSection />
        <AIAgentsSection />
        <TestimonialsSection />
        <PricingSection />
        <FAQSection />
        <CTASection onSignupClick={trackSignupClick} />
        <Footer />
      </main>
    </>
  );
};

export default LandingPage;
