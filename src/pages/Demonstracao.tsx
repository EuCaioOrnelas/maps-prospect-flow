import { lazy, Suspense, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Handshake, Play, X } from "lucide-react";
import { SEO } from "@/components/SEO";
import LightThemeWrapper from "@/components/LightThemeWrapper";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

import avatar1 from "@/assets/avatars/avatar1.jpg";
import avatar2 from "@/assets/avatars/avatar2.jpg";
import avatar3 from "@/assets/avatars/avatar3.jpg";
import avatar4 from "@/assets/avatars/avatar4.jpg";

const ProblemSection = lazy(() =>
  import("@/components/sales/ProblemSection").then((m) => ({ default: m.ProblemSection })),
);
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

/* ------------------------------------------------------------------ */
/*  Video Modal                                                       */
/* ------------------------------------------------------------------ */

const VideoModal = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent
      className="w-[96vw] max-w-none max-h-[94vh] p-0 gap-0 border-0 bg-background shadow-2xl rounded-2xl overflow-hidden [&>button]:hidden"
      style={{ width: "min(96vw, calc((100vh - 6rem) * 16 / 9), 1480px)" }}
    >
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <Play size={16} className="text-primary fill-primary" />
          <span className="text-sm font-semibold">Demonstração — Wiize</span>
        </div>
        <button
          onClick={() => onOpenChange(false)}
          className="p-2 rounded-lg hover:bg-secondary transition-colors"
        >
          <X size={16} />
        </button>
      </div>
      <div className="relative w-full bg-card" style={{ aspectRatio: "16 / 9" }}>
        <iframe
          className="absolute inset-0 h-full w-full"
          src="https://www.youtube.com/embed/ZRzK42SYNFc?rel=0&modestbranding=1&autoplay=1&playsinline=1"
          title="Wiize — Demonstração"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      </div>
    </DialogContent>
  </Dialog>
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

const Hero = ({ onWatch }: { onWatch: () => void }) => (
  <section className="relative w-full -mt-[72px] sm:-mt-[80px] pt-[104px] sm:pt-[120px] pb-12 sm:pb-16 overflow-hidden">
    <HeroBackdrop />

    <div className="container mx-auto px-4 sm:px-6 max-w-6xl relative z-10">
      <motion.div
        initial="hidden"
        animate="show"
        variants={stagger}
        className="text-center max-w-4xl mx-auto"
      >
        <motion.div
          variants={fadeUp}
          className="inline-flex items-center gap-1.5 sm:gap-2.5 px-2.5 sm:px-4 py-1 sm:py-2 rounded-full glass mb-6 sm:mb-8 border border-primary/10"
        >
          <div className="flex -space-x-1 sm:-space-x-1.5">
            <img src={avatar1} alt="" className="w-4 h-4 sm:w-7 sm:h-7 rounded-full border border-background sm:border-2 object-cover" width={28} height={28} />
            <img src={avatar2} alt="" className="w-4 h-4 sm:w-7 sm:h-7 rounded-full border border-background sm:border-2 object-cover" width={28} height={28} />
            <img src={avatar3} alt="" className="w-4 h-4 sm:w-7 sm:h-7 rounded-full border border-background sm:border-2 object-cover" width={28} height={28} />
            <img src={avatar4} alt="" className="w-4 h-4 sm:w-7 sm:h-7 rounded-full border border-background sm:border-2 object-cover" width={28} height={28} />
          </div>
          <span className="text-[10px] sm:text-xs font-medium text-foreground tracking-tight">+500 Empresas já utilizam a Wiize</span>
        </motion.div>

        <motion.h1
          variants={fadeUp}
          className="font-display font-bold text-foreground leading-[1.05] tracking-tight"
        >
          <span className="block text-[1.85rem] sm:text-[2.6rem] md:text-[3.1rem] lg:text-[3.5rem]">
            Como a Wiize gera reuniões B2B
          </span>
          <span className="block whitespace-nowrap text-shimmer-highlight font-extrabold text-[2rem] sm:text-[2.8rem] md:text-[3.35rem] lg:text-[3.75rem] mt-1 sm:mt-2">
            com SDR de IA no WhatsApp
          </span>

        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="mt-5 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto"
        >
          Veja como empresas estão usando Inteligência Comercial Assistida para
          gerar oportunidades, automatizar processos e aumentar produtividade.
        </motion.p>
      </motion.div>

      {/* Video — protagonist */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, delay: 0.25 }}
        className="mt-10 sm:mt-12 relative w-full rounded-3xl overflow-hidden border border-border bg-card shadow-2xl cursor-pointer group max-w-5xl mx-auto"
        style={{ aspectRatio: "16 / 9" }}
        onClick={onWatch}
      >
        <img
          src="https://img.youtube.com/vi/ZRzK42SYNFc/maxresdefault.jpg"
          alt="Demonstração Wiize"
          className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/40 blur-2xl group-hover:bg-primary/60 transition" />
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-300">
              <Play size={38} strokeWidth={1.5} className="ml-1" />
            </div>
          </div>
        </div>
        <div className="absolute bottom-3 left-3 sm:bottom-5 sm:left-5 flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/85 backdrop-blur border border-border">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-semibold">Tour da plataforma · 4 min</span>
        </div>
      </motion.div>
    </div>
  </section>
);

