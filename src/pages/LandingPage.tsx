import { useParams } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { ImpactNumbersSection } from "@/components/landing/ImpactNumbersSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { TrustedBySection } from "@/components/landing/TrustedBySection";

import { OfficialAPISection } from "@/components/landing/OfficialAPISection";
import { CpuDividerSection } from "@/components/landing/CpuDividerSection";
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
        title="Prospecção Inteligente e Disparos em Massa via WhatsApp"
        description="Encontre leads estratégicos com IA e faça disparos em massa via WhatsApp. Prospecção inteligente B2B, automação de mensagens e geração de leads qualificados. Comece grátis!"
        keywords="prospecção, leads, vendas, IA, inteligência artificial, clientes, B2B, geração de leads, marketing digital, disparos em massa, WhatsApp marketing, automação WhatsApp, Wiize"
      />
      <main className="landing-light min-h-screen bg-background overflow-x-hidden overflow-y-auto w-full max-w-full relative">
        {/* Aurora/mesh gradient background */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute -top-[20%] -right-[10%] w-[60%] h-[50%] rounded-full opacity-[0.12] will-change-auto"
            style={{ background: 'radial-gradient(ellipse, hsl(158 72% 45%), transparent 70%)' }} />
          <div className="absolute top-[30%] -left-[15%] w-[50%] h-[50%] rounded-full opacity-[0.09] will-change-auto"
            style={{ background: 'radial-gradient(ellipse, hsl(200 80% 55%), transparent 70%)' }} />
          <div className="absolute top-[60%] right-[5%] w-[45%] h-[40%] rounded-full opacity-[0.09] will-change-auto"
            style={{ background: 'radial-gradient(ellipse, hsl(170 65% 40%), transparent 70%)' }} />
        </div>
        <div className="relative z-10">
          <Navbar onSignupClick={trackSignupClick} />
          <HeroSection onSignupClick={trackSignupClick} />
          <TrustedBySection />
          <HowItWorksSection />
          <FeaturesSection />
          <ImpactNumbersSection />
          <OfficialAPISection />
          
          <CpuDividerSection />
          <AIAgentsSection />
          <TestimonialsSection />
          <PricingSection />
          <FAQSection />
          <CTASection onSignupClick={trackSignupClick} />
          <Footer />
        </div>
      </main>
    </>
  );
};

export default LandingPage;
