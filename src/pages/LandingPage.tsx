import { lazy, Suspense, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { faqJsonLd } from "@/components/landing/FAQSection";
import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { TrustedBySection } from "@/components/landing/TrustedBySection";
import { Footer } from "@/components/landing/Footer";
import { FloatingChatButton } from "@/components/landing/FloatingChatButton";
import { LandingPageSkeleton } from "@/components/landing/LandingPageSkeleton";
import { useLandingPageTracking } from "@/hooks/useLandingPageTracking";
import { supabase } from "@/integrations/supabase/client";
import NotFound from "./NotFound";

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

const LandingPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [pageExists, setPageExists] = useState<boolean | null>(null);
  const [isReady, setIsReady] = useState(false);

  const { trackSignupClick } = useLandingPageTracking(slug || "index");

  useEffect(() => {
    const checkPage = async () => {
      if (!slug) {
        setPageExists(false);
        return;
      }
      const { data } = await supabase
        .from("landing_pages")
        .select("id, name")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      setPageExists(!!data);
    };
    checkPage();
  }, [slug]);

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

  if (pageExists === null || !isReady) {
    return <LandingPageSkeleton />;
  }

  if (!pageExists) {
    return <NotFound />;
  }

  return (
    <>
      <SEO
        title="Inteligência Comercial e Dados Qualificados para Vendas B2B"
        description="Plataforma de inteligência comercial B2B: dados qualificados de empresas, enriquecimento com IA, CRM e automação de vendas para fechar com os clientes certos."
        keywords="inteligência comercial, dados B2B, dados qualificados, enriquecimento de dados, sales intelligence, qualificação de leads, ICP, automação de vendas, CRM inteligente, agente de IA comercial, Wiize"
        url="https://wiize.com.br/"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "Wiize",
            applicationCategory: "BusinessApplication",
            applicationSubCategory: "Sales Intelligence Platform",
            operatingSystem: "Web",
            description:
              "Wiize é uma plataforma SaaS brasileira de inteligência comercial B2B que combina captação de leads por localização e nicho, IA de diagnóstico, automação de WhatsApp via Meta API Oficial e CRM com IA de intenção de compra.",
            url: "https://wiize.com.br/",
            inLanguage: "pt-BR",
            audience: {
              "@type": "BusinessAudience",
              audienceType: "B2B sales teams",
            },
            featureList: [
              "SDR IA de Captação por Localização e Nicho",
              "IA de Intenção de Compra em tempo real",
              "Atendimento Operacional com IA no WhatsApp 24/7",
              "Fluxos Inteligentes com IA (editor visual)",
              "Campanhas Inteligentes outbound e inbound",
              "CRM com Inteligência Comercial e Lead Scoring",
              "Integração nativa com Meta API Oficial (WhatsApp Business)",
            ],
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
          {
            "@context": "https://schema.org",
            "@type": "HowTo",
            name: "Como a Wiize gera vendas B2B no automático",
            description:
              "Fluxo contínuo de 9 etapas que a Wiize executa para transformar leads B2B em clientes, sem operação manual.",
            inLanguage: "pt-BR",
            step: [
              { "@type": "HowToStep", position: 1, name: "Captação por Localização e Nicho", text: "A IA encontra empresas com perfil ideal de cliente em qualquer região e segmento." },
              { "@type": "HowToStep", position: 2, name: "Análise de Empresa", text: "A IA analisa tamanho, demanda, maturidade comercial e contexto de mercado de cada lead." },
              { "@type": "HowToStep", position: 3, name: "Diagnóstico Automático", text: "A IA identifica dores, necessidades e oportunidades reais de venda, com score calculado." },
              { "@type": "HowToStep", position: 4, name: "Geração de Mensagem com IA", text: "A IA cria uma abordagem personalizada por lead, baseada no diagnóstico." },
              { "@type": "HowToStep", position: 5, name: "Envio via WhatsApp Oficial", text: "Disparo no momento ideal pela Meta API Oficial, com limites de segurança." },
              { "@type": "HowToStep", position: 6, name: "Atendimento com IA Closer", text: "A IA conversa, qualifica e conduz o lead até o fechamento, 24/7." },
              { "@type": "HowToStep", position: 7, name: "Follow-up Automático", text: "Reengajamento automático recupera leads que iriam esfriar." },
              { "@type": "HowToStep", position: 8, name: "Conversão", text: "Geração de reuniões e oportunidades reais alimentando o pipeline." },
              { "@type": "HowToStep", position: 9, name: "CRM Atualizado", text: "Toda interação é centralizada e o pipeline é atualizado automaticamente." },
            ],
          },
          {
            "@context": "https://schema.org",
            "@type": "Service",
            serviceType: "Plataforma de Inteligência Comercial B2B",
            provider: { "@type": "Organization", name: "Wiize", url: "https://wiize.com.br/" },
            areaServed: { "@type": "Country", name: "Brasil" },
            description:
              "Serviço SaaS de inteligência comercial B2B com captação, qualificação, atendimento e CRM operados por IA, integrado à Meta API Oficial do WhatsApp Business.",
            hasOfferCatalog: {
              "@type": "OfferCatalog",
              name: "Planos Wiize",
              itemListElement: [
                { "@type": "Offer", name: "Start", description: "Plano de entrada para times iniciando operação comercial com IA." },
                { "@type": "Offer", name: "Growth", description: "Plano intermediário com mais volume de oportunidades e recursos." },
                { "@type": "Offer", name: "Enterprise", description: "Plano avançado para operações de alto volume e múltiplos números." },
              ],
            },
          },
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
          <HeroSection onSignupClick={trackSignupClick} />
          <TrustedBySection />

          <Suspense fallback={<SectionFallback />}>
            <ProblemSection />
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
        </div>
        <FloatingChatButton />
      </main>
    </>
  );
};

export default LandingPage;
