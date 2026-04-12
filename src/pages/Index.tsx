import { SEO } from "@/components/SEO";
import { faqJsonLd } from "@/components/landing/FAQSection";
import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";

import { TrustedBySection } from "@/components/landing/TrustedBySection";
import { ProblemSection } from "@/components/sales/ProblemSection";
import { OpportunitySection } from "@/components/sales/OpportunitySection";
import { MechanismSection } from "@/components/sales/MechanismSection";
import { FeaturesOverviewSection } from "@/components/sales/FeaturesOverviewSection";

import { OfficialAPISection } from "@/components/landing/OfficialAPISection";
import { CpuDividerSection } from "@/components/landing/CpuDividerSection";
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

  useEffect(() => {
    // Timeout fallback to prevent infinite loading
    const timeout = setTimeout(() => setIsReady(true), 1500);
    
    if (document.fonts) {
      document.fonts.ready.then(() => {
        clearTimeout(timeout);
        setIsReady(true);
      }).catch(() => {
        clearTimeout(timeout);
        setIsReady(true);
      });
    } else {
      clearTimeout(timeout);
      setIsReady(true);
    }
    
    return () => clearTimeout(timeout);
  }, []);

  if (!isReady) {
    return <LandingPageSkeleton />;
  }

  return (
    <>
      <SEO 
        title="Prospecção Inteligente e Disparos em Massa via WhatsApp"
        description="Encontre leads estratégicos com IA e faça disparos em massa via WhatsApp. Prospecção inteligente B2B, automação de mensagens, CRM e agente de IA para converter mais clientes. Comece grátis!"
        keywords="prospecção, leads, vendas, IA, inteligência artificial, clientes, B2B, geração de leads, marketing digital, disparos em massa, WhatsApp marketing, automação WhatsApp, prospecção de clientes, Wiize, ferramenta de prospecção, captar clientes, envio de mensagens em massa, leads qualificados, prospectar novos clientes, CRM, agente de IA, aquecimento de chip, Google Maps leads"
        url="https://wiize.com.br/"
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'Wiize',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            description: 'Plataforma de prospecção inteligente com IA. Encontre leads no Google Maps, faça disparos em massa via WhatsApp e converta com agente de IA.',
            offers: {
              '@type': 'AggregateOffer',
              priceCurrency: 'BRL',
              lowPrice: '97',
              highPrice: '497',
              offerCount: '3',
            },
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: '4.9',
              ratingCount: '500',
              bestRating: '5',
            },
          },
          faqJsonLd,
        ]}
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
          
          <ProblemSection />
          <OpportunitySection />
          <MechanismSection />
          <FeaturesOverviewSection />
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

export default Index;
