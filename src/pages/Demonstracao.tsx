import { lazy, Suspense, useState } from "react";
import { Link } from "react-router-dom";
import { withReferralParams } from "@/hooks/usePartnerTracking";
import { motion } from "framer-motion";
import { ArrowDown, ArrowRight, Handshake, Play } from "lucide-react";
import { SEO } from "@/components/SEO";
import LightThemeWrapper from "@/components/LightThemeWrapper";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { TrustedBySection } from "@/components/landing/TrustedBySection";
import { Button } from "@/components/ui/button";
import { ProblemSection } from "@/components/sales/ProblemSection";

import avatar1 from "@/assets/avatars/avatar1.jpg";
import avatar2 from "@/assets/avatars/avatar2.jpg";
import avatar3 from "@/assets/avatars/avatar3.jpg";
import avatar4 from "@/assets/avatars/avatar4.jpg";
import demoCoverAsset from "@/assets/demo-cover-v2.png.asset.json";

const OpportunitySection = lazy(() =>
  import("@/components/sales/OpportunitySection").then((m) => ({ default: m.OpportunitySection })),
);
const FeaturesOverviewSection = lazy(() =>
  import("@/components/sales/FeaturesOverviewSection").then((m) => ({ default: m.FeaturesOverviewSection })),
);


const SectionFallback = () => <div className="h-[40vh] w-full" aria-hidden="true" />;

/* ------------------------------------------------------------------ */
/*  Motion helpers                                                    */
/* ------------------------------------------------------------------ */

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const VIDEO_ID = "xdYY5yUY6xk";
const VIDEO_THUMBNAIL = demoCoverAsset.url;
const VIDEO_OVERSCAN_X = 1.06;

const VideoCover = ({ className = "", blurred = true }: { className?: string; blurred?: boolean }) => (
  <>
    <img
      src={VIDEO_THUMBNAIL}
      alt="Demonstração Wiize"
      className={`absolute inset-0 h-full w-full object-cover ${className}`}
      style={{
        filter: blurred ? "blur(2.5px) saturate(1.03)" : "none",
        transform: blurred ? "scale(1.03)" : "none",
      }}
    />
    {/* Light wash to keep the play button readable without harsh shadow */}
    {blurred && <div className="absolute inset-0 bg-background/20" />}

  </>
);

/* ------------------------------------------------------------------ */
/*  Hero — same background as LP Hero                                 */
/* ------------------------------------------------------------------ */

