import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowRight, X, Maximize2, Minimize2 } from "lucide-react";
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
    // Mark video as watched after 10 seconds
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        id="video-modal-container"
        className="sm:max-w-4xl w-[95vw] p-0 gap-0 bg-black/95 border-border/20 overflow-hidden [&>button]:hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-black/80">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-medium text-white/90">Veja a Wiize em ação</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white"
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button
              onClick={() => onOpenChange(false)}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Video */}
        <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
          <iframe
            className="absolute inset-0 w-full h-full"
            src={open ? "https://www.youtube.com/embed/b8tqLSoVzqA?si=V_vX3t7FN5_fOifA&rel=0&modestbranding=1&disablekb=1" : ""}
            title="Wiize — Como funciona"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            style={{ pointerEvents: "auto" }}
          />
          {/* Overlay to block seek bar - covers bottom 40px of iframe */}
          <div className="absolute bottom-0 left-0 right-0 h-[42px] bg-gradient-to-t from-black/90 to-transparent pointer-events-auto z-10" />
        </div>

        {/* CTA */}
        <div className="px-6 py-5 bg-gradient-to-t from-black via-black/95 to-black/80 flex flex-col items-center gap-3">
          <p className="text-white/70 text-sm text-center">
            Teste gratuitamente por 7 dias — sem compromisso
          </p>
          <Link to="/signup" onClick={() => { onSignupClick?.(); onOpenChange(false); }}>
            <Button variant="hero" size="lg" className="group rounded-full text-base px-8 h-12">
              Testar grátis por 7 dias
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
};
