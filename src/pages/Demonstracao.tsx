import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Target,
  Bot,
  KanbanSquare,
  MessageCircle,
  Check,
  ArrowRight,
  Handshake,
  Play,
  X,
  Building2,
  Briefcase,
  Users,
} from "lucide-react";
import { SEO } from "@/components/SEO";
import LightThemeWrapper from "@/components/LightThemeWrapper";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

/* ------------------------------------------------------------------ */
/*  Video Modal (lightweight, keeps page clean)                       */
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
/*  Section 1 — Hero                                                  */
/* ------------------------------------------------------------------ */

const Hero = ({ onWatch }: { onWatch: () => void }) => (
  <section className="relative w-full pt-24 sm:pt-28 pb-10 sm:pb-14">
    <div className="container mx-auto px-4 max-w-6xl">
      <motion.div
        initial="hidden"
        animate="show"
        variants={staggerContainer}
        className="text-center"
      >
        <motion.h1
          variants={fadeUp}
          className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground leading-[1.1] tracking-tight"
        >
          Conheça a Wiize por dentro.
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed"
        >
          Veja em poucos minutos como a Wiize ajuda empresas a gerar mais
          oportunidades, aumentar a produtividade comercial e vender mais
          utilizando Inteligência Comercial Assistida.
        </motion.p>
      </motion.div>

      {/* Video — dominant element */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15 }}
        className="mt-8 sm:mt-10 relative w-full rounded-2xl overflow-hidden border border-border bg-card shadow-2xl cursor-pointer group"
        style={{ aspectRatio: "16 / 9" }}
        onClick={onWatch}
      >
        <img
          src="https://img.youtube.com/vi/ZRzK42SYNFc/maxresdefault.jpg"
          alt="Demonstração Wiize"
          className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/30 blur-xl group-hover:bg-primary/50 transition" />
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-300">
              <Play size={32} strokeWidth={1.5} className="ml-1" />
            </div>
          </div>
        </div>
        <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/80 backdrop-blur border border-border">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-semibold">Tour da plataforma · 4 min</span>
        </div>
      </motion.div>

      {/* CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3"
      >
        <Link to="/signup">
          <Button
            variant="hero"
            size="lg"
            className="rounded-full group px-8 h-11"
          >
            Começar Agora
            <ArrowRight
              size={18}
              className="group-hover:translate-x-1 transition-transform"
            />
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
      </motion.div>
    </div>
  </section>
);

/* ------------------------------------------------------------------ */
/*  Section 2 — 4 Cards                                               */
/* ------------------------------------------------------------------ */

const FeatureCards = () => {
  const cards = [
    {
      icon: Target,
      title: "Prospecção Inteligente",
      desc: "Encontre empresas com potencial de compra.",
    },
    {
      icon: Bot,
      title: "IA Comercial",
      desc: "Automatize tarefas e aumente produtividade.",
    },
    {
      icon: KanbanSquare,
      title: "CRM Integrado",
      desc: "Centralize oportunidades e negociações.",
    },
    {
      icon: MessageCircle,
      title: "WhatsApp Integrado",
      desc: "Gerencie relacionamentos em um único lugar.",
    },
  ];

  return (
    <section className="relative w-full py-14 sm:py-20">
      <div className="container mx-auto px-4 max-w-6xl">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          variants={staggerContainer}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
        >
          {cards.map((c) => (
            <motion.div
              key={c.title}
              variants={fadeUp}
              className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/25 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                <c.icon size={20} />
              </div>
              <h3 className="font-display font-semibold text-foreground text-base mb-1.5">
                {c.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-snug">
                {c.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ */
/*  Section 3 — What you'll see                                       */
/* ------------------------------------------------------------------ */

const Checklist = () => {
  const items = [
    "Como encontrar oportunidades",
    "Como utilizar a IA Comercial",
    "Como automatizar processos",
    "Como gerenciar negociações",
    "Como acompanhar métricas",
    "Como escalar sua operação comercial",
  ];

  return (
    <section className="relative w-full py-14 sm:py-20 bg-secondary/30 border-y border-border">
      <div className="container mx-auto px-4 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-xl mx-auto text-center"
        >
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground tracking-tight mb-8 sm:mb-10">
            O que você verá na demonstração
          </h2>

          <div className="space-y-4 text-left">
            {items.map((item, i) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: i * 0.05 }}
                className="flex items-center gap-3"
              >
                <div className="shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <Check size={14} className="text-primary" />
                </div>
                <span className="text-sm sm:text-base text-foreground/90">
                  {item}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ */
/*  Section 4 — For whom                                              */
/* ------------------------------------------------------------------ */

const ForWhom = () => {
  const personas = [
    {
      icon: Building2,
      title: "Agências de Marketing",
      desc: "Aumente resultados para clientes com inteligência comercial.",
    },
    {
      icon: Briefcase,
      title: "Representantes Comerciais",
      desc: "Prospecção automatizada e relacionamento em escala.",
    },
    {
      icon: Users,
      title: "Empresas B2B",
      desc: "Mais oportunidades, menos esforço operacional.",
    },
  ];

  return (
    <section className="relative w-full py-14 sm:py-20">
      <div className="container mx-auto px-4 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10 sm:mb-14"
        >
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            Para quem a Wiize foi criada
          </h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {personas.map((p) => (
            <motion.div
              key={p.title}
              variants={fadeUp}
              className="text-center p-6 rounded-2xl bg-card border border-border"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                <p.icon size={20} />
              </div>
              <h3 className="font-display font-semibold text-foreground mb-2">
                {p.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-snug">
                {p.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ */
/*  Section 5 — Final CTA                                             */
/* ------------------------------------------------------------------ */

const FinalCTA = () => (
  <section className="relative w-full py-16 sm:py-24 overflow-hidden">
    <div className="absolute left-1/2 top-1/2 h-64 w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-glow opacity-30 blur-3xl" />

    <div className="container mx-auto px-4 max-w-3xl relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center"
      >
        <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-foreground leading-tight mb-6">
          Pronto para transformar{" "}
          <span className="text-primary">sua operação comercial?</span>
        </h2>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/signup">
            <Button
              variant="hero"
              size="lg"
              className="rounded-full group px-8 h-11"
            >
              Começar Agora
              <ArrowRight
                size={18}
                className="group-hover:translate-x-1 transition-transform"
              />
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
        description="Conheça a Wiize por dentro. Veja em poucos minutos como a plataforma ajuda empresas a gerar mais oportunidades e vender mais com Inteligência Comercial Assistida."
      />
      <div className="landing-light min-h-screen bg-background text-foreground">
        <Navbar />
        <main>
          <Hero onWatch={() => setVideoOpen(true)} />
          <FeatureCards />
          <Checklist />
          <ForWhom />
          <FinalCTA />
        </main>
        <Footer />
        <VideoModal open={videoOpen} onOpenChange={setVideoOpen} />
      </div>
    </LightThemeWrapper>
  );
}
