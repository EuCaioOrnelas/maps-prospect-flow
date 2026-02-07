import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Play, ChevronLeft, ChevronRight } from "lucide-react";
import { fases, type Fase, type Video } from "@/data/consultoriaContent";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";

/**
 * Página de Consultoria Educacional — Experiência Netflix
 *
 * Fluxo: Home (fases) → Detalhe da fase (vídeos) → Player
 * Sem controle de progresso. Tudo liberado.
 */

type View =
  | { screen: "home" }
  | { screen: "fase"; fase: Fase }
  | { screen: "player"; fase: Fase; video: Video };

const Consultoria = () => {
  const [view, setView] = useState<View>({ screen: "home" });

  return (
    <div className="flex min-h-screen bg-[#0a0a0a]">
      <AppSidebar />
      <div className="flex-1 lg:ml-[72px]">
        <AppHeader />

        <AnimatePresence mode="wait">
          {view.screen === "home" && (
            <HomeView
              key="home"
              onSelectFase={(fase) => setView({ screen: "fase", fase })}
            />
          )}
          {view.screen === "fase" && (
            <FaseDetailView
              key={`fase-${view.fase.titulo}`}
              fase={view.fase}
              onBack={() => setView({ screen: "home" })}
              onPlayVideo={(video) =>
                setView({ screen: "player", fase: view.fase, video })
              }
            />
          )}
          {view.screen === "player" && (
            <PlayerView
              key={`player-${view.video.titulo}`}
              video={view.video}
              onBack={() => setView({ screen: "fase", fase: view.fase })}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

/* ================================================================
   HOME — Hero + Carrossel de Fases (Temporadas)
   ================================================================ */
const HomeView = ({ onSelectFase }: { onSelectFase: (f: Fase) => void }) => {
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
      {/* HERO */}
      <div className="relative h-[280px] md:h-[340px] flex items-end overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#111] to-[#0a0a0a]" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
        <div className="relative z-10 px-6 md:px-12 pb-10 max-w-4xl space-y-3">
          <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight leading-tight">
            Consultoria Estratégica
            <br />
            <span className="text-primary">de Disparos</span>
          </h1>
          <p className="text-white/50 text-sm md:text-base max-w-lg">
            Segurança, controle e escala
          </p>
        </div>
      </div>

      {/* CARROSSEL DE FASES */}
      <div className="px-6 md:px-12 pb-16 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg md:text-xl font-semibold text-white/90">
            Fases
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => scroll("left")}
              className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => scroll("right")}
              className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition"
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
            <FaseCard key={i} fase={fase} onClick={() => onSelectFase(fase)} />
          ))}
        </div>
      </div>
    </motion.div>
  );
};

/* ===== CARD DE FASE (TEMPORADA) ===== */
const FaseCard = ({ fase, onClick }: { fase: Fase; onClick: () => void }) => (
  <motion.button
    onClick={onClick}
    whileHover={{ scale: 1.04 }}
    whileTap={{ scale: 0.97 }}
    className="group relative flex-shrink-0 w-[280px] md:w-[340px] aspect-[16/10] rounded-xl overflow-hidden snap-start focus:outline-none focus:ring-2 focus:ring-primary/50"
  >
    {/* Capa */}
    <img
      src={fase.capa}
      alt={fase.titulo}
      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
    />

    {/* Overlay escuro */}
    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10 group-hover:from-black/95 transition-all duration-300" />

    {/* Glow no hover */}
    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-[inset_0_0_60px_rgba(34,197,94,0.15)]" />

    {/* Play icon */}
    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
      <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center shadow-lg shadow-primary/30">
        <Play size={24} className="text-primary-foreground ml-0.5" />
      </div>
    </div>

    {/* Texto */}
    <div className="absolute bottom-0 left-0 right-0 p-5 text-left space-y-1">
      <h3 className="font-bold text-white text-sm md:text-base leading-snug drop-shadow-lg">
        {fase.titulo}
      </h3>
      <p className="text-white/60 text-xs">{fase.subtitulo}</p>
    </div>
  </motion.button>
);

