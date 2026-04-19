import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowRight, X, Maximize2, Minimize2, Play } from "lucide-react";
import { Link } from "react-router-dom";

interface VideoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVideoWatched?: () => void;
  onSignupClick?: () => void;
}

export const VideoModal = ({ open, onOpenChange, onVideoWatched, onSignupClick }: VideoModalProps) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!open) {
      setIsFullscreen(false);
      return;
    }
    const timer = setTimeout(() => {
      onVideoWatched?.();
    }, 10000);
    return () => clearTimeout(timer);
  }, [open, onVideoWatched]);

  const toggleFullscreen = () => {
    const el = document.getElementById("video-modal-container");
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const videoSrc = "https://www.youtube.com/embed/ZRzK42SYNFc?si=LrJuZKLrktuhBMLa&rel=0&modestbranding=1&disablekb=1&autoplay=1&vq=hd1080&hd=1";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        id="video-modal-container"
        className="max-w-[98vw] sm:max-w-[96vw] lg:max-w-[92vw] xl:max-w-[1400px] w-full p-0 gap-0 border-0 bg-background shadow-2xl rounded-2xl overflow-hidden [&>button]:hidden max-h-[96vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-2.5 border-b border-border bg-card flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <div className="absolute w-2 h-2 rounded-full bg-primary animate-ping opacity-40" />
            </div>
            <div className="flex items-center gap-2">
              <Play size={13} className="text-primary fill-primary" />
              <span className="text-xs sm:text-sm font-semibold text-foreground tracking-tight">Demonstração — Wiize</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleFullscreen}
              className="hidden sm:flex p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
            >
              {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
            <button
              onClick={() => onOpenChange(false)}
              className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Video — horizontal 16:9, ocupa todo espaço disponível */}
        <div className="relative w-full bg-black flex-1 min-h-0">
          <iframe
            className="absolute inset-0 w-full h-full"
            src={videoSrc}
            title="Wiize — Demonstração"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>

        {/* CTA */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-card flex flex-col sm:flex-row items-center justify-center gap-3 border-t border-border flex-shrink-0">
          <p className="text-muted-foreground text-xs sm:text-sm text-center">
            Teste gratuitamente por 7 dias — sem compromisso
          </p>
          <Link to="/signup" onClick={() => { onSignupClick?.(); onOpenChange(false); }}>
            <Button variant="hero" size="lg" className="group rounded-full text-sm sm:text-base px-8 sm:px-10 h-10 sm:h-11">
              Testar grátis por 7 dias
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
};
