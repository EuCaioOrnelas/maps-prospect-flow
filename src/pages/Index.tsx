import { lazy, Suspense, useEffect, useState } from "react";
import { SEO, siteNavigationSchema } from "@/components/SEO";
import { faqJsonLd } from "@/components/landing/FAQSection";
import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { TrustedBySection } from "@/components/landing/TrustedBySection";
import { Footer } from "@/components/landing/Footer";
import { useLandingPageTracking } from "@/hooks/useLandingPageTracking";
import { LandingPageSkeleton } from "@/components/landing/LandingPageSkeleton";
import { FloatingChatButton } from "@/components/landing/FloatingChatButton";
import { ProblemSection } from "@/components/sales/ProblemSection";

/**
 * Performance: above the fold (Navbar + Hero + TrustedBy + Footer básico)
 * carrega imediatamente. Tudo abaixo é lazy via dynamic import — reduz JS inicial,
 * melhora LCP/INP e elimina jank de animações que rodavam fora da tela.
 */
const MidCTASection = lazy(() =>
  import("@/components/sales/MidCTASection").then((m) => ({ default: m.MidCTASection })),
);
const OpportunitySection = lazy(() =>
  import("@/components/sales/OpportunitySection").then((m) => ({ default: m.OpportunitySection })),
);
const MechanismSection = lazy(() =>
  import("@/components/sales/MechanismSection").then((m) => ({ default: m.MechanismSection })),
);
const WhyItWorksSection = lazy(() =>
  import("@/components/sales/WhyItWorksSection").then((m) => ({ default: m.WhyItWorksSection })),
);
const PlatformModulesSection = lazy(() =>
  import("@/components/sales/PlatformModulesSection").then((m) => ({
    default: m.PlatformModulesSection,
  })),
);
const TestimonialsSection = lazy(() =>
  import("@/components/landing/TestimonialsSection").then((m) => ({
    default: m.TestimonialsSection,
  })),
);
const PricingSection = lazy(() =>
  import("@/components/landing/PricingSection").then((m) => ({ default: m.PricingSection })),
);
const FAQSection = lazy(() =>
  import("@/components/landing/FAQSection").then((m) => ({ default: m.FAQSection })),
);
const CTASection = lazy(() =>
  import("@/components/landing/CTASection").then((m) => ({ default: m.CTASection })),
);

// Placeholder leve enquanto o chunk baixa — evita layout shift abrupto.
const SectionFallback = () => <div className="h-[40vh] w-full" aria-hidden="true" />;

const Index = () => {
  const [isReady, setIsReady] = useState(false);
  const { trackSignupClick } = useLandingPageTracking("index");

  useEffect(() => {
    // Timeout fallback to prevent infinite loading
    const timeout = setTimeout(() => setIsReady(true), 1500);

    if (document.fonts) {
      document.fonts.ready
        .then(() => {
          clearTimeout(timeout);
          setIsReady(true);
        })
        .catch(() => {
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
        description="Plataforma de vendas B2B que centraliza e automatiza sua operação comercial com IA: capte oportunidades, converse com clientes, feche vendas e gerencie tudo em um só lugar."
        keywords="plataforma de vendas B2B, software de vendas B2B, prospecção B2B, encontrar clientes B2B, agendamento de reuniões, SDR com IA, follow-up automático, WhatsApp Business oficial, pipeline B2B, CRM, ICP, Wiize"
        url="https://wiize.com.br/"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "Wiize",
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            description:
              "Plataforma de vendas B2B que centraliza e automatiza a operação comercial com IA: captação, análise, abordagem, conversas, follow-up, reuniões e CRM em um só lugar.",
            offers: {
              "@type": "AggregateOffer",
              priceCurrency: "BRL",
              lowPrice: "97",
              highPrice: "497",
              offerCount: "3",
            },
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: "4.9",
              ratingCount: "500",
              bestRating: "5",
            },
          },
          siteNavigationSchema,
          faqJsonLd,
        ]}
      />

      <main className="landing-light min-h-screen bg-background overflow-x-hidden overflow-y-auto w-full max-w-full relative">
        {/* Background blobs — versão leve.
            - Apenas 2 blobs (era 3) e ocultos no mobile (sm:block) onde causavam jank.
            - contain: strict isola layout/paint do navegador. */}
        <div
          className="hidden sm:block fixed inset-0 pointer-events-none overflow-hidden z-0"
          style={{ contain: "strict" }}
          aria-hidden="true"
        >
          <div
            className="absolute -top-[20%] -right-[10%] w-[60%] h-[50%] rounded-full opacity-[0.07]"
            style={{ background: "radial-gradient(ellipse, hsl(158 72% 45%), transparent 70%)" }}
          />
          <div
            className="absolute top-[50%] -left-[15%] w-[50%] h-[50%] rounded-full opacity-[0.05]"
            style={{ background: "radial-gradient(ellipse, hsl(200 80% 55%), transparent 70%)" }}
          />
        </div>
        <div className="relative z-10">
          <Navbar onSignupClick={trackSignupClick} />
          <HeroSection onSignupClick={trackSignupClick} />
          <TrustedBySection />

          {/* A primeira seção pós-hero não fica dentro de Suspense/lazy:
              evita fallback curto mostrar o Footer antes do bloco de dor. */}
          <ProblemSection />

          <Suspense fallback={<SectionFallback />}>
            {/* Hierarquia: solução → ponte (operação conectada) → dentro da plataforma → benefício → prova → oferta */}
            <MechanismSection />
            <OpportunitySection />
            <MidCTASection onSignupClick={trackSignupClick} />
            <PlatformModulesSection />
            <WhyItWorksSection />
            <TestimonialsSection />
            <PricingSection />
            <FAQSection />
            <CTASection onSignupClick={trackSignupClick} />
          </Suspense>




          <Footer />
          <FloatingChatButton />
        </div>
      </main>
    </>
  );
};

export default Index;
