import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  SkipBack,
  SkipForward,
  X,
  ArrowRight,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TRIAL_DISABLED, notifyTrialDisabled } from "@/lib/trialStatus";
import videoUrl from "@/assets/video-vendas-prospeccao.mp4";

interface ProspeccaoVideoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSignupClick?: () => void;
}

const formatTime = (time: number) => {
  if (!Number.isFinite(time) || time < 0) return "0:00";
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

export const ProspeccaoVideoModal = ({
  open,
  onOpenChange,
  onSignupClick,
}: ProspeccaoVideoModalProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [needsSoundTap, setNeedsSoundTap] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideControlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetHideControlsTimeout = useCallback(() => {
    if (hideControlsTimeoutRef.current) clearTimeout(hideControlsTimeoutRef.current);
    hideControlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  // Abre: tenta autoplay COM som; se o navegador bloquear, toca mudo e mostra "Ativar som".
  useEffect(() => {
    if (!open) return;
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    video.volume = 1;
    video
      .play()
      .then(() => setNeedsSoundTap(false))
      .catch(() => {
        video.muted = true;
        setIsMuted(true);
        setNeedsSoundTap(true);
        video.play().catch(() => {});
      });
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      video.pause();
    };
  }, [open]);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  };

  const enableSound = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    video.volume = 1;
    setIsMuted(false);
    setVolume(1);
    setNeedsSoundTap(false);
    video.play().catch(() => {});
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
    if (!video.muted) setNeedsSoundTap(false);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    const video = videoRef.current;
    if (video) {
      video.volume = newVolume;
      video.muted = newVolume === 0;
    }
    setIsMuted(newVolume === 0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (videoRef.current) videoRef.current.currentTime = newTime;
  };

  const skip = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(duration || video.duration || 0, video.currentTime + seconds));
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (isPlaying) resetHideControlsTimeout();
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Vídeo de demonstração — Prospecção Wiize"
    >
      {/* Fundo desfocado */}
      <button
        aria-label="Fechar vídeo"
        onClick={() => onOpenChange(false)}
        className="absolute inset-0 bg-black/60 backdrop-blur-xl cursor-default"
      />

      <div
        ref={containerRef}
        className="relative w-full max-w-4xl rounded-2xl overflow-hidden bg-black border border-black/5 group shadow-[0_10px_36px_-14px_rgba(0,0,0,0.3)]"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => isPlaying && setShowControls(false)}
      >
        <div className="relative w-full" style={{ aspectRatio: "16 / 9" }}>
          <video
            ref={videoRef}
            src={videoUrl}
            className="absolute inset-0 w-full h-full object-contain bg-black"
            playsInline
            preload="auto"
            onClick={togglePlay}
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onPlay={() => {
              setIsPlaying(true);
              resetHideControlsTimeout();
            }}
            onPause={() => {
              setIsPlaying(false);
              setShowControls(true);
              if (hideControlsTimeoutRef.current) clearTimeout(hideControlsTimeoutRef.current);
            }}
          />

          {/* Botão "Ativar som" quando o navegador bloqueia o autoplay com áudio */}
          {needsSoundTap && (
            <button
              onClick={enableSound}
              className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-full bg-black text-white text-xs sm:text-sm font-semibold px-4 py-2 shadow-md hover:scale-105 transition-transform"
            >
              <Volume2 size={15} />
              Ativar som
            </button>
          )}

          {/* Barra de controles */}
          <div
            className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white/95 via-white/70 to-transparent transition-opacity duration-300 ${
              showControls ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
              {/* Progresso */}
              <div className="flex items-center gap-2 text-neutral-800 text-sm">
                <span className="min-w-0 text-xs font-mono">{formatTime(currentTime)}</span>
                <div className="flex-1 relative group/progress">
                  <input
                    type="range"
                    min={0}
                    max={duration || 0}
                    step={0.1}
                    value={currentTime}
                    onChange={handleSeek}
                    aria-label="Progresso do vídeo"
                    className="w-full h-1 rounded-full appearance-none cursor-pointer
                      [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                      [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-neutral-800
                      [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:cursor-pointer
                      [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:duration-200
                      group-hover/progress:[&::-webkit-slider-thumb]:scale-125"
                    style={{
                      background: `linear-gradient(to right, #262626 0%, #262626 ${progress}%, rgba(0,0,0,0.18) ${progress}%, rgba(0,0,0,0.18) 100%)`,
                    }}
                  />
                </div>
                <span className="min-w-0 text-xs font-mono">{formatTime(duration)}</span>
              </div>

              {/* Botões */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 sm:gap-2">
                  <button
                    onClick={() => skip(-10)}
                    className="p-2 text-neutral-800 hover:bg-black/10 rounded-md transition-colors"
                    aria-label="Voltar 10 segundos"
                  >
                    <SkipBack className="w-4 h-4" />
                  </button>
                  <button
                    onClick={togglePlay}
                    className="p-2 text-neutral-800 hover:bg-black/10 rounded-md transition-colors"
                    aria-label={isPlaying ? "Pausar" : "Reproduzir"}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  </button>
                  <button
                    onClick={() => skip(10)}
                    className="p-2 text-neutral-800 hover:bg-black/10 rounded-md transition-colors"
                    aria-label="Avançar 10 segundos"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-2 group/volume">
                    <button
                      onClick={toggleMute}
                      className="p-2 text-neutral-800 hover:bg-black/10 rounded-md transition-colors"
                      aria-label={isMuted ? "Ativar som" : "Silenciar"}
                    >
                      {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                    <div className="w-0 group-hover/volume:w-20 transition-all duration-200 overflow-hidden hidden sm:block">
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.1}
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        aria-label="Volume"
                        className="w-full h-1 rounded-full appearance-none cursor-pointer
                          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2
                          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-neutral-800
                          [&::-webkit-slider-thumb]:cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, #262626 0%, #262626 ${(isMuted ? 0 : volume) * 100}%, rgba(0,0,0,0.18) ${(isMuted ? 0 : volume) * 100}%, rgba(0,0,0,0.18) 100%)`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 sm:gap-2">
                  <button
                    onClick={toggleFullscreen}
                    className="p-2 text-neutral-800 hover:bg-black/10 rounded-md transition-colors"
                    aria-label={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
                  >
                    {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => onOpenChange(false)}
                    className="p-2 text-neutral-800 hover:bg-black/10 rounded-md transition-colors"
                    aria-label="Fechar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA abaixo do vídeo (some em tela cheia) */}
        {!isFullscreen && (
          <div className="px-4 sm:px-6 py-3 bg-card flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 border-t border-border">
            <p className="text-muted-foreground text-xs sm:text-sm text-center">
              Teste gratuitamente por 7 dias — sem compromisso
            </p>
            {TRIAL_DISABLED ? (
              <Button
                variant="hero"
                size="sm"
                className="rounded-full text-sm px-6 h-9 opacity-60 cursor-not-allowed shadow-none"
                disabled
                aria-disabled="true"
                onClick={(e) => {
                  e.preventDefault();
                  notifyTrialDisabled();
                }}
              >
                <Lock size={14} className="mr-1" />
                Teste grátis em breve
              </Button>
            ) : (
              <Link
                to="/signup/escolher-plano"
                onClick={() => {
                  onSignupClick?.();
                  onOpenChange(false);
                }}
              >
                <Button variant="hero" size="sm" className="group rounded-full text-sm px-6 h-9 shadow-none">
                  Testar grátis por 7 dias
                  <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProspeccaoVideoModal;
