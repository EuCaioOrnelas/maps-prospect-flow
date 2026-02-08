import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Play, ChevronLeft, ChevronRight, Shield, TrendingUp, BarChart3, Zap, Award, Lock, Crown } from "lucide-react";
import { fases, type Fase, type Video } from "@/data/consultoriaContent";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { BackgroundGlow } from "@/components/layout/BackgroundGlow";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ComingSoonDialog } from "@/components/consultoria/ComingSoonDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const FASE_ICONS = [Shield, Zap, TrendingUp, BarChart3, Award];

type View =
  | { screen: "home" }
  | { screen: "fase"; fase: Fase; faseIndex: number }
  | { screen: "player"; fase: Fase; faseIndex: number; video: Video; videoIndex: number };

const PAID_PLANS = ["start", "growth", "scale"];

const Consultoria = () => {
  const [view, setView] = useState<View>({ screen: "home" });
  const [comingSoonOpen, setComingSoonOpen] = useState(false);
  const [comingSoonTitle, setComingSoonTitle] = useState("");
  const { profile } = useAuth();
  const navigate = useNavigate();

  const isPaidUser = profile?.plan ? PAID_PLANS.includes(profile.plan) : false;

  const showComingSoon = (title: string) => {
    setComingSoonTitle(title);
    setComingSoonOpen(true);
  };

  if (!isPaidUser) {
    return (
      <div className="flex min-h-screen bg-background">
        <AppSidebar />
        <div className="flex-1 min-w-0 lg:ml-[72px] relative">
          <BackgroundGlow />
          <div className="relative z-10">
            <AppHeader />
            <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md space-y-6"
              >
                <div className="w-20 h-20 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center mx-auto">
                  <Crown size={40} className="text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">Conteúdo Exclusivo</h1>
                <p className="text-muted-foreground">
                  A Consultoria Wiize é um conteúdo exclusivo para assinantes dos planos <strong className="text-foreground">Start</strong>, <strong className="text-foreground">Growth</strong> ou <strong className="text-foreground">Scale</strong>.
                </p>
                <Button
                  onClick={() => navigate("/upgrade")}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 rounded-xl font-semibold"
                >
                  <Crown size={18} className="mr-2" />
                  Ver Planos
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 min-w-0 lg:ml-[72px] relative">
        <div className="relative z-10">
          <AppHeader />
          <AnimatePresence mode="wait">
            {view.screen === "home" && (
              <HomeView
                key="home"
                onSelectFase={(fase, i) => {
                  if (fase.status === "em_breve") {
                    showComingSoon(fase.titulo);
                    return;
                  }
                  setView({ screen: "fase", fase, faseIndex: i });
                }}
              />
            )}
            {view.screen === "fase" && (
              <FaseDetailView
                key={`fase-${view.faseIndex}`}
                fase={view.fase}
                faseIndex={view.faseIndex}
                onBack={() => setView({ screen: "home" })}
                onPlayVideo={(video, videoIndex) => {
                  if (video.status === "em_breve") {
                    showComingSoon(video.titulo);
                    return;
                  }
                  setView({ screen: "player", fase: view.fase, faseIndex: view.faseIndex, video, videoIndex });
                }}
              />
            )}
            {view.screen === "player" && (
              <PlayerView
                key={`player-${view.videoIndex}`}
                fase={view.fase}
                faseIndex={view.faseIndex}
                video={view.video}
                videoIndex={view.videoIndex}
                onBack={() => setView({ screen: "fase", fase: view.fase, faseIndex: view.faseIndex })}
                onNavigate={(video, videoIndex) => {
                  setView({ screen: "player", fase: view.fase, faseIndex: view.faseIndex, video, videoIndex });
                }}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      <ComingSoonDialog
        open={comingSoonOpen}
        onOpenChange={setComingSoonOpen}
        title={comingSoonTitle}
      />
    </div>
  );
};

/* ================================================================
   HOME
   ================================================================ */
const HomeView = ({ onSelectFase }: { onSelectFase: (f: Fase, i: number) => void }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    const container = scrollRef.current;
    if (!container) return;
    const cardWidth = 300; // card width + gap
    const newPos = container.scrollLeft + (dir === "left" ? -cardWidth : cardWidth);
    container.scrollTo({ left: newPos, behavior: "smooth" });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-[calc(100vh-58px)]"
    >
      {/* HERO with smooth blended background */}
      <div className="relative">
        <div className="absolute inset-0 h-full pointer-events-none overflow-hidden">
          <img src={fases[0].capa} alt="" className="w-full h-full object-cover opacity-[0.20] blur-md scale-105" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />
        </div>

        <div className="relative z-10 px-6 md:px-12 pt-16 md:pt-28 pb-20 md:pb-32 max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-6">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-medium text-primary">Consultoria Exclusiva Wiize</span>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="text-3xl md:text-5xl lg:text-6xl font-bold text-foreground tracking-tight leading-[1.1] mb-6">
            Geração e Ativação<br />
            <span className="bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">
              Inteligente de Leads
            </span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl mb-8">
            A metodologia completa para prospectar, ativar e converter leads
            com a Wiize — desde a configuração segura até a operação em escala.
            Aprenda a construir um fluxo de prospecção previsível, profissional
            e que gera resultados reais para o seu negócio.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="flex flex-wrap gap-6 text-sm">
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

      {/* CARROSSEL */}
      <div className="relative z-10 px-6 md:px-12 pb-20 space-y-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-foreground">Sua jornada completa</h2>
          <p className="text-sm text-muted-foreground mt-1">Escolha uma fase para começar</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => scroll("left")}
            className="w-9 h-9 rounded-full bg-muted/50 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition border border-border/50">
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => scroll("right")}
            className="w-9 h-9 rounded-full bg-muted/50 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition border border-border/50">
            <ChevronRight size={18} />
          </button>
        </div>

        <TooltipProvider delayDuration={200}>
          <div className="relative">
            <div
              ref={scrollRef}
              className="flex gap-5 pb-12 pt-4 overflow-x-auto snap-x snap-mandatory scrollbar-none"
            >
              {fases.map((fase, i) => (
                <FaseCard key={i} fase={fase} index={i} onClick={() => onSelectFase(fase, i)} />
              ))}
            </div>
            {/* Fade edges */}
            <div className="absolute top-0 left-0 bottom-0 w-8 pointer-events-none bg-gradient-to-r from-background to-transparent z-10" />
            <div className="absolute top-0 right-0 bottom-0 w-16 pointer-events-none bg-gradient-to-l from-background to-transparent z-10" />
          </div>
        </TooltipProvider>
      </div>
    </motion.div>
  );
};

