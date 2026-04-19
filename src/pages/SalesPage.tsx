import { lazy, Suspense } from "react";
import { SEO } from "@/components/SEO";
import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { Footer } from "@/components/landing/Footer";

/**
 * Performance: Hero + Navbar carregam imediatamente (above the fold).
 * Tudo abaixo é lazy via dynamic import — reduz JS inicial e melhora LCP/INP,
 * principalmente em mobile onde o parse/exec era pesado.
 */
const ProblemSection = lazy(() =>
  import("@/components/sales/ProblemSection").then((m) => ({ default: m.ProblemSection })),
);
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
const BenefitsSection = lazy(() =>
  import("@/components/sales/BenefitsSection").then((m) => ({ default: m.BenefitsSection })),
);
const AuthoritySection = lazy(() =>
  import("@/components/sales/AuthoritySection").then((m) => ({ default: m.AuthoritySection })),
);
const TestimonialsSection = lazy(() =>
  import("@/components/landing/TestimonialsSection").then((m) => ({
    default: m.TestimonialsSection,
  })),
);
const DifferentialsSection = lazy(() =>
  import("@/components/sales/DifferentialsSection").then((m) => ({
    default: m.DifferentialsSection,
  })),
);
const ObjectionsSection = lazy(() =>
  import("@/components/sales/ObjectionsSection").then((m) => ({ default: m.ObjectionsSection })),
);
const OfferSection = lazy(() =>
  import("@/components/sales/OfferSection").then((m) => ({ default: m.OfferSection })),
);
const ClosingSection = lazy(() =>
  import("@/components/sales/ClosingSection").then((m) => ({ default: m.ClosingSection })),
);

// Skeleton leve, sem layout shift relevante — placeholder enquanto o chunk baixa.
const SectionFallback = () => <div className="h-[40vh] w-full" aria-hidden="true" />;

const SalesPage = () => {
  const trackSignupClick = () => {};

  return (
    <>
      <SEO
        title="Wiize — Infraestrutura Inteligente de Vendas B2B"
        description="Automatize captação, qualificação, follow-up e avanço de leads B2B em escala. IA + WhatsApp oficial + CRM integrado. Gere oportunidades reais de venda no automático."
        keywords="vendas B2B, automação comercial, prospecção inteligente, IA vendas, WhatsApp API, CRM B2B, geração de leads, Wiize"
      />
      <main className="landing-light min-h-screen bg-background overflow-x-hidden overflow-y-auto w-full max-w-full relative">
        {/* Aurora background — versão leve.
            - Apenas 2 blobs (era 4) e ocultos no mobile (sm:block), onde causavam jank de scroll.
            - Sem grid de pontos (mais economia de pixel em fill rate).
            - contain: strict para isolar layout/paint do navegador. */}
        <div
          className="hidden sm:block fixed inset-0 pointer-events-none overflow-hidden z-0"
          style={{ contain: "strict" }}
          aria-hidden="true"
        >
          <div
            className="absolute -top-[20%] -right-[10%] w-[55%] h-[45%] rounded-full opacity-[0.10]"
            style={{ background: "radial-gradient(ellipse, hsl(158 72% 45%), transparent 70%)" }}
          />
          <div
            className="absolute top-[55%] -left-[10%] w-[45%] h-[40%] rounded-full opacity-[0.08]"
            style={{ background: "radial-gradient(ellipse, hsl(200 80% 55%), transparent 70%)" }}
          />
        </div>

        <div className="relative z-10">
          <Navbar onSignupClick={trackSignupClick} />
          <HeroSection onSignupClick={trackSignupClick} />

          <Suspense fallback={<SectionFallback />}>
            <ProblemSection />
            <OpportunitySection />
            <MechanismSection />
            <FeaturesOverviewSection />
            <BenefitsSection />
            <AuthoritySection />
            <TestimonialsSection />
            <DifferentialsSection />
            <ObjectionsSection />
            <OfferSection onSignupClick={trackSignupClick} />
            <ClosingSection onSignupClick={trackSignupClick} />
          </Suspense>

          <Footer />
        </div>
      </main>
    </>
  );
};

export default SalesPage;
