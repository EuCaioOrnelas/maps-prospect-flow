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

const OpportunitySection = lazy(() =>
  import("@/components/sales/OpportunitySection").then((m) => ({ default: m.OpportunitySection })),
);
const MechanismSection = lazy(() =>
  import("@/components/sales/MechanismSection").then((m) => ({ default: m.MechanismSection })),
);
const FeaturesOverviewSection = lazy(() =>
  import("@/components/sales/FeaturesOverviewSection").then((m) => ({
    default: m.FeaturesOverviewSection,
  })),
);
const WhyItWorksSection = lazy(() =>
  import("@/components/sales/WhyItWorksSection").then((m) => ({ default: m.WhyItWorksSection })),
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

const SectionFallback = () => <div className="h-[40vh] w-full" aria-hidden="true" />;

const Prospeccao = () => {
  const [isReady, setIsReady] = useState(false);
  const { trackSignupClick } = useLandingPageTracking("prospeccao");

  useEffect(() => {
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
        title="Prospecção B2B com IA: Encontre e Qualifique Clientes"
        description="Prospecção B2B automatizada com IA: a Wiize encontra empresas do seu ICP, analisa cada lead e entrega um diagnóstico com dores, pontos fracos e oportunidades para você abordar na hora certa."
        keywords="prospecção, prospecção B2B, prospecção com IA, prospecção de clientes, prospecção ativa, prospecção outbound, software de prospecção, ferramenta de prospecção, lista de empresas, geração de leads B2B, qualificação de leads, ICP, diagnóstico de empresas, Wiize"
        url="https://wiize.com.br/prospeccao"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "Service",
            "@id": "https://wiize.com.br/prospeccao#service",
            name: "Prospecção B2B com IA",
            serviceType: "Prospecção B2B automatizada",
            areaServed: "BR",
            provider: { "@id": "https://wiize.com.br/#organization" },
            description:
              "Serviço de prospecção B2B com inteligência artificial: busca de empresas por nicho e região, enriquecimento de dados, diagnóstico individual de cada lead e geração de abordagem personalizada.",
            offers: {
              "@type": "Offer",
              priceCurrency: "BRL",
              price: "97",
              availability: "https://schema.org/InStock",
              url: "https://wiize.com.br/signup/escolher-plano",
            },
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Wiize", item: "https://wiize.com.br/" },
              { "@type": "ListItem", position: 2, name: "Prospecção B2B", item: "https://wiize.com.br/prospeccao" },
            ],
          },
          siteNavigationSchema,
          faqJsonLd,
        ]}
      />

      <main className="landing-light min-h-screen bg-background overflow-x-hidden overflow-y-auto w-full max-w-full relative">
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
          <HeroSection
            onSignupClick={trackSignupClick}
            titleLine1="Sistema de Prospecção"
            titleLine2="que Encontra e analisa"
            titleHighlight="Seus clientes ideais"
            description="Nossa IA encontra empresas, analisa cada oportunidade e gera um diagnóstico comercial identificando dores, oportunidades e o potencial de cada cliente para sua equipe vender com mais eficiência."
            descriptionClassName="text-sm sm:text-base md:text-[1.05rem] leading-relaxed"
          />
          <TrustedBySection />

          <ProblemSection />

          <Suspense fallback={<SectionFallback />}>
            <OpportunitySection />
            <MechanismSection />
            <FeaturesOverviewSection />
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

export default Prospeccao;
