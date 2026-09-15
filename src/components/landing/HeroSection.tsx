import { lazy, Suspense, useEffect, useRef, useState } from "react";
import metaIcon from "@/assets/logos/meta-icon.png";
import gptIcon from "@/assets/logos/gpt-icon.png";
// O modal de vídeo (e o YouTube) só é baixado quando o visitante abre o vídeo.
const VideoModal = lazy(() => import("./VideoModal").then((m) => ({ default: m.VideoModal })));
import avatar1 from "@/assets/avatars/avatar1.jpg";
import avatar2 from "@/assets/avatars/avatar2.jpg";
import avatar3 from "@/assets/avatars/avatar3.jpg";
import avatar4 from "@/assets/avatars/avatar4.jpg";
import { Button } from "@/components/ui/button";
import { 
 ArrowRight, ArrowDown, Search, Zap, TrendingUp, MessageCircle, Users, Send, Check, 
 ChevronDown, Bot, Star, CalendarCheck, LayoutGrid, Sparkles, Clock,
 BadgeCheck, Brain, MousePointer2, Plus, MapPin, Lock, Play, Rocket
} from "lucide-react";
import { Link } from "react-router-dom";
import { TRIAL_DISABLED, notifyTrialDisabled } from "@/lib/trialStatus";
import { trackDemoClick, trackFreeTrialClick } from "@/lib/analytics";

/* ─── Animated counter ─── */
const AnimatedCounter = ({ value, duration = 2000 }: { value: string; duration?: number }) => {
 const [displayValue, setDisplayValue] = useState("0");
 const ref = useRef<HTMLSpanElement>(null);
 const hasAnimated = useRef(false);

 useEffect(() => {
 const el = ref.current;
 if (!el) return;
 const obs = new IntersectionObserver(([e]) => {
 if (e.isIntersecting && !hasAnimated.current) {
 hasAnimated.current = true;
 const isPercentage = value.includes('%');
 const isPlus = value.startsWith('+');
 const hasK = value.includes('K');
 const hasM = value.includes('M');
 let numericValue = parseFloat(value.replace(/[^0-9.]/g, ''));
 const startTime = performance.now();
 const animate = (t: number) => {
 const p = Math.min((t - startTime) / duration, 1);
 const ease = 1 - Math.pow(1 - p, 4);
 const cur = numericValue * ease;
 let f: string;
 if (hasM) f = cur.toFixed(1) + 'M+';
 else if (hasK) f = Math.floor(cur) + 'K+';
 else if (isPercentage) f = (isPlus ? '+' : '') + Math.floor(cur) + '%';
 else f = (isPlus ? '+' : '') + Math.floor(cur).toString();
 setDisplayValue(f);
 if (p < 1) requestAnimationFrame(animate); else setDisplayValue(value);
 };
 requestAnimationFrame(animate);
 }
 }, { threshold: 0.5 });
 obs.observe(el);
 return () => obs.disconnect();
 }, [value, duration]);

 return <span ref={ref}>{displayValue}</span>;
};

import { stages, stageRenderers, STAGE_DURATION, STAGE_CONTENT_HEIGHT } from "./heroStages";


/* ─── Floating cards ─── */
const floatingCards = [
 { icon: Send, value: "900K+", label: "Mensagens enviadas", position: "-left-[10.5rem] top-4", delay: "0.8s" },
 { icon: Users, value: "50K+", label: "Empresas prospectadas", position: "left-1/3 -top-8", delay: "1.2s" },
 { icon: TrendingUp, value: "63%", label: "Taxa de resposta", position: "-left-[7.5rem] bottom-[5.5rem]", delay: "1.6s" },
 { icon: Zap, value: "+40%", label: "Conversão vs tradicional", position: "-right-10 -bottom-10", delay: "2s" },
];

/* ─── Main component ─── */
interface HeroSectionProps {
 onSignupClick?: () => void;
 titleLine1?: string;
 titleLine2?: string;
 titleHighlight?: string;
 description?: string;
 descriptionClassName?: string;
}

