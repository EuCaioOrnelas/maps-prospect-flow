import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Play, ChevronLeft, ChevronRight, Shield, TrendingUp, BarChart3, Zap, Award } from "lucide-react";
import { fases, type Fase, type Video } from "@/data/consultoriaContent";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { BackgroundGlow } from "@/components/layout/BackgroundGlow";

/**
 * Página de Consultoria Educacional — Experiência Netflix
 * Fluxo: Home (fases) → Detalhe da fase (vídeos) → Player
 */

const FASE_ICONS = [Shield, Zap, TrendingUp, BarChart3, Award];

type View =
  | { screen: "home" }
  | { screen: "fase"; fase: Fase; faseIndex: number }
  | { screen: "player"; fase: Fase; faseIndex: number; video: Video };

const Consultoria = () => {
  const [view, setView] = useState<View>({ screen: "home" });

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 lg:ml-[72px] relative">
        <BackgroundGlow />
        <div className="relative z-10">
          <AppHeader />
          <AnimatePresence mode="wait">
            {view.screen === "home" && (
              <HomeView
                key="home"
                onSelectFase={(fase, i) => setView({ screen: "fase", fase, faseIndex: i })}
              />
            )}
            {view.screen === "fase" && (
              <FaseDetailView
                key={`fase-${view.faseIndex}`}
                fase={view.fase}
                faseIndex={view.faseIndex}
                onBack={() => setView({ screen: "home" })}
                onPlayVideo={(video) =>
                  setView({ screen: "player", fase: view.fase, faseIndex: view.faseIndex, video })
                }
              />
            )}
            {view.screen === "player" && (
              <PlayerView
                key={`player-${view.video.titulo}`}
                video={view.video}
                onBack={() => setView({ screen: "fase", fase: view.fase, faseIndex: view.faseIndex })}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

/* ================================================================
   HOME — Hero épico + Cards verticais de Fases
   ================================================================ */
const HomeView = ({ onSelectFase }: { onSelectFase: (f: Fase, i: number) => void }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({
      left: dir === "left" ? -400 : 400,
      behavior: "smooth",
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-[calc(100vh-58px)]"
    >
      {/* ===== HERO ÉPICO ===== */}
      <div className="relative overflow-hidden">
        {/* Background image with overlay */}
        <div className="absolute inset-0">
          <img
            src={fases[0].capa}
            alt=""
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/90 to-background" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
        </div>

        <div className="relative z-10 px-6 md:px-12 pt-12 md:pt-20 pb-16 md:pb-24 max-w-4xl">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-6"
          >
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-medium text-primary">Consultoria Exclusiva Wiize</span>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-3xl md:text-5xl lg:text-6xl font-bold text-foreground tracking-tight leading-[1.1] mb-6"
          >
            Consultoria Estratégica
            <br />
            <span className="bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">
              de Disparos em Massa
            </span>
          </motion.h1>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl mb-8"
          >
            O passo a passo definitivo para dominar disparos via WhatsApp com segurança, 
            escalar sua operação sem correr riscos de bloqueio, e transformar a Wiize 
            na máquina de prospecção que gera resultados reais para o seu negócio — 
            do primeiro chip à operação com múltiplos números.
          </motion.p>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-wrap gap-6 text-sm"
          >
            {[
              { value: "5", label: "Fases completas" },
              { value: "13", label: "Vídeos estratégicos" },
              { value: "100%", label: "Liberado" },
            ].map((stat, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xl font-bold text-primary">{stat.value}</span>
                <span className="text-muted-foreground">{stat.label}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ===== CARROSSEL DE FASES — Cards Verticais ===== */}
      <div className="px-6 md:px-12 pb-20 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-foreground">
              Sua jornada completa
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Escolha uma fase para começar
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => scroll("left")}
              className="w-9 h-9 rounded-full bg-muted/50 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition border border-border/50"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => scroll("right")}
              className="w-9 h-9 rounded-full bg-muted/50 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition border border-border/50"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-none -mx-6 px-6 md:-mx-12 md:px-12"
        >
          {fases.map((fase, i) => (
            <FaseCard key={i} fase={fase} index={i} onClick={() => onSelectFase(fase, i)} />
          ))}
        </div>
      </div>
    </motion.div>
  );
};

/* ===== CARD DE FASE — Vertical, grande ===== */
const FaseCard = ({ fase, index, onClick }: { fase: Fase; index: number; onClick: () => void }) => {
  const Icon = FASE_ICONS[index] || Shield;

  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ scale: 1.03, y: -8 }}
      whileTap={{ scale: 0.97 }}
      className="group relative flex-shrink-0 w-[240px] md:w-[280px] rounded-2xl overflow-hidden snap-start focus:outline-none focus:ring-2 focus:ring-primary/50 border border-border/30 hover:border-primary/40 transition-colors duration-300"
    >
      {/* Capa — aspect ratio vertical (3:4) */}
      <div className="relative aspect-[3/4]">
        <img
          src={fase.capa}
          alt={fase.titulo}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />

        {/* Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-primary/5" />

        {/* Top badge */}
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/20 backdrop-blur-sm border border-primary/30 flex items-center justify-center">
            <Icon size={16} className="text-primary" />
          </div>
          <span className="text-[11px] font-bold text-primary bg-primary/10 backdrop-blur-sm px-2 py-0.5 rounded-md border border-primary/20">
            FASE {index + 1}
          </span>
        </div>

        {/* Play center on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
          <motion.div
            whileHover={{ scale: 1.1 }}
            className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center shadow-lg shadow-primary/40"
          >
            <Play size={28} className="text-primary-foreground ml-1" />
          </motion.div>
        </div>

        {/* Bottom content */}
        <div className="absolute bottom-0 left-0 right-0 p-5 space-y-2">
          <h3 className="font-bold text-foreground text-sm md:text-base leading-snug">
            {fase.titulo}
          </h3>
          <p className="text-muted-foreground text-xs line-clamp-2">
            {fase.descricao}
          </p>
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-primary/80 font-medium">
              {fase.subtitulo}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {fase.videos.length} vídeos
            </span>
          </div>
        </div>
      </div>
    </motion.button>
  );
};

/* ================================================================
   FASE DETAIL — Hero + Grid/Carrossel de Vídeos
   ================================================================ */
const FaseDetailView = ({
  fase,
  faseIndex,
  onBack,
  onPlayVideo,
}: {
  fase: Fase;
  faseIndex: number;
  onBack: () => void;
  onPlayVideo: (v: Video) => void;
}) => {
  const Icon = FASE_ICONS[faseIndex] || Shield;

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.3 }}
      className="min-h-[calc(100vh-58px)]"
    >
      {/* HERO DA FASE */}
      <div className="relative h-[320px] md:h-[420px] overflow-hidden">
        <img
          src={fase.capa}
          alt={fase.titulo}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/50 to-transparent" />

        <div className="relative z-10 h-full flex flex-col justify-end px-6 md:px-12 pb-10">
          <button
            onClick={onBack}
            className="absolute top-6 left-6 md:left-12 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition group bg-card/50 backdrop-blur-sm rounded-full px-4 py-2 border border-border/50"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Voltar
          </button>

          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                <Icon size={20} className="text-primary" />
              </div>
              <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                FASE {faseIndex + 1} • {fase.subtitulo}
              </span>
            </div>
            <h1 className="text-2xl md:text-4xl font-bold text-foreground tracking-tight">
              {fase.titulo}
            </h1>
            <p className="text-muted-foreground text-sm md:text-base max-w-xl">
              {fase.descricao}
            </p>
            <span className="inline-block text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full border border-border/50">
              {fase.videos.length} vídeos disponíveis
            </span>
          </div>
        </div>
      </div>

      {/* VÍDEOS */}
      <div className="px-6 md:px-12 py-10 space-y-6">
        <h2 className="text-lg font-semibold text-foreground">
          Conteúdos desta fase
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {fase.videos.map((video, i) => (
            <VideoCard key={i} video={video} index={i} onClick={() => onPlayVideo(video)} />
          ))}
        </div>
      </div>
    </motion.div>
  );
};