/* ===== CARD DE FASE ===== */
const FaseCard = ({ fase, index, onClick }: { fase: Fase; index: number; onClick: () => void }) => {
  const Icon = FASE_ICONS[index] || Shield;
  const isComingSoon = fase.status === "em_breve";

  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={isComingSoon ? {} : { y: -8 }}
      whileTap={isComingSoon ? {} : { scale: 0.97 }}
      className={`group relative flex-shrink-0 w-[240px] md:w-[280px] rounded-2xl snap-start focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors duration-300 ${
        isComingSoon ? "cursor-pointer" : ""
      }`}
    >
      <div className="relative aspect-[3/4] rounded-2xl overflow-hidden">
        <img src={fase.capa} alt={fase.titulo}
          className={`absolute inset-0 w-full h-full object-cover transition-transform duration-700 ${
            isComingSoon ? "grayscale brightness-[0.35]" : "group-hover:scale-110"
          }`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />
        {!isComingSoon && <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-primary/5" />}

        {/* Top area */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-black/40 backdrop-blur-sm border border-white/20 flex items-center justify-center">
              <Icon size={14} className="text-white" />
            </div>
            <span className="text-[11px] font-bold text-white bg-black/40 backdrop-blur-sm px-2 h-7 flex items-center rounded-md border border-white/20">
              FASE {index + 1}
            </span>
          </div>
          <span className="text-[10px] text-white/90 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-md border border-white/20">
            {fase.videos.length} vídeos
          </span>
        </div>

        {/* Center */}
        {isComingSoon ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center border border-white/10">
              <Lock size={28} className="text-white/60" />
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
            <motion.div whileHover={{ scale: 1.1 }} className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center shadow-lg shadow-primary/40">
              <Play size={28} className="text-primary-foreground ml-1" />
            </motion.div>
          </div>
        )}

        {isComingSoon && (
          <div className="absolute bottom-14 left-0 right-0 flex justify-center">
            <span className="text-[11px] font-semibold text-white/80 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10">Em breve</span>
          </div>
        )}

        {/* Bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-5 space-y-2">
          <h3 className={`font-bold text-sm md:text-base leading-snug ${isComingSoon ? "text-foreground/50" : "text-foreground"}`}>
            {fase.titulo}
          </h3>
          <p className={`text-xs line-clamp-2 ${isComingSoon ? "text-muted-foreground/50" : "text-muted-foreground"}`}>
            {fase.descricao}
          </p>
        </div>
      </div>
    </motion.button>
  );
};

/* ================================================================
   FASE DETAIL
   ================================================================ */
const FaseDetailView = ({
  fase, faseIndex, onBack, onPlayVideo,
}: {
  fase: Fase;
  faseIndex: number;
  onBack: () => void;
  onPlayVideo: (v: Video, index: number) => void;
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
      {/* HERO — smooth blended background like home */}
      <div className="relative">
        <div className="absolute inset-0 h-[130%] pointer-events-none overflow-hidden">
          <img src={fase.capa} alt={fase.titulo} className="w-full h-full object-cover opacity-[0.20] blur-md scale-105" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />
        </div>

        <div className="relative z-10 px-6 md:px-12 pt-8 pb-16 md:pb-20">
          <button onClick={onBack}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition group bg-card/50 backdrop-blur-sm rounded-full px-4 py-2 border border-border/50 mb-8">
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Voltar
          </button>

          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                <Icon size={20} className="text-primary" />
              </div>
              <span className="text-xs font-bold text-primary bg-primary/20 px-4 h-10 flex items-center rounded-xl border border-primary/30">
                FASE {faseIndex + 1}
              </span>
            </div>
            <h1 className="text-2xl md:text-4xl font-bold text-foreground tracking-tight">{fase.titulo}</h1>
            <p className="text-muted-foreground text-sm md:text-base max-w-xl">{fase.descricao}</p>
            <span className="inline-block text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full border border-border/50">
              {fase.videos.length} vídeos disponíveis
            </span>
          </div>
        </div>
      </div>

      {/* VÍDEOS */}
      <div className="relative z-10 px-6 md:px-12 py-10 space-y-6">
        <h2 className="text-lg font-semibold text-foreground">Conteúdos desta fase</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {fase.videos.map((video, i) => (
            <VideoCard key={i} video={video} index={i} onClick={() => onPlayVideo(video, i)} />
          ))}
        </div>
      </div>
    </motion.div>
  );
};

/* ===== CARD DE VÍDEO ===== */
const VideoCard = ({ video, index, onClick }: { video: Video; index: number; onClick: () => void }) => {
  const isComingSoon = video.status === "em_breve";

  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={isComingSoon ? {} : { scale: 1.02, y: -4 }}
      whileTap={isComingSoon ? {} : { scale: 0.98 }}
      className={`group relative rounded-xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors bg-card ${
        isComingSoon ? "cursor-pointer border border-border/20" : "border border-border/30 hover:border-primary/40"
      }`}
    >
      <div className="relative aspect-video">
        <img src={video.capa} alt={video.titulo}
          className={`absolute inset-0 w-full h-full object-cover transition-transform duration-500 ${
            isComingSoon ? "grayscale brightness-[0.35]" : "group-hover:scale-105"
          }`}
        />
        <div className={`absolute inset-0 transition-colors ${isComingSoon ? "bg-black/50" : "bg-black/30 group-hover:bg-black/50"}`} />

        {isComingSoon ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center border border-white/10">
              <Lock size={20} className="text-white/60" />
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-primary/20 backdrop-blur-sm border border-primary/30 flex items-center justify-center opacity-70 group-hover:opacity-100 group-hover:bg-primary/90 group-hover:shadow-lg group-hover:shadow-primary/30 transition-all duration-300">
              <Play size={20} className="text-foreground ml-0.5 group-hover:text-primary-foreground" />
            </div>
          </div>
        )}

        <div className="absolute top-3 left-3">
          <span className="text-[11px] font-bold text-foreground/80 bg-card/60 backdrop-blur-sm px-2 py-0.5 rounded-md border border-border/30">
            {String(index + 1).padStart(2, "0")}
          </span>
        </div>

        {isComingSoon && (
          <div className="absolute top-3 right-3">
            <span className="text-[10px] font-semibold text-white/80 bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-md border border-white/10">Em breve</span>
          </div>
        )}
      </div>

      <div className="p-4 text-left">
        <h4 className={`text-sm font-semibold transition-colors line-clamp-2 ${
          isComingSoon ? "text-foreground/40" : "text-foreground group-hover:text-primary"
        }`}>
          {video.titulo}
        </h4>
      </div>
    </motion.button>
  );
};

/* ================================================================
   PLAYER — Title on top, prev/next, comments
   ================================================================ */
const PlayerView = ({
  fase, faseIndex, video, videoIndex, onBack, onNavigate,
}: {
  fase: Fase;
  faseIndex: number;
  video: Video;
  videoIndex: number;
  onBack: () => void;
  onNavigate: (video: Video, index: number) => void;
}) => {
  // Find active (non-coming-soon) videos for prev/next
  const activeVideos = fase.videos.map((v, i) => ({ video: v, index: i })).filter(v => v.video.status !== "em_breve");
  const currentActiveIdx = activeVideos.findIndex(v => v.index === videoIndex);
  const prevVideo = currentActiveIdx > 0 ? activeVideos[currentActiveIdx - 1] : null;
  const nextVideo = currentActiveIdx < activeVideos.length - 1 ? activeVideos[currentActiveIdx + 1] : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="min-h-[calc(100vh-58px)] px-4 md:px-12 py-8"
    >
      <div className="w-full max-w-5xl mx-auto space-y-6">
        {/* Back button */}
        <button onClick={onBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition group bg-card/50 backdrop-blur-sm rounded-full px-4 py-2 border border-border/50">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Voltar para a fase
        </button>

        {/* Title on top */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-md border border-primary/20">
              FASE {faseIndex + 1}
            </span>
            <span className="text-xs text-muted-foreground">
              Aula {videoIndex + 1} de {fase.videos.length}
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-foreground">{video.titulo}</h2>
        </div>

        {/* Video player */}
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

        {/* Prev / Next navigation */}
        <div className="flex items-center justify-between gap-4">
          {prevVideo ? (
            <button
              onClick={() => onNavigate(prevVideo.video, prevVideo.index)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition group bg-card/50 backdrop-blur-sm rounded-lg px-4 py-3 border border-border/50 hover:border-primary/40 flex-1 max-w-xs"
            >
              <ChevronLeft size={18} className="text-primary flex-shrink-0 group-hover:-translate-x-1 transition-transform" />
              <div className="text-left min-w-0">
                <p className="text-[11px] text-muted-foreground">Aula anterior</p>
                <p className="text-sm font-medium text-foreground truncate">{prevVideo.video.titulo}</p>
              </div>
            </button>
          ) : <div />}

          {nextVideo ? (
            <button
              onClick={() => onNavigate(nextVideo.video, nextVideo.index)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition group bg-card/50 backdrop-blur-sm rounded-lg px-4 py-3 border border-border/50 hover:border-primary/40 flex-1 max-w-xs text-right"
            >
              <div className="text-right min-w-0 flex-1">
                <p className="text-[11px] text-muted-foreground">Próxima aula</p>
                <p className="text-sm font-medium text-foreground truncate">{nextVideo.video.titulo}</p>
              </div>
              <ChevronRight size={18} className="text-primary flex-shrink-0 group-hover:translate-x-1 transition-transform" />
            </button>
          ) : <div />}
        </div>

      </div>
    </motion.div>
  );
};

export default Consultoria;
