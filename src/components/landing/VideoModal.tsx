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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        id="video-modal-container"
        className="sm:max-w-4xl w-[96vw] p-0 gap-0 border border-border bg-background shadow-2xl rounded-2xl overflow-hidden [&>button]:hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <div className="absolute w-2 h-2 rounded-full bg-primary animate-ping opacity-40" />
            </div>
            <div className="flex items-center gap-2">
              <Play size={13} className="text-primary fill-primary" />
              <span className="text-sm font-semibold text-foreground tracking-tight">Demonstração — Wiize</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
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

        {/* Video */}
        <div className="relative w-full bg-black" style={{ paddingBottom: "56.25%" }}>
          <iframe
            className="absolute inset-0 w-full h-full"
            src={open ? "https://www.youtube.com/embed/b8tqLSoVzqA?si=V_vX3t7FN5_fOifA&rel=0&modestbranding=1&disablekb=1" : ""}
            title="Wiize — Demonstração"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            style={{ pointerEvents: "auto" }}
          />
          {/* Overlay to block seek bar */}
          <div className="absolute bottom-0 left-0 right-0 h-[44px] bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-auto z-10" />
        </div>

        {/* CTA */}
        <div className="px-6 py-5 bg-card flex flex-col items-center gap-3 border-t border-border">
          <p className="text-muted-foreground text-sm text-center">
            Teste gratuitamente por 7 dias — sem compromisso
          </p>
          <Link to="/signup" onClick={() => { onSignupClick?.(); onOpenChange(false); }}>
            <Button variant="hero" size="lg" className="group rounded-full text-base px-10 h-12">
              Testar grátis por 7 dias
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
};
