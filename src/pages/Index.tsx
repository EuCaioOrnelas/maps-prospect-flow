import { lazy, Suspense } from "react";
import { SEO, siteNavigationSchema, homeBreadcrumbSchema } from "@/components/SEO";
import { faqJsonLd } from "@/components/landing/faqData";
import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { TrustedBySection } from "@/components/landing/TrustedBySection";
import { Footer } from "@/components/landing/Footer";
import { useLandingPageTracking } from "@/hooks/useLandingPageTracking";
import { DeferredSection } from "@/components/landing/DeferredSection";
import { AfterPaint } from "@/components/AfterPaint";


/**
 * Performance: above the fold (Navbar + Hero + TrustedBy + Footer básico)
 * carrega imediatamente. Tudo abaixo é lazy via dynamic import — reduz JS inicial,
 * melhora LCP/INP e elimina jank de animações que rodavam fora da tela.
 */
const ProblemSection = lazy(() =>
  import("@/components/sales/ProblemSection").then((m) => ({ default: m.ProblemSection })),
);
const FloatingChatButton = lazy(() =>
  import("@/components/landing/FloatingChatButton").then((m) => ({ default: m.FloatingChatButton })),
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
  // Antes a página esperava document.fonts.ready (até 1,5 s) antes de pintar
  // qualquer conteúdo — era a causa principal do atraso de renderização do LCP.
  // Agora o conteúdo acima da dobra é pintado imediatamente; as fontes trocam
  // sozinhas via font-display: swap.
  const { trackSignupClick } = useLandingPageTracking("index");



  return (
    <>
      <SEO
        description="Plataforma de inteligência comercial B2B: prospecta empresas, entende conversas no WhatsApp, identifica intenção de compra e prioriza as oportunidades certas dentro do CRM."
        keywords="inteligência comercial, CRM inteligente, qualificação de leads, intenção de compra, plataforma de vendas B2B, software de vendas B2B, prospecção B2B, encontrar clientes B2B, agendamento de reuniões, SDR com IA, follow-up automático, WhatsApp Business oficial, pipeline B2B, CRM, ICP, Wiize"
        url="https://wiize.com.br/"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "Wiize",
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            description:
              "Plataforma de inteligência comercial B2B que reúne prospecção, diagnóstico de empresas, conversas no WhatsApp, CRM e histórico de vendas para priorizar oportunidades e recomendar a próxima ação.",
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
          homeBreadcrumbSchema,
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

          {/* Primeira seção pós-hero: carregada assim que se aproxima da viewport.
              Tira framer-motion do bundle inicial sem mudar o conteúdo. */}
          <DeferredSection minHeight="90vh" rootMargin="900px 0px">
            <Suspense fallback={<SectionFallback />}>
              <ProblemSection />
            </Suspense>
          </DeferredSection>

          {/* Hierarquia: solução → ponte (operação conectada) → dentro da plataforma → benefício → prova → oferta.
              Cada bloco só monta quando chega perto da viewport: menos JS, menos DOM inicial. */}
          <DeferredSection minHeight="80vh">
            <Suspense fallback={<SectionFallback />}>
              <MechanismSection />
              <OpportunitySection />
            </Suspense>
          </DeferredSection>
          <DeferredSection minHeight="80vh">
            <Suspense fallback={<SectionFallback />}>
              <PlatformModulesSection />
              <WhyItWorksSection />
            </Suspense>
          </DeferredSection>
          <DeferredSection minHeight="80vh">
            <Suspense fallback={<SectionFallback />}>
              <TestimonialsSection />
              <PricingSection />
            </Suspense>
          </DeferredSection>
          <DeferredSection minHeight="60vh">
            <Suspense fallback={<SectionFallback />}>
              <FAQSection />
              <CTASection onSignupClick={trackSignupClick} />
            </Suspense>
          </DeferredSection>

          <Footer />
          <AfterPaint>
            <Suspense fallback={null}>
              <FloatingChatButton />
            </Suspense>
          </AfterPaint>

        </div>
      </main>
    </>
  );
};

export default Index;