/* ================================================================
   FASE DETAIL — Hero da fase + Carrossel de Vídeos
   ================================================================ */
const FaseDetailView = ({
  fase,
  onBack,
  onPlayVideo,
}: {
  fase: Fase;
  onBack: () => void;
  onPlayVideo: (v: Video) => void;
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({
      left: dir === "left" ? -340 : 340,
      behavior: "smooth",
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.3 }}
      className="min-h-[calc(100vh-58px)]"
    >
      {/* HERO DA FASE */}
      <div className="relative h-[300px] md:h-[380px] overflow-hidden">
        <img
          src={fase.capa}
          alt={fase.titulo}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a]/80 to-transparent" />

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col justify-end px-6 md:px-12 pb-10">
          <button
            onClick={onBack}
            className="absolute top-6 left-6 md:left-12 flex items-center gap-2 text-sm text-white/60 hover:text-white transition group"
          >
            <ArrowLeft
              size={16}
              className="group-hover:-translate-x-1 transition-transform"
            />
            Voltar
          </button>

          <div className="space-y-2 max-w-2xl">
            <h1 className="text-2xl md:text-4xl font-bold text-white tracking-tight">
              {fase.titulo}
            </h1>
            <p className="text-white/50 text-sm md:text-base">
              {fase.descricao}
            </p>
            <span className="inline-block text-xs text-primary font-medium bg-primary/10 px-3 py-1 rounded-full">
              {fase.videos.length} vídeos • {fase.subtitulo}
            </span>
          </div>
        </div>
      </div>

      {/* CARROSSEL DE VÍDEOS */}
      <div className="px-6 md:px-12 py-10 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white/90">
            Conteúdos desta fase
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => scroll("left")}
              className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => scroll("right")}
              className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-none -mx-6 px-6 md:-mx-12 md:px-12"
        >
          {fase.videos.map((video, i) => (
            <VideoCard
              key={i}
              video={video}
              index={i}
              onClick={() => onPlayVideo(video)}
            />
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
    transition={{ delay: index * 0.08 }}
    whileHover={{ scale: 1.05, y: -4 }}
    whileTap={{ scale: 0.97 }}
    className="group relative flex-shrink-0 w-[220px] md:w-[280px] rounded-lg overflow-hidden snap-start focus:outline-none focus:ring-2 focus:ring-primary/50"
  >
    {/* Capa do vídeo */}
    <div className="relative aspect-video">
      <img
        src={video.capa}
        alt={video.titulo}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
      />
      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors" />

      {/* Play */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-sm border border-white/20 flex items-center justify-center opacity-70 group-hover:opacity-100 group-hover:bg-primary/90 group-hover:border-primary/50 transition-all duration-300">
          <Play
            size={18}
            className="text-white ml-0.5 group-hover:text-primary-foreground"
          />
        </div>
      </div>
    </div>

    {/* Título */}
    <div className="p-3 bg-[#141414] text-left">
      <h4 className="text-sm font-medium text-white/90 group-hover:text-primary transition-colors line-clamp-2">
        {video.titulo}
      </h4>
    </div>
  </motion.button>
);

/* ================================================================
   PLAYER — Vídeo em destaque
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
    {/* Back */}
    <div className="w-full max-w-5xl mb-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition group"
      >
        <ArrowLeft
          size={16}
          className="group-hover:-translate-x-1 transition-transform"
        />
        Voltar para a fase
      </button>
    </div>

    {/* Player */}
    <div className="w-full max-w-5xl space-y-4">
      <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/5 bg-black shadow-2xl shadow-black/50">
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
      <h2 className="text-xl md:text-2xl font-bold text-white">
        {video.titulo}
      </h2>
    </div>
  </motion.div>
);

export default Consultoria;
