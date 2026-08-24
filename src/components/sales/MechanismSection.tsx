import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { motion } from "framer-motion";
import { Search, ScanSearch, Brain, Sparkles, Send, Bot, RefreshCw, CalendarCheck, CalendarDays, Headset, LayoutGrid } from "lucide-react";
import { useRef } from "react";
import { useInView } from "framer-motion";
import { SectionHeading } from "@/components/landing/SectionHeading";

const steps = [
 { icon: Search, title: "Capte", desc: "Encontre novas oportunidades sem fazer tudo manualmente: a plataforma busca empresas, analisa e mostra quais têm mais potencial de virar reunião." },
 { icon: Bot, title: "Converta", desc: "Transforme oportunidades em conversas e reuniões, com abordagem personalizada, atendimento e follow-up conduzidos pela IA no WhatsApp oficial." },
 { icon: LayoutGrid, title: "Gerencie", desc: "Controle toda a operação comercial em um só lugar, com cada conversa, oportunidade e venda registrada automaticamente no CRM." },
 { icon: Sparkles, title: "Otimize", desc: "Saiba quais oportunidades merecem atenção agora e reduza o trabalho manual do time com automação e inteligência em cada etapa." },

];

const floatingElements = [
 { top: "12%", left: "3%", label: "327 leads hoje", delay: 0.8 },
 { top: "28%", right: "2%", label: "Score: 87/100", delay: 1.2 },
 { top: "48%", left: "1%", label: "18 respostas/h", delay: 1.6 },
 { top: "65%", right: "4%", label: "Conversão 12%", delay: 2.0 },
 { top: "82%", left: "4%", label: "ROI 4.2x", delay: 2.4 },
];

function StepCard({ step, index, isLeft }: { step: typeof steps[0]; index: number; isLeft: boolean }) {
 const cardRef = useRef<HTMLDivElement>(null);
 const inView = useInView(cardRef, { once: true, amount: 0.2 });
 const Icon = step.icon;

 return (
 <motion.div
 ref={cardRef}
 initial={{ opacity: 0, x: isLeft ? -40 : 40, y: 10 }}
 animate={inView ? { opacity: 1, x: 0, y: 0 } : {}}
 transition={{ duration: 0.55, delay: 0.1, ease: "easeOut" }}
 className="relative flex items-center"
 >
 {/* Center node - desktop only */}
 <div className="absolute left-1/2 -translate-x-1/2 z-20 hidden md:block">
 <motion.div
 initial={{ scale: 0 }}
 animate={inView ? { scale: 1 } : {}}
 transition={{ duration: 0.3, delay: 0.2 }}
 className="w-4 h-4 rounded-full border-2 border-primary bg-card shadow-[0_0_8px_hsl(var(--primary)/0.25)]"
 />
 </div>

 {/* Mobile step number dot */}
 <div className="absolute left-0 top-1/2 -translate-y-1/2 z-20 md:hidden">
 <motion.div
 initial={{ scale: 0 }}
 animate={inView ? { scale: 1 } : {}}
 transition={{ duration: 0.3, delay: 0.2 }}
 className="w-8 h-8 rounded-full border-2 border-primary bg-card shadow-[0_0_8px_hsl(var(--primary)/0.25)] flex items-center justify-center"
 >
 <span className="text-[10px] font-bold text-primary">{String(index + 1).padStart(2, "0")}</span>
 </motion.div>
 </div>

 {/* Card */}
 <div className={`w-full pl-12 md:pl-0 md:w-[calc(50%-28px)] ${isLeft ? "md:mr-auto" : "md:ml-auto"}`}>
 <div
 className="group relative rounded-card border border-border/70 p-5 sm:p-6 overflow-hidden cursor-default text-left"
 style={{
 background: isLeft
 ? "linear-gradient(225deg, hsl(var(--primary) / 0.06) 0%, hsl(var(--card)) 55%, hsl(var(--card)) 100%)"
 : "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--card)) 45%, hsl(var(--primary) / 0.06) 100%)",
 }}
 >


 {/* Content */}
 <div className="relative z-10 flex items-center gap-4 text-left">
 <div className="flex-shrink-0">
 <span className="text-[9px] font-bold tracking-[0.14em] text-primary/35 block leading-none mb-1.5 hidden md:block">
 {String(index + 1).padStart(2, "0")}
 </span>
 <div className="relative">
 <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full bg-primary/8 pointer-events-none" />
 <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-hover bg-gradient-to-br from-primary to-primary/80 shadow-[0_8px_20px_-4px_hsl(var(--primary)/0.5)] flex items-center justify-center">
 <Icon size={28} className="text-primary-foreground" strokeWidth={1.9} />
 </div>
 </div>
 </div>
 <div className="flex-1 min-w-0">
 <h3 className="text-lg sm:text-xl font-bold text-foreground leading-tight mb-1.5">{step.title}</h3>
 <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
 </div>
 </div>
 </div>
 </div>
 </motion.div>
 );
}

