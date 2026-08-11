import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Play, ChevronLeft, ChevronRight, Shield, TrendingUp, BarChart3, Zap, Award, Lock, Construction, Rocket, BookOpen } from "lucide-react";
import { fases, type Fase, type Video } from "@/data/consultoriaContent";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { BackgroundGlow } from "@/components/layout/BackgroundGlow";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ComingSoonDialog } from "@/components/consultoria/ComingSoonDialog";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { useAutoScoreTracking } from "@/hooks/useAutoScoreTracking";
import { Loader2 } from "lucide-react";

const FASE_ICONS = [Shield, Zap, TrendingUp, BarChart3, Award];

type View =
  | { screen: "home" }
  | { screen: "fase"; fase: Fase; faseIndex: number }
  | { screen: "player"; fase: Fase; faseIndex: number; video: Video; videoIndex: number };

const Consultoria = () => {
  useAutoScoreTracking("consultoria");
  const [view, setView] = useState<View>({ screen: "home" });
  const [comingSoonOpen, setComingSoonOpen] = useState(false);
  const [comingSoonTitle, setComingSoonTitle] = useState("");
  const { isAdmin, loading } = useAdminCheck();

  const showComingSoon = (title: string) => {
    setComingSoonTitle(title);
    setComingSoonOpen(true);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background">
        <AppSidebar />
        <div className="flex-1 min-w-0 lg:ml-[72px] flex items-center justify-center">
          <Loader2 size={32} className="text-primary animate-spin" />
        </div>
      </div>
    );
  }

  // Block all non-admin users
  if (!isAdmin) {
    return (
      <div className="flex min-h-screen bg-background">
        <AppSidebar />
        <div className="flex-1 min-w-0 lg:ml-[72px] relative">
          <BackgroundGlow />
          <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-lg space-y-8"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-24 h-24 rounded-3xl bg-primary/15 border border-primary/25 flex items-center justify-center mx-auto"
              >
                <Construction size={44} className="text-primary" />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5"
              >
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-medium text-primary">Em Desenvolvimento</span>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-3"
              >
                <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                  Consultoria Wiize
                </h1>
                <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
                  Estamos preparando uma <strong className="text-foreground">consultoria completa e exclusiva</strong> para
                  assinantes Wiize. Em breve você terá acesso a conteúdos estratégicos para maximizar seus resultados.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="space-y-3"
              >
                <div className="flex items-start gap-3 p-4 rounded-xl bg-card/80 border border-border/50 text-left">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                    <Rocket size={20} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Metodologia completa</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Estratégias avançadas de prospecção, ativação e conversão de leads com a Wiize.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-xl bg-card/80 border border-border/50 text-left">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                    <BookOpen size={20} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Conteúdo exclusivo</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Vídeos, guias práticos e material de apoio para assinantes dos planos pagos.
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-xs text-muted-foreground/70"
              >
                Será lançada em breve. Fique atento às novidades! 🚀
              </motion.p>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  // Admin sees the full consultoria content
  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 min-w-0 lg:ml-[72px] relative">
        <div className="relative z-10">
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
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(true);

  const updateFades = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setShowLeftFade(el.scrollLeft > 20);
    setShowRightFade(el.scrollLeft < el.scrollWidth - el.clientWidth - 20);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateFades();
    el.addEventListener("scroll", updateFades, { passive: true });
    window.addEventListener("resize", updateFades);
    return () => {
      el.removeEventListener("scroll", updateFades);
      window.removeEventListener("resize", updateFades);
    };
  }, [updateFades]);

  const scroll = (dir: "left" | "right") => {
    const container = scrollRef.current;
    if (!container) return;
    const cardWidth = 300;
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
          <img src={fases[3].capa} alt="" className="w-full h-full object-cover opacity-[0.20] blur-md scale-105" />
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
            className="w-9 h-9 rounded-[10px] bg-muted/50 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition border border-border/50">
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => scroll("right")}
            className="w-9 h-9 rounded-[10px] bg-muted/50 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition border border-border/50">
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
            <div className={`absolute top-0 left-0 bottom-0 w-12 pointer-events-none bg-gradient-to-r from-background to-transparent z-10 transition-opacity duration-500 ${showLeftFade ? 'opacity-100' : 'opacity-0'}`} />
            <div className={`absolute top-0 right-0 bottom-0 w-16 pointer-events-none bg-gradient-to-l from-background to-transparent z-10 transition-opacity duration-500 ${showRightFade ? 'opacity-100' : 'opacity-0'}`} />
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

        {isComingSoon ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 -translate-y-8">
            <div className="w-16 h-16 rounded-[18px] bg-black/60 backdrop-blur-sm flex items-center justify-center border border-white/10">
              <Lock size={28} className="text-white/60" />
            </div>
            <span className="text-[11px] font-semibold text-white/80 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10">Em breve</span>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
            <motion.div whileHover={{ scale: 1.1 }} className="w-16 h-16 rounded-[18px] bg-primary/90 flex items-center justify-center shadow-lg shadow-primary/40">
              <Play size={28} className="text-primary-foreground ml-1" />
            </motion.div>
          </div>
        )}
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
      transition={{ delay: index * 0.08 }}
      whileHover={isComingSoon ? {} : { y: -4 }}
      whileTap={isComingSoon ? {} : { scale: 0.98 }}
      className="group text-left rounded-xl overflow-hidden border border-border/50 bg-card/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
    >
      <div className="relative aspect-video overflow-hidden">
        <img src={video.capa} alt={video.titulo}
          className={`w-full h-full object-cover transition-transform duration-500 ${
            isComingSoon ? "grayscale brightness-50" : "group-hover:scale-105"
          }`}
        />
        {isComingSoon ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <div className="w-12 h-12 rounded-[14px] bg-black/60 backdrop-blur-sm flex items-center justify-center border border-white/10">
              <Lock size={22} className="text-white/60" />
            </div>
            <span className="text-[10px] font-semibold text-white/80 bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-full border border-white/10">Em breve</span>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/20">
            <div className="w-12 h-12 rounded-[14px] bg-primary/90 flex items-center justify-center shadow-lg shadow-primary/30">
              <Play size={22} className="text-primary-foreground ml-0.5" />
            </div>
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
            AULA {index + 1}
          </span>
        </div>
        <h3 className={`text-sm font-semibold leading-snug ${isComingSoon ? "text-foreground/50" : "text-foreground"}`}>
          {video.titulo}
        </h3>
      </div>
    </motion.button>
  );
};

