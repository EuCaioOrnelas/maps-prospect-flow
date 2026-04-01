import { SEO } from "@/components/SEO";
import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { ImpactNumbersSection } from "@/components/landing/ImpactNumbersSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { TrustedBySection } from "@/components/landing/TrustedBySection";
import { WarmingSection } from "@/components/landing/WarmingSection";
import { OfficialAPISection } from "@/components/landing/OfficialAPISection";
import { AIAgentsSection } from "@/components/landing/AIAgentsSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { CTASection } from "@/components/landing/CTASection";
import { Footer } from "@/components/landing/Footer";
import { useLandingPageTracking } from "@/hooks/useLandingPageTracking";
import { LandingPageSkeleton } from "@/components/landing/LandingPageSkeleton";
import { useState, useEffect } from "react";

const Index = () => {
  const [isReady, setIsReady] = useState(false);
  const { trackSignupClick } = useLandingPageTracking('index');

  // Wait for fonts and critical assets to load
  useEffect(() => {
    // Check if document fonts are ready
    if (document.fonts) {
      document.fonts.ready.then(() => {
        setIsReady(true);
      });
    } else {
      // Fallback for browsers without Font Loading API
      setIsReady(true);
    }
  }, []);

  if (!isReady) {
    return <LandingPageSkeleton />;
  }

  return (
    <>
      <SEO 
        title="Prospecção Inteligente e Disparos em Massa"
        description="Encontre leads estratégicos com IA e faça disparos em massa via WhatsApp. Prospecção inteligente B2B, automação de mensagens e geração de leads qualificados."
        keywords="prospecção, leads, vendas, IA, inteligência artificial, clientes, B2B, geração de leads, marketing digital, disparos em massa, WhatsApp marketing, automação WhatsApp, prospecção de clientes, Wiize, ferramenta de prospecção, captar clientes, envio de mensagens em massa, leads qualificados, prospectar novos clientes"
      />
      <main className="landing-light min-h-screen bg-background overflow-x-hidden overflow-y-auto w-full max-w-full relative">
        {/* Aurora/mesh gradient background - gives life to the page */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          {/* Top-right warm blob */}
          <div className="absolute -top-[20%] -right-[10%] w-[60%] h-[50%] rounded-full opacity-[0.07]"
            style={{ background: 'radial-gradient(ellipse, hsl(158 72% 45%), transparent 70%)' }} />
          {/* Center-left cool blob */}
          <div className="absolute top-[30%] -left-[15%] w-[50%] h-[50%] rounded-full opacity-[0.05]"
            style={{ background: 'radial-gradient(ellipse, hsl(200 80% 55%), transparent 70%)' }} />
          {/* Bottom emerald blob */}
          <div className="absolute top-[60%] right-[5%] w-[45%] h-[40%] rounded-full opacity-[0.05]"
            style={{ background: 'radial-gradient(ellipse, hsl(170 65% 40%), transparent 70%)' }} />
          {/* Subtle grid pattern overlay */}
          <div className="absolute inset-0 opacity-[0.02]"
            style={{ backgroundImage: 'radial-gradient(hsl(220 25% 14%) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        </div>
        <div className="relative z-10">
          <Navbar onSignupClick={trackSignupClick} />
          <HeroSection onSignupClick={trackSignupClick} />
          <TrustedBySection />
          <HowItWorksSection />
          <FeaturesSection />
          <ImpactNumbersSection />
          <OfficialAPISection />
          <WarmingSection />
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

export default Index;