export const MechanismSection = () => {
 const { ref, isVisible } = useScrollAnimation();
 const { ref: liveRef, isVisible: isInViewport } = useScrollAnimation({ threshold: 0, rootMargin: '100px 0px', triggerOnce: false });

 return (
 <section ref={(node) => { (ref as any).current = node; (liveRef as any).current = node; }} className="py-12 sm:py-20 w-full relative overflow-hidden">
 {/* Background ambient */}
 <div className="absolute inset-0 pointer-events-none overflow-hidden">
 <div className="absolute top-[10%] -left-[5%] w-[350px] h-[350px] bg-primary/[0.04] rounded-full soft-glow" />
 <div className="absolute top-[50%] -right-[8%] w-[400px] h-[400px] bg-primary/[0.03] rounded-full soft-glow" />
 <div className="absolute bottom-[10%] left-[10%] w-[300px] h-[300px] bg-primary/[0.03] rounded-full soft-glow" />

 {/* Floating stat cards */}
 {floatingElements.map((el, i) => (
 <motion.div
 key={i}
 initial={{ opacity: 0, y: 20 }}
 animate={isVisible ? { opacity: 0.7, y: 0 } : {}}
 transition={{ duration: 0.8, delay: el.delay }}
 className="hidden lg:flex absolute items-center gap-2 px-3 py-1.5 rounded-sm border border-border/40 bg-card/80"
 style={{
 top: el.top,
 left: (el as any).left,
 right: (el as any).right,
 animation: isVisible ? `float-gentle ${3 + i * 0.5}s ease-in-out infinite` : undefined,
 animationPlayState: isInViewport ? 'running' : 'paused',
 }}
 >
 <div className="w-1.5 h-1.5 rounded-full bg-primary/50" />
 <span className="text-[10px] text-muted-foreground/50 font-medium whitespace-nowrap">{el.label}</span>
 </motion.div>
 ))}
 </div>

 <div className="container mx-auto px-4 max-w-6xl relative z-10">
 {/* Header */}
 <SectionHeading
 eyebrow="Por que é diferente"
 title="A Wiize centraliza e automatiza"
 highlight="sua operação comercial com IA"
 highlightFit="tight"
 description="Uma única plataforma de vendas B2B para captar, converter, gerenciar e otimizar, com IA e automação em cada etapa."
 isVisible={isVisible}
 />


 {/* Timeline */}
 <div className="relative">
 {/* Central line — desktop only */}
 <div className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-px overflow-visible hidden md:block">
 <motion.div
 initial={{ scaleY: 0 }}
 animate={isVisible ? { scaleY: 1 } : {}}
 transition={{ duration: 2.5, delay: 0.3, ease: "easeOut" }}
 className="w-full h-full origin-top bg-gradient-to-b from-primary/40 via-primary/20 to-primary/40"
 />
 {isVisible && isInViewport && (
 <motion.div
 initial={{ top: "0%" }}
 animate={{ top: ["0%", "100%"] }}
 transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
 className="absolute left-1/2 -translate-x-1/2 w-1.5 h-12 rounded-full bg-gradient-to-b from-primary/0 via-primary/40 to-primary/0"
 />
 )}
 </div>

 {/* Mobile vertical line — fade nas pontas + dot animado */}
 <div className="absolute left-[15px] top-12 bottom-12 w-px overflow-visible md:hidden">
 <motion.div
 initial={{ scaleY: 0 }}
 animate={isVisible ? { scaleY: 1 } : {}}
 transition={{ duration: 2, delay: 0.3, ease: "easeOut" }}
 className="w-full h-full origin-top"
 style={{
 background:
 "linear-gradient(to bottom, transparent 0%, hsl(var(--primary)/0.35) 12%, hsl(var(--primary)/0.2) 50%, hsl(var(--primary)/0.35) 88%, transparent 100%)",
 }}
 />
 {isVisible && isInViewport && (
 <motion.div
 initial={{ top: "0%" }}
 animate={{ top: ["0%", "100%"] }}
 transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
 className="absolute left-1/2 -translate-x-1/2 w-1 h-10 rounded-full bg-gradient-to-b from-primary/0 via-primary/50 to-primary/0"
 />
 )}
 </div>

 {/* Input badge */}
 <motion.div
 initial={{ opacity: 0, scale: 0.9 }}
 animate={isVisible ? { opacity: 1, scale: 1 } : {}}
 transition={{ duration: 0.5, delay: 0.2 }}
 className="flex justify-center mb-10 relative z-10"
 >
 <div className="flex items-center gap-2.5 px-4 py-2 rounded-hover border border-primary/25 bg-card shadow-sm">
 <span className="relative flex h-2 w-2">
 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-50" />
 <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
 </span>
 <span className="text-xs font-medium text-primary">Seu perfil de cliente ideal</span>
 </div>
 </motion.div>

 {/* Steps */}
 <div className="flex flex-col gap-6 sm:gap-8 md:gap-10">
 {steps.map((step, i) => (
 <StepCard key={i} step={step} index={i} isLeft={i % 2 === 0} />
 ))}
 </div>

 {/* Output badge */}
 <motion.div
 initial={{ opacity: 0, scale: 0.9 }}
 animate={isVisible ? { opacity: 1, scale: 1 } : {}}
 transition={{ duration: 0.5, delay: 1.6 }}
 className="flex justify-center mt-10 relative z-10"
 >
 <div className="flex items-center gap-2.5 px-4 py-2 rounded-hover border border-primary/25 bg-primary/10 shadow-sm">
 <CalendarCheck size={14} className="text-primary" />
 <span className="text-xs font-medium text-primary">Reuniões marcadas e pipeline abastecido</span>
 </div>
 </motion.div>
 </div>

 {/* Bottom statement */}
 <motion.p
 initial={{ opacity: 0, y: 10 }}
 animate={isVisible ? { opacity: 1, y: 0 } : {}}
 transition={{ duration: 0.5, delay: 1.8 }}
 className="text-center text-sm text-muted-foreground mt-10 max-w-md mx-auto"
 >
 Todo dia, sem alguém precisar lembrar de fazer.
 </motion.p>
 </div>

 {/* Floating animation keyframes */}
 <style>{`
 @keyframes float-gentle {
 0%, 100% { transform: translateY(0px); }
 50% { transform: translateY(-8px); }
 }
 `}</style>
 </section>
 );
};