const HeroBackdrop = () => (
  <>
    {/* Base gradient */}
    <div
      className="absolute inset-0"
      style={{
        background:
          "linear-gradient(180deg, hsl(158 35% 97.5%) 0%, hsl(210 30% 99%) 60%, hsl(var(--background)) 100%)",
      }}
    />
    {/* Dotted texture */}
    <div
      className="absolute inset-0 pointer-events-none opacity-[0.18]"
      style={{
        backgroundImage:
          "radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)",
        backgroundSize: "18px 18px",
        maskImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 600'%3E%3Cellipse cx='350' cy='220' rx='180' ry='200' fill='white'/%3E%3Cellipse cx='370' cy='420' rx='80' ry='120' fill='white'/%3E%3Cellipse cx='550' cy='180' rx='200' ry='180' fill='white'/%3E%3Cellipse cx='560' cy='380' rx='100' ry='100' fill='white'/%3E%3Cellipse cx='750' cy='250' rx='180' ry='150' fill='white'/%3E%3Cellipse cx='800' cy='400' rx='60' ry='80' fill='white'/%3E%3Cellipse cx='900' cy='300' rx='120' ry='100' fill='white'/%3E%3Cellipse cx='1000' cy='350' rx='80' ry='120' fill='white'/%3E%3Cellipse cx='200' cy='250' rx='100' ry='80' fill='white'/%3E%3C/svg%3E\")",
        WebkitMaskImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 600'%3E%3Cellipse cx='350' cy='220' rx='180' ry='200' fill='white'/%3E%3Cellipse cx='370' cy='420' rx='80' ry='120' fill='white'/%3E%3Cellipse cx='550' cy='180' rx='200' ry='180' fill='white'/%3E%3Cellipse cx='560' cy='380' rx='100' ry='100' fill='white'/%3E%3Cellipse cx='750' cy='250' rx='180' ry='150' fill='white'/%3E%3Cellipse cx='800' cy='400' rx='60' ry='80' fill='white'/%3E%3Cellipse cx='900' cy='300' rx='120' ry='100' fill='white'/%3E%3Cellipse cx='1000' cy='350' rx='80' ry='120' fill='white'/%3E%3Cellipse cx='200' cy='250' rx='100' ry='80' fill='white'/%3E%3C/svg%3E\")",
        maskSize: "cover",
        WebkitMaskSize: "cover",
        maskPosition: "center",
        WebkitMaskPosition: "center",
      }}
    />
    {/* Soft primary glow */}
    <div
      className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[1000px] md:w-[1200px] h-[1000px] md:h-[1200px] pointer-events-none -translate-y-1/2"
      style={{
        background:
          "radial-gradient(ellipse at center, hsl(158 60% 55% / 0.06) 0%, hsl(158 60% 55% / 0.02) 45%, transparent 70%)",
      }}
    />
    {/* Accent blobs */}
    <div
      className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full pointer-events-none opacity-50"
      style={{
        background:
          "radial-gradient(circle, hsl(158 60% 55% / 0.05) 0%, transparent 65%)",
      }}
    />
    <div
      className="absolute -bottom-40 -left-32 w-[700px] h-[700px] rounded-full pointer-events-none opacity-40"
      style={{
        background:
          "radial-gradient(circle, hsl(158 60% 55% / 0.04) 0%, transparent 65%)",
      }}
    />
  </>
);

const Hero = () => {
  const [playing, setPlaying] = useState(false);

  return (
  <section className="relative w-full -mt-[72px] sm:-mt-[80px] pt-[104px] sm:pt-[120px] pb-4 sm:pb-6 overflow-x-clip">
    <HeroBackdrop />

    <div className="container mx-auto px-4 sm:px-6 max-w-5xl relative z-10">
      <motion.div
        initial="hidden"
        animate="show"
        variants={stagger}
        className="flex flex-col items-center text-center"
      >


        <motion.h1
          variants={fadeUp}
          className="font-display font-bold text-foreground leading-[1.1] tracking-tight max-w-[56rem]"
          style={{ fontSize: "clamp(1.25rem, 3.6vw, 3rem)" }}
        >
          <span className="block whitespace-nowrap">Veja a Wiize gerando</span>
          <span className="block whitespace-nowrap"><span className="text-shimmer-highlight font-extrabold">Oportunidades com IA</span> na prática</span>
        </motion.h1>

        {/* Video */}
        <motion.div
          variants={fadeUp}
          className="w-full max-w-[48rem] mt-7 sm:mt-9 p-[3px] rounded-2xl bg-white border border-white"
        >
          <div
            className="relative w-full rounded-[0.875rem] overflow-hidden bg-white group"
            style={{ aspectRatio: "16 / 9" }}
          >
            {!playing ? (
              <button
                type="button"
                onClick={() => setPlaying(true)}
                className="absolute inset-0 h-full w-full cursor-pointer"
                aria-label="Reproduzir vídeo"
              >
                <VideoCover className="opacity-95 group-hover:opacity-100 transition-opacity" blurred={false} />

                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-2xl bg-primary/40 blur-2xl group-hover:bg-primary/60 transition" />
                    <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-300">
                      <Play size={22} strokeWidth={1.75} className="ml-0.5" />
                    </div>
                  </div>
                </div>
              </button>
            ) : (
              <iframe
                className="absolute left-1/2 top-0 h-full origin-center border-0"
                style={{ width: `${VIDEO_OVERSCAN_X * 100}%`, transform: "translateX(-50%)" }}
                src={`https://www.youtube.com/embed/${VIDEO_ID}?rel=0&modestbranding=1&autoplay=1&playsinline=1&vq=hd1080&hd=1`}
                title="Wiize — Demonstração"
                frameBorder="0"
                allow="autoplay; encrypted-media; picture-in-picture"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            )}
          </div>
        </motion.div>

        {/* CTAs below video */}
        <motion.div
          variants={fadeUp}
          className="mt-7 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4"
        >
          <Link to={withReferralParams("/signup/escolher-plano")} className="w-full sm:w-auto">
            <Button
              variant="hero"
              size="lg"
              className="rounded-full group h-11 sm:h-12 px-5 sm:px-6 text-sm font-semibold w-full sm:w-auto shadow-xl whitespace-nowrap"
            >
              Escalar Operação
              <ArrowRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <Link
            to="/parceiros"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-2 whitespace-nowrap"
          >
            <Handshake size={14} />
            Quero ser parceiro
          </Link>
        </motion.div>
      </motion.div>

      {/* Scroll-down arrow flush with carousel */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.8 }}
        className="mt-6 sm:mt-8 flex justify-center text-muted-foreground"
      >
        <ArrowDown size={18} className="animate-bounce" />
      </motion.div>
    </div>
  </section>

  );
};