/* ------------------------------------------------------------------ */
/*  Final CTA                                                         */
/* ------------------------------------------------------------------ */

const FinalCTA = ({ variant = "full" }: { variant?: "full" | "compact" }) => (
  <section
    className={
      variant === "full"
        ? "relative w-full pt-20 sm:pt-24 pb-10 sm:pb-12 overflow-hidden border-t border-border"
        : "relative w-full pt-12 sm:pt-16 pb-16 sm:pb-20 overflow-hidden border-t border-border"
    }
  >
    <div className="absolute left-1/2 top-1/2 h-72 w-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-glow opacity-30 blur-3xl" />

    <div className="container mx-auto px-4 max-w-3xl relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center"
      >
        <h2 className="font-display text-[1.6rem] sm:text-[2rem] md:text-[2.4rem] font-bold text-foreground leading-tight mb-4">
          {variant === "full" ? (
            <>
              Transforme prospecção fria em{" "}
              <span className="text-shimmer-highlight font-extrabold whitespace-nowrap">
                pipeline previsível
              </span>
            </>
          ) : (
            <>
              Pronto para colocar a{" "}
              <span className="text-shimmer-highlight font-extrabold whitespace-nowrap">
                Wiize na sua operação?
              </span>
            </>
          )}
        </h2>

        <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed mb-7">
          {variant === "full"
            ? "Implante a máquina comercial assistida por IA da Wiize e gere oportunidades qualificadas todos os dias, sem depender de SDR humano."
            : "Comece em poucos minutos e veja a IA prospectar, qualificar e atualizar seu CRM enquanto seu time foca em fechar negócios."}
        </p>

        <div className="flex flex-col items-center justify-center gap-3">
          <Link to="/#pricing">
            <Button variant="hero" size="lg" className="rounded-full group px-8 h-12">
              Escalar operação com Wiize
              <ArrowRight size={18} className="ml-1 group-hover:translate-x-1 transition-transform" />
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
  const [videoOpen, setVideoOpen] = useState(false);

  return (
    <LightThemeWrapper>
      <SEO
        title="Demonstração — Wiize"
        description="Veja a Wiize em ação. Tour pela plataforma de Inteligência Comercial Assistida: prospecção, CRM, IA, WhatsApp e fluxos."
      />
      <div className="landing-light min-h-screen bg-background text-foreground overflow-x-hidden">
        <Navbar />
        <main>
          <Hero onWatch={() => setVideoOpen(true)} />
          <Suspense fallback={<SectionFallback />}>
            <ProblemSection />
            <OpportunitySection />
            <FeaturesOverviewSection />
          </Suspense>
          <FinalCTA variant="full" />
          <Suspense fallback={<SectionFallback />}>
            <FAQSection />
          </Suspense>
          <FinalCTA variant="compact" />
        </main>
        <Footer />
        <VideoModal open={videoOpen} onOpenChange={setVideoOpen} />
      </div>
    </LightThemeWrapper>
  );
}