/* ===== CARD DE VÍDEO ===== */
const VideoCard = ({
  video,
  index,
  onClick,
}: {
  video: Video;
  index: number;
  onClick: () => void;
}) => (
  <motion.button
    onClick={onClick}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.1 }}
    whileHover={{ scale: 1.02, y: -4 }}
    whileTap={{ scale: 0.98 }}
    className="group relative rounded-xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary/50 border border-border/30 hover:border-primary/40 transition-colors bg-card"
  >
    {/* Capa */}
    <div className="relative aspect-video">
      <img
        src={video.capa}
        alt={video.titulo}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors" />

      {/* Play */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-primary/20 backdrop-blur-sm border border-primary/30 flex items-center justify-center opacity-70 group-hover:opacity-100 group-hover:bg-primary/90 group-hover:shadow-lg group-hover:shadow-primary/30 transition-all duration-300">
          <Play size={20} className="text-foreground ml-0.5 group-hover:text-primary-foreground" />
        </div>
      </div>

      {/* Episode number */}
      <div className="absolute top-3 left-3">
        <span className="text-[11px] font-bold text-foreground/80 bg-card/60 backdrop-blur-sm px-2 py-0.5 rounded-md border border-border/30">
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>
    </div>

    {/* Título */}
    <div className="p-4 text-left">
      <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
        {video.titulo}
      </h4>
    </div>
  </motion.button>
);

/* ================================================================
   PLAYER — Vídeo em destaque com fundo escuro
   ================================================================ */
const PlayerView = ({
  video,
  onBack,
}: {
  video: Video;
  onBack: () => void;
}) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.25 }}
    className="min-h-[calc(100vh-58px)] flex flex-col items-center px-4 md:px-12 py-8"
  >
    <div className="w-full max-w-5xl mb-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition group bg-card/50 backdrop-blur-sm rounded-full px-4 py-2 border border-border/50"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
        Voltar para a fase
      </button>
    </div>

    <div className="w-full max-w-5xl space-y-5">
      <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-border/30 bg-card shadow-2xl shadow-black/50">
        <iframe
          className="absolute inset-0 w-full h-full"
          src={`https://www.youtube-nocookie.com/embed/${video.videoId}?si=KXq_t6z3RPZmdgFR`}
          title={video.titulo}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
      <h2 className="text-xl md:text-2xl font-bold text-foreground">
        {video.titulo}
      </h2>
    </div>
  </motion.div>
);

export default Consultoria;