/* ------------------------------------------------------------------ */
/*  Final CTA                                                         */
/* ------------------------------------------------------------------ */

const FinalCTA = () => (
  <section className="relative w-full pt-20 sm:pt-28 pb-24 sm:pb-32 overflow-hidden">
    <div className="absolute left-1/2 top-1/2 h-80 sm:h-96 w-[28rem] sm:w-[44rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-glow opacity-40 blur-3xl" />

    <div className="container mx-auto px-4 sm:px-6 max-w-4xl relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.6 }}
        className="text-center"
      >
        <h2 className="font-display font-bold text-foreground leading-[1.1] tracking-tight mb-5 sm:mb-6">
          <span className="block whitespace-nowrap" style={{ fontSize: "clamp(1.15rem, 5.4vw, 3.4rem)" }}>
            Pronto para colocar a
          </span>
          <span className="block text-shimmer-highlight font-extrabold whitespace-nowrap mt-1 sm:mt-2" style={{ fontSize: "clamp(1.25rem, 5.8vw, 3.55rem)" }}>
            Wiize na sua Operação?
          </span>
        </h2>

        <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-8 sm:mb-10">
          Comece em poucos minutos e veja a IA prospectar, qualificar e atualizar seu CRM enquanto seu time foca em fechar negócios.
        </p>

        <div className="flex flex-col items-center justify-center gap-4">
          <Link to="/#pricing" className="w-full sm:w-auto">
            <Button
              variant="hero"
              size="lg"
              className="rounded-full group h-14 sm:h-16 px-8 sm:px-12 text-base sm:text-lg font-semibold w-full sm:w-auto shadow-xl"
            >
              Escalar Operação com Wiize
              <ArrowRight size={20} className="ml-1 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <Link
            to="/parceiros"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2"
          >
            <Handshake size={15} />
            Quero ser parceiro
          </Link>
        </div>
      </motion.div>
    </div>
  </section>
);


/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default function Demonstracao() {
  return (
    <LightThemeWrapper>
      <SEO
        title="Demonstração — Wiize"
        description="Veja a Wiize em ação. Tour pela plataforma de Inteligência Comercial Assistida: prospecção, CRM, IA, WhatsApp e fluxos."
      />
      <div className="landing-light min-h-screen bg-background text-foreground overflow-x-hidden">
        <Navbar />
        <main>
          <Hero />
          <TrustedBySection />
          <ProblemSection />
          <Suspense fallback={<SectionFallback />}>
            <OpportunitySection />
            <FeaturesOverviewSection />
          </Suspense>
          <FinalCTA />

        </main>
        <Footer />
      </div>
    </LightThemeWrapper>
  );
}
