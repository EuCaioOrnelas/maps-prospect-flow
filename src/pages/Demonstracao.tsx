import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Target,
  Bot,
  KanbanSquare,
  MessageCircle,
  Workflow,
  BarChart3,
  Check,
  ArrowRight,
  Handshake,
  Play,
  X,
  LayoutDashboard,
  Sparkles,
} from "lucide-react";
import { SEO } from "@/components/SEO";
import LightThemeWrapper from "@/components/LightThemeWrapper";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { SectionHeading } from "@/components/landing/SectionHeading";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import flowBuilderPreview from "@/assets/flow-builder-preview.png";
import aiAgentFlowPreview from "@/assets/ai-agent-flow-preview.png";
import whatsappMockup from "@/assets/whatsapp-phone-mockup-v2.png";

/* ------------------------------------------------------------------ */
/*  Motion helpers                                                    */
/* ------------------------------------------------------------------ */

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
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
/*  Section 1 — Hero + Vídeo                                          */
/* ------------------------------------------------------------------ */

const Hero = ({ onWatch }: { onWatch: () => void }) => (
  <section className="relative w-full pt-24 sm:pt-28 pb-10 sm:pb-14">
    <div className="container mx-auto px-4 max-w-6xl">
      <motion.div
        initial="hidden"
        animate="show"
        variants={stagger}
        className="text-center max-w-3xl mx-auto"
      >
        <motion.span
          variants={fadeUp}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold tracking-widest uppercase mb-4 bg-primary/10 text-primary"
        >
          <Sparkles size={12} /> Demonstração ao vivo
        </motion.span>
        <motion.h1
          variants={fadeUp}
          className="font-display font-bold text-foreground leading-[1.05] tracking-tight text-[1.85rem] sm:text-[2.6rem] md:text-[3.1rem] lg:text-[3.4rem]"
        >
          Conheça a Wiize{" "}
          <span className="text-shimmer-highlight font-extrabold">em ação.</span>
        </motion.h1>
        <motion.p
          variants={fadeUp}
          className="mt-5 text-base sm:text-lg text-muted-foreground leading-relaxed"
        >
          Veja como empresas estão utilizando Inteligência Comercial Assistida
          para gerar oportunidades, automatizar processos e aumentar
          produtividade.
        </motion.p>
      </motion.div>

      {/* Vídeo — protagonista */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15 }}
        className="mt-10 sm:mt-12 relative w-full rounded-3xl overflow-hidden border border-border bg-card shadow-2xl cursor-pointer group"
        style={{ aspectRatio: "16 / 9" }}
        onClick={onWatch}
      >
        <img
          src="https://img.youtube.com/vi/ZRzK42SYNFc/maxresdefault.jpg"
          alt="Demonstração Wiize"
          className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
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
/*  Section 2 — O que você vai ver                                    */
/* ------------------------------------------------------------------ */

const items = [
  { icon: Target, label: "Prospecção Inteligente" },
  { icon: Bot, label: "Agente de IA Comercial" },
  { icon: KanbanSquare, label: "CRM Comercial" },
  { icon: MessageCircle, label: "WhatsApp Integrado" },
  { icon: Workflow, label: "Fluxos de Automação" },
  { icon: BarChart3, label: "Métricas e Performance" },
];

const WhatYouSee = () => (
  <section className="relative w-full py-16 sm:py-24 bg-secondary/30 border-y border-border">
    <div className="container mx-auto px-4 max-w-6xl">
      <SectionHeading
        eyebrow="O que você vai ver"
        title="Tudo o que a Wiize"
        highlight="te entrega na prática"
        highlightFit="tight"
      />

      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-60px" }}
        variants={stagger}
        className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5"
      >
        {items.map((it) => (
          <motion.div
            key={it.label}
            variants={fadeUp}
            className="flex items-center gap-3 p-4 sm:p-5 rounded-2xl bg-card border border-border hover:border-primary/30 transition-colors"
          >
            <div className="shrink-0 w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <it.icon size={20} />
            </div>
            <div className="flex items-center gap-2">
              <Check size={14} className="text-primary shrink-0" />
              <span className="text-sm sm:text-[15px] font-medium text-foreground">
                {it.label}
              </span>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  </section>
);

/* ------------------------------------------------------------------ */
/*  Section 3 — Explorar a plataforma (mockups)                       */
/* ------------------------------------------------------------------ */

const showcases = [
  {
    icon: LayoutDashboard,
    title: "Dashboard",
    image: aiAgentFlowPreview,
    span: "lg:col-span-2 lg:row-span-2",
  },
  {
    icon: KanbanSquare,
    title: "CRM Comercial",
    image: flowBuilderPreview,
    span: "lg:col-span-2",
  },
  {
    icon: Workflow,
    title: "Fluxos",
    image: flowBuilderPreview,
    span: "",
  },
  {
    icon: Bot,
    title: "Agente de IA",
    image: aiAgentFlowPreview,
    span: "",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp",
    image: whatsappMockup,
    span: "lg:col-span-2",
  },
];

const ExplorePlatform = () => (
  <section className="relative w-full py-16 sm:py-24">
    <div className="container mx-auto px-4 max-w-6xl">
      <SectionHeading
        eyebrow="Explorar a plataforma"
        title="Veja o produto"
        highlight="funcionando de verdade"
        highlightFit="tight"
      />

      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-60px" }}
        variants={stagger}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 auto-rows-[180px] sm:auto-rows-[220px] gap-4 sm:gap-5"
      >
        {showcases.map((s) => (
          <motion.div
            key={s.title}
            variants={fadeUp}
            className={`group relative rounded-2xl overflow-hidden border border-border bg-card shadow-sm hover:shadow-xl hover:border-primary/30 transition-all ${s.span}`}
          >
            <img
              src={s.image}
              alt={s.title}
              className="absolute inset-0 w-full h-full object-cover object-top opacity-95 group-hover:scale-[1.02] transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/10 to-transparent" />
            <div className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/85 backdrop-blur border border-border">
              <s.icon size={14} className="text-primary" />
              <span className="text-xs font-semibold text-foreground">{s.title}</span>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  </section>
);

/* ------------------------------------------------------------------ */
/*  Section 4 — CTA                                                   */
/* ------------------------------------------------------------------ */

const FinalCTA = () => (
  <section className="relative w-full py-20 sm:py-28 overflow-hidden border-t border-border">
    <div className="absolute left-1/2 top-1/2 h-72 w-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-glow opacity-30 blur-3xl" />

    <div className="container mx-auto px-4 max-w-3xl relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center"
      >
        <h2 className="font-display text-[1.75rem] sm:text-[2.25rem] md:text-[2.75rem] font-bold text-foreground leading-tight mb-7">
          Pronto para aplicar isso{" "}
          <span className="text-shimmer-highlight font-extrabold">na sua empresa?</span>
        </h2>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/signup">
            <Button variant="hero" size="lg" className="rounded-full group px-8 h-11">
              Solicitar Acesso
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <Link to="/partners">
            <Button
              variant="outline"
              size="lg"
              className="rounded-full group px-8 h-11 border-border hover:bg-secondary"
            >
              <Handshake size={18} className="mr-1.5" />
              Quero Ser Parceiro
            </Button>
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
      <div className="landing-light min-h-screen bg-background text-foreground">
        <Navbar />
        <main>
          <Hero onWatch={() => setVideoOpen(true)} />
          <WhatYouSee />
          <ExplorePlatform />
          <FinalCTA />
        </main>
        <Footer />
        <VideoModal open={videoOpen} onOpenChange={setVideoOpen} />
      </div>
    </LightThemeWrapper>
  );
}
