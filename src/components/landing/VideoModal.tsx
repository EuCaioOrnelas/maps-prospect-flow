import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowRight, X, Maximize2, Minimize2, Play, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { TRIAL_DISABLED, notifyTrialDisabled } from "@/lib/trialStatus";

interface VideoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSignupClick?: () => void;
}

export const VideoModal = ({ open, onOpenChange, onSignupClick }: VideoModalProps) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoScaleX = 1.055;

  useEffect(() => {
    if (!open) {
      setIsFullscreen(false);
    }
  }, [open]);

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

 // enablejsapi=1 lets us postMessage pause/play commands to the iframe.
 const videoSrc = "https://www.youtube.com/embed/ZRzK42SYNFc?si=LrJuZKLrktuhBMLa&rel=0&modestbranding=1&disablekb=1&autoplay=1&playsinline=1&vq=hd1080&hd=1&enablejsapi=1";

 const iframeRef = useRef<HTMLIFrameElement>(null);

 // Pause the YouTube player when the iframe is scrolled out of view;
 // resume when it becomes visible again. Reduces CPU/network cost.
 useEffect(() => {
 if (!open) return;
 const iframe = iframeRef.current;
 if (!iframe) return;

 const post = (func: "pauseVideo" | "playVideo") => {
 iframe.contentWindow?.postMessage(
 JSON.stringify({ event: "command", func, args: [] }),
 "*"
 );
 };

 const io = new IntersectionObserver(
 ([entry]) => {
 if (entry.isIntersecting && entry.intersectionRatio > 0.2) {
 post("playVideo");
 } else {
 post("pauseVideo");
 }
 },
 { threshold: [0, 0.2, 0.5] }
 );

 io.observe(iframe);
 return () => io.disconnect();
 }, [open]);

 return (
 <Dialog open={open} onOpenChange={onOpenChange}>
 <DialogContent
 id="video-modal-container"
 className="w-[96vw] max-w-none max-h-[94vh] p-0 gap-0 border-0 bg-background shadow-2xl rounded-card overflow-hidden [&>button]:hidden"
 style={{ width: "min(96vw, calc((100vh - 10rem) * 16 / 9), 1480px)" }}
 >
 {/* Header */}
 <div className="flex items-center justify-between px-4 sm:px-5 py-2.5 border-b border-border bg-card">
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
 className="hidden sm:flex p-2 rounded-card hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
 >
 {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
 </button>
 <button
 onClick={() => onOpenChange(false)}
 className="p-2 rounded-card hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
 >
 <X size={15} />
 </button>
 </div>
 </div>

 <div className="relative w-full overflow-hidden bg-card" style={{ aspectRatio: "16 / 9" }}>
 <iframe
 ref={iframeRef}
 className="absolute inset-0 block h-full w-full origin-center"
 style={{ transform: `scaleX(${videoScaleX})` }}
 src={videoSrc}
 title="Wiize — Demonstração"
 frameBorder="0"
 loading="lazy"
 allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
 referrerPolicy="strict-origin-when-cross-origin"
 allowFullScreen
 />
 </div>

 {/* CTA */}
 <div className="px-4 sm:px-6 py-3 sm:py-4 bg-card flex flex-col sm:flex-row items-center justify-center gap-3 border-t border-border">
 <p className="text-muted-foreground text-xs sm:text-sm text-center">
 Teste gratuitamente por 7 dias — sem compromisso
 </p>
 {TRIAL_DISABLED ? (
 <Button
 variant="hero"
 size="lg"
 className="group rounded-full text-sm sm:text-base px-8 sm:px-10 h-10 sm:h-11 opacity-60 cursor-not-allowed"
 disabled
 aria-disabled="true"
 onClick={(e) => { e.preventDefault(); notifyTrialDisabled(); }}
 >
 <Lock size={16} className="mr-1" />
 Teste grátis em breve
 </Button>
 ) : (
 <Link to="/signup/escolher-plano" onClick={() => { onSignupClick?.(); onOpenChange(false); }}>
 <Button variant="hero" size="lg" className="group rounded-full text-sm sm:text-base px-8 sm:px-10 h-10 sm:h-11">
 Testar grátis por 7 dias
 <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
 </Button>
 </Link>
 )}
 </div>
 </DialogContent>
 </Dialog>
 );
};