export const HeroSection = ({
  onSignupClick,
   titleLine1 = "Tudo para vender B2B",
   titleLine2 = "",
   titleHighlight = "Em um só lugar",
   description = "Plataforma de inteligência comercial que entende empresas, conversas e histórico de vendas para mostrar ao seu time quais oportunidades priorizar e qual o próximo passo.",
  descriptionClassName,
}: HeroSectionProps) => {
 // scrollY removido — parallax do Hero desligado por performance.
 const [currentStage, setCurrentStage] = useState(0);
 const [stageProgress, setStageProgress] = useState(0);
 const [isAnimating, setIsAnimating] = useState(false);
 const [jumpTarget, setJumpTarget] = useState<number | null>(null);
  const [videoOpen, setVideoOpen] = useState(false);
 const sectionRef = useRef<HTMLElement>(null);
 const demoRef = useRef<HTMLDivElement>(null);
 const animationStartRef = useRef<number>(0);
 const pausedElapsedRef = useRef<number>(0);

 // Parallax removido: cada scroll forçava re-render do Hero inteiro + recomposição
 // de 4 camadas grandes (gradient base, textura de dots, glow, demo card).
 // Ganho de performance > efeito visual sutil de parallax.

 useEffect(() => {
 // Só anima o demo em telas xl+ (onde ele é visível — hidden xl:flex).
 // Também respeita prefers-reduced-motion. Isso remove o RAF em tablets/mobile,
 // onde o componente é montado mas invisível.
 if (typeof window !== "undefined") {
 const isBelowXl = window.matchMedia("(max-width: 1279px)").matches;
 const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
 if (isBelowXl || reducedMotion) {
 setCurrentStage(4);
 setStageProgress(0.5);
 return;
 }
 }
 const obs = new IntersectionObserver(([e]) => setIsAnimating(e.isIntersecting), { threshold: 0.2 });
 if (demoRef.current) obs.observe(demoRef.current);
 return () => obs.disconnect();
 }, []);

 const handleStageClick = (index: number) => {
 setJumpTarget(index);
 };

 // Handle manual jump
 useEffect(() => {
 if (jumpTarget !== null) {
 pausedElapsedRef.current = jumpTarget * STAGE_DURATION;
 animationStartRef.current = performance.now() - pausedElapsedRef.current;
 setCurrentStage(jumpTarget);
 setStageProgress(0);
 setJumpTarget(null);
 }
 }, [jumpTarget]);

 useEffect(() => {
 if (!isAnimating) return;

 const totalDuration = STAGE_DURATION * stages.length;
 // Resume from where we paused (keeps position stable when out of view).
 animationStartRef.current = performance.now() - pausedElapsedRef.current;
 let frameId = 0;

 const update = (now: number) => {
 const elapsed = now - animationStartRef.current;
 const cycleElapsed = ((elapsed % totalDuration) + totalDuration) % totalDuration;
 pausedElapsedRef.current = cycleElapsed;
 const nextStage = Math.floor(cycleElapsed / STAGE_DURATION);
 const nextProgress = (cycleElapsed % STAGE_DURATION) / STAGE_DURATION;

 setCurrentStage((prev) => (prev === nextStage ? prev : nextStage));
 setStageProgress(nextProgress);
 frameId = requestAnimationFrame(update);
 };

 frameId = requestAnimationFrame(update);
 return () => cancelAnimationFrame(frameId);
 }, [isAnimating]);

 const CurrentStageRenderer = stageRenderers[currentStage];
 const stage = stages[currentStage];

 return (
 <section ref={sectionRef} className="relative -mt-[72px] sm:-mt-[80px] min-h-[85vh] flex items-center justify-center pt-[104px] sm:pt-[120px] pb-16 sm:pb-20 overflow-x-clip overflow-y-visible w-full">
 {/* Base gradient backdrop (estático — sem parallax) */}
 <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, hsl(158 35% 97.5%) 0%, hsl(210 30% 99%) 60%, hsl(var(--background)) 100%)" }} />
 {/* Dotted texture (estático) */}
 <div className="absolute inset-0 pointer-events-none opacity-[0.14]" style={{ backgroundImage: `radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)`, backgroundSize: '18px 18px' }} />
 {/* Soft primary glow (estático, reduzido) */}
 <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[900px] pointer-events-none" style={{ transform: 'translate(-50%, 0)', background: "radial-gradient(ellipse at center, hsl(158 60% 55% / 0.06) 0%, hsl(158 60% 55% / 0.02) 45%, transparent 70%)" }} />
 {/* Bottom-left accent blob (único blob decorativo restante) */}
 <div className="absolute -bottom-40 -left-32 w-[600px] h-[600px] rounded-full pointer-events-none opacity-40" style={{ background: "radial-gradient(circle, hsl(158 60% 55% / 0.04) 0%, transparent 65%)" }} />


 <div className="container mx-auto px-6 sm:px-10 lg:px-16 relative z-10 max-w-[90rem] w-full">
 <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_1fr] gap-2 xl:gap-4 items-center">

 {/* LEFT */}
 <div className="text-center xl:text-left">
 <div className="inline-flex items-center gap-1.5 sm:gap-2.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-hover glass mb-6 sm:mb-8 animate-fade-in border border-primary/10">
 <div className="flex -space-x-1 sm:-space-x-1.5">
 <img src={avatar1} alt="" className="w-4 h-4 sm:w-7 sm:h-7 rounded-full border border-background sm:border-2 object-cover" width={28} height={28} />
 <img src={avatar2} alt="" className="w-4 h-4 sm:w-7 sm:h-7 rounded-full border border-background sm:border-2 object-cover" width={28} height={28} />
 <img src={avatar3} alt="" className="w-4 h-4 sm:w-7 sm:h-7 rounded-full border border-background sm:border-2 object-cover" width={28} height={28} />
 <img src={avatar4} alt="" className="w-4 h-4 sm:w-7 sm:h-7 rounded-full border border-background sm:border-2 object-cover" width={28} height={28} />
 
 </div>
 <span className="text-[10px] sm:text-xs font-medium text-foreground tracking-tight">+500 Empresas já utilizam a Wiize</span>
 </div>
  <h1 className="font-display font-bold mb-4 sm:mb-6 animate-slide-up text-foreground leading-[1.08] tracking-tight" style={{ animationDelay: "0.1s" }}>
  <span className="block whitespace-normal sm:whitespace-nowrap text-[2rem] sm:text-[2.3rem] md:text-[2.9rem] lg:text-[3.25rem] xl:text-[3.6rem]">{titleLine1}</span>
  {titleLine2 ? (
  <span className="block whitespace-normal sm:whitespace-nowrap text-[2rem] sm:text-[2.3rem] md:text-[2.9rem] lg:text-[3.25rem] xl:text-[3.6rem]">{titleLine2}</span>
  ) : null}
  {titleHighlight?.trim() ? (
  <span className="block whitespace-normal sm:whitespace-nowrap text-shimmer-highlight font-extrabold text-[2.05rem] sm:text-[2.85rem] md:text-[3.5rem] lg:text-[3.95rem] xl:text-[4.3rem] leading-[1.08] sm:leading-[1.05] mt-1 sm:mt-2 drop-shadow-sm">{titleHighlight}</span>
  ) : null}

  </h1>
  <p className={`${descriptionClassName ?? "text-sm sm:text-lg md:text-xl"} text-muted-foreground mb-6 sm:mb-8 max-w-xl mx-auto xl:mx-0 animate-slide-up`} style={{ animationDelay: "0.2s" }}>
  {description}
  </p>
  <div className="flex flex-row flex-nowrap items-center justify-center xl:justify-start gap-2 sm:gap-4 mb-8 animate-slide-up" style={{ animationDelay: "0.3s" }}>
  {TRIAL_DISABLED ? (
  <Button
  variant="hero"
  size="lg"
  className="group rounded-full text-xs sm:text-sm px-3 sm:px-6 h-10 sm:h-11 shrink-0 opacity-60 cursor-not-allowed"
  disabled
  aria-disabled="true"
  onClick={(e) => { e.preventDefault(); notifyTrialDisabled(); }}
  >
  <Lock size={14} className="mr-1" />
  Teste grátis em breve
  </Button>
  ) : (
   <Link to="/signup/escolher-plano" className="shrink-0" onClick={() => { trackFreeTrialClick("hero"); onSignupClick?.(); }}>
   <Button variant="hero" size="lg" className="group rounded-full text-xs sm:text-sm px-3 sm:px-6 h-10 sm:h-11">
   Iniciar Teste Grátis
   <ArrowRight size={13} className="ml-1 sm:ml-1.5 group-hover:translate-x-0.5 transition-transform" />
   </Button>
   </Link>
  )}
  <Link to="/tour-guiado" className="group shrink-0">
  <Button
  variant="ghost"
  size="lg"
  className="demo-shine rounded-full text-xs sm:text-sm px-3 sm:px-6 h-10 sm:h-11 border border-border/60 bg-transparent hover:bg-muted/60 hover:border-foreground/20 hover:-translate-y-1 hover:shadow-[0_10px_30px_-10px_hsl(220_15%_20%/0.15)] transition-all duration-300"
  >
  Ver Demonstração
  </Button>
  </Link>
  </div>
 </div>

 {/* RIGHT: 8-stage demo (sem parallax — scroll passa liso) */}
 <div className="animate-slide-up w-full hidden xl:flex xl:justify-end" style={{ animationDelay: "0.5s" }}>
 <div className="relative w-full max-w-[28rem] 2xl:max-w-[30rem]">
 <div className="absolute -inset-4 bg-primary/8 soft-glow rounded-3xl" />

 {/* Floating cards */}
 {floatingCards.map((card, i) => (
 <div key={i} className={`absolute ${card.position} z-30 floating-card hidden lg:block`} style={{ animationDelay: card.delay }}>
 <div className="glass rounded-lg p-3 shadow-lg shadow-primary/10 border border-border/50 hover:border-primary/20 transition-all hover:scale-105">
 <div className="flex items-center gap-2">
 <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center"><card.icon size={14} className="text-primary" /></div>
 <div><p className="text-sm font-bold text-foreground"><AnimatedCounter value={card.value} duration={2000} /></p><p className="text-[11px] text-muted-foreground whitespace-nowrap">{card.label}</p></div>
 </div>
 </div>
 </div>
 ))}

 <div ref={demoRef} className={`relative glass rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-card hover:shadow-glow transition-shadow duration-500 ${isAnimating ? 'demo-animating' : 'demo-paused'}`}>
 {/* Window controls */}
 <div className="flex items-center justify-between mb-3">
 <div className="flex items-center gap-2">
 <div className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
 <div className="w-2.5 h-2.5 rounded-full bg-warning/60" />
 <div className="w-2.5 h-2.5 rounded-full bg-success/60" />
 </div>
 <span className="text-[11px] text-muted-foreground font-medium tracking-wide uppercase">Wiize Platform</span>
 </div>

 <div className="bg-background/50 rounded-lg sm:rounded-xl p-3 sm:p-4">
 {/* Stage indicator bar — clickable */}
 <div className="flex items-center gap-1 mb-3">
 {stages.map((s, i) => (
 <button
 key={i}
 className="flex-1 h-1.5 rounded-full overflow-hidden bg-secondary/60 cursor-pointer hover:bg-secondary/80 transition-colors"
 onClick={() => handleStageClick(i)}
 title={s.label}
 >
 <div
 className={`h-full rounded-full transition-[width] duration-150 ${i <= currentStage ? 'bg-primary' : 'bg-transparent'}`}
 style={{ width: i < currentStage ? '100%' : i === currentStage ? `${stageProgress * 100}%` : '0%' }}
 />
 </button>
 ))}
 </div>

 {/* Stage label */}
 <div className="flex items-center gap-2 mb-3 px-1">
 <stage.icon size={13} className={stage.color} />
 <span className={`text-[12px] font-semibold ${stage.color}`}>{stage.label}</span>
 <span className="text-[11px] text-muted-foreground ml-auto">{currentStage + 1}/7</span>
 </div>

 {/* Stage content - fixed height */}
 <div className="overflow-hidden" key={currentStage} style={{ height: STAGE_CONTENT_HEIGHT, animation: 'fadeSlideUp 0.4s ease-out' }}>
 <CurrentStageRenderer progress={stageProgress} />
 </div>
 </div>
 {/* Watermark */}
 <div className="absolute bottom-2 left-4 text-[10px] text-muted-foreground/40 font-medium tracking-wide">@wiizebrasil</div>
 </div>
 </div>
 </div>
 </div>
 </div>

 <a href="#features" className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 animate-bounce hover:opacity-100 transition-opacity">
 <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
 <ArrowDown size={18} className="text-primary-foreground" />
 </div>
 </a>

      {videoOpen && (
        <Suspense fallback={null}>
          <VideoModal
            open={videoOpen}
            onOpenChange={setVideoOpen}
            onSignupClick={onSignupClick}
          />
        </Suspense>
      )}

 {/* Keyframe animations */}
 <style>{`
 @keyframes fadeSlideUp {
 from { opacity: 0; transform: translateY(8px); }
 to { opacity: 1; transform: translateY(0); }
 }
 @keyframes scaleIn {
 from { opacity: 0; transform: scale(0.8); }
 to { opacity: 1; transform: scale(1); }
 }
 `}</style>
 </section>
 );
};
