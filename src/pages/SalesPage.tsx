import { SEO } from "@/components/SEO";
import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { Footer } from "@/components/landing/Footer";
import { ProblemSection } from "@/components/sales/ProblemSection";
import { OpportunitySection } from "@/components/sales/OpportunitySection";
import { MechanismSection } from "@/components/sales/MechanismSection";
import { FeaturesOverviewSection } from "@/components/sales/FeaturesOverviewSection";
import { BenefitsSection } from "@/components/sales/BenefitsSection";
import { AuthoritySection } from "@/components/sales/AuthoritySection";
import { DifferentialsSection } from "@/components/sales/DifferentialsSection";
import { ObjectionsSection } from "@/components/sales/ObjectionsSection";
import { OfferSection } from "@/components/sales/OfferSection";
import { ClosingSection } from "@/components/sales/ClosingSection";

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
        {/* Aurora background */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute -top-[20%] -right-[10%] w-[60%] h-[50%] rounded-full opacity-[0.12]"
            style={{ background: 'radial-gradient(ellipse, hsl(158 72% 45%), transparent 70%)' }} />
          <div className="absolute top-[30%] -left-[15%] w-[50%] h-[50%] rounded-full opacity-[0.09]"
            style={{ background: 'radial-gradient(ellipse, hsl(200 80% 55%), transparent 70%)' }} />
          <div className="absolute top-[60%] right-[5%] w-[45%] h-[40%] rounded-full opacity-[0.09]"
            style={{ background: 'radial-gradient(ellipse, hsl(170 65% 40%), transparent 70%)' }} />
          <div className="absolute inset-0 opacity-[0.035]"
            style={{ backgroundImage: 'radial-gradient(hsl(220 25% 14%) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        </div>

        <div className="relative z-10">
          <Navbar onSignupClick={trackSignupClick} />
          <HeroSection onSignupClick={trackSignupClick} />
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
          <Footer />
        </div>
      </main>
    </>
  );
};

export default SalesPage;