/* ================================================================
   PLAYER
   ================================================================ */
const PlayerView = ({
  fase, faseIndex, video, videoIndex, onBack, onNavigate,
}: {
  fase: Fase;
  faseIndex: number;
  video: Video;
  videoIndex: number;
  onBack: () => void;
  onNavigate: (v: Video, index: number) => void;
}) => {
  const prevVideo = videoIndex > 0 ? fase.videos[videoIndex - 1] : null;
  const nextVideo = videoIndex < fase.videos.length - 1 ? fase.videos[videoIndex + 1] : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-[calc(100vh-58px)] px-4 md:px-8 lg:px-12 py-6 md:py-10"
    >
      <button onClick={onBack}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition group bg-card/50 backdrop-blur-sm rounded-full px-4 py-2 border border-border/50 mb-6">
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
        Voltar para {fase.titulo}
      </button>

      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-md border border-primary/20">
              FASE {faseIndex + 1} — AULA {videoIndex + 1}
            </span>
          </div>
          <h1 className="text-xl md:text-3xl font-bold text-foreground">{video.titulo}</h1>
        </div>

        <div className="relative aspect-video rounded-2xl overflow-hidden border border-border/50 bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${video.videoId}?rel=0&modestbranding=1`}
            title={video.titulo}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        </div>

        <div className="flex items-center justify-between pt-4">
          {prevVideo ? (
            <button
              onClick={() => onNavigate(prevVideo, videoIndex - 1)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition group bg-card/50 backdrop-blur-sm rounded-full px-4 py-2 border border-border/50"
            >
              <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              <span className="hidden sm:inline">{prevVideo.titulo}</span>
              <span className="sm:hidden">Anterior</span>
            </button>
          ) : <div />}
          {nextVideo ? (
            <button
              onClick={() => onNavigate(nextVideo, videoIndex + 1)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition group bg-card/50 backdrop-blur-sm rounded-full px-4 py-2 border border-border/50"
            >
              <span className="hidden sm:inline">{nextVideo.titulo}</span>
              <span className="sm:hidden">Próximo</span>
              <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          ) : <div />}
        </div>
      </div>
    </motion.div>
  );
};

export default Consultoria;
