import { useParams } from "react-router-dom";
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
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import NotFound from "./NotFound";

const LandingPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [pageExists, setPageExists] = useState<boolean | null>(null);
  const [pageName, setPageName] = useState<string>("");
  
  // Initialize tracking for this page
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

  // Show loading while checking
  if (pageExists === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show 404 if page doesn't exist
  if (!pageExists) {
    return <NotFound />;
  }

  return (
    <>
      <SEO 
        title="Prospecção Inteligente com IA"
        description="Encontre leads estratégicos com IA. Nossa tecnologia analisa milhares de empresas e entrega apenas os melhores leads para prospectar novos clientes."
        keywords="prospecção, leads, vendas, IA, inteligência artificial, clientes, B2B, geração de leads, marketing digital"
      />
      <main className="min-h-screen bg-background overflow-x-hidden">
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

export default LandingPage;
