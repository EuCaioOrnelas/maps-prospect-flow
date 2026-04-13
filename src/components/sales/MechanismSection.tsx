import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { motion } from "framer-motion";
import { Search, Brain, MessageSquare, Send, Bot, RefreshCw, CalendarCheck, LayoutGrid } from "lucide-react";
import { useRef } from "react";
import { useInView } from "framer-motion";

const steps = [
  { icon: Search, title: "Captação", desc: "Encontra empresas prontas para comprar", micro: "Prospecção contínua" },
  { icon: Brain, title: "Diagnóstico IA", desc: "Identifica quem realmente vale a pena", micro: "Score calculado por IA" },
  { icon: MessageSquare, title: "Mensagem", desc: "Cria abordagem personalizada automaticamente", micro: "Copy única por lead" },
  { icon: Send, title: "Envio", desc: "Dispara mensagens no momento ideal", micro: "Via WhatsApp oficial" },
  { icon: Bot, title: "IA responde", desc: "Conversa, qualifica e conduz o lead", micro: "Atendimento 24/7" },
  { icon: RefreshCw, title: "Follow-up", desc: "Recupera leads que iriam esfriar", micro: "Reengajamento automático" },
  { icon: CalendarCheck, title: "Conversão", desc: "Gera reuniões e oportunidades reais", micro: "Pipeline alimentado" },
  { icon: LayoutGrid, title: "CRM", desc: "Organiza tudo sem esforço manual", micro: "Histórico centralizado" },
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
  const inView = useInView(cardRef, { once: true, margin: "0px 0px -15% 0px" });
  const Icon = step.icon;

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, x: isLeft ? -40 : 40, y: 10 }}
      animate={inView ? { opacity: 1, x: 0, y: 0 } : {}}
      transition={{ duration: 0.55, delay: 0.1, ease: "easeOut" }}
      className="relative flex items-center"
    >
      {/* Center node */}
      <div className="absolute left-1/2 -translate-x-1/2 z-20">
        <motion.div
          initial={{ scale: 0 }}
          animate={inView ? { scale: 1 } : {}}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="w-4 h-4 rounded-full border-2 border-primary bg-card shadow-[0_0_8px_hsl(var(--primary)/0.25)]"
        />
      </div>

      {/* Card */}
      <div className={`w-[calc(50%-28px)] ${isLeft ? "mr-auto" : "ml-auto"}`}>
        <div
          className={`group relative rounded-2xl border border-border/70 bg-card/80 backdrop-blur-sm p-5 overflow-hidden hover:shadow-[0_4px_24px_-6px_hsl(var(--primary)/0.15)] hover:border-primary/30 transition-all duration-300 cursor-default ${
            isLeft ? "text-right" : "text-left"
          }`}
        >
          {/* Glow */}
          <div className="absolute -bottom-14 -right-14 w-40 h-40 rounded-full bg-primary/10 blur-[64px] pointer-events-none" />
          <div className="absolute -top-10 -left-10 w-28 h-28 rounded-full bg-primary/8 blur-[50px] pointer-events-none" />

          {/* Content */}
          <div className={`relative z-10 flex items-start gap-3 ${isLeft ? "flex-row-reverse text-right" : ""}`}>
            <div className="flex-shrink-0">
              <span className="text-[9px] font-bold tracking-[0.14em] text-primary/35 block leading-none mb-1">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="relative">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-primary/8 pointer-events-none" />
                <div className="relative w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                  <Icon size={18} className="text-primary" />
                </div>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-foreground leading-tight mb-1">{step.title}</h3>
              <p className="text-[13px] text-muted-foreground leading-relaxed">{step.desc}</p>
              <p className="text-[11px] text-muted-foreground/50 mt-1">{step.micro}</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export const MechanismSection = () => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.05, rootMargin: '0px 0px -10% 0px' });

  return (
    <section ref={ref as React.RefObject<HTMLElement>} className="py-12 sm:py-20 w-full relative overflow-hidden">
      {/* Background ambient — no harsh side lines */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[10%] -left-[5%] w-[350px] h-[350px] bg-primary/[0.04] rounded-full blur-[100px]" />
        <div className="absolute top-[50%] -right-[8%] w-[400px] h-[400px] bg-primary/[0.03] rounded-full blur-[120px]" />
        <div className="absolute bottom-[10%] left-[10%] w-[300px] h-[300px] bg-primary/[0.03] rounded-full blur-[100px]" />

        {/* Floating stat cards with animation */}
        {floatingElements.map((el, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={isVisible ? { opacity: 0.7, y: 0 } : {}}
            transition={{ duration: 0.8, delay: el.delay }}
            className="hidden lg:flex absolute items-center gap-2 px-3 py-1.5 rounded-lg border border-border/40 bg-card/30 backdrop-blur-sm"
            style={{
              top: el.top,
              left: (el as any).left,
              right: (el as any).right,
              animation: isVisible ? `float-gentle ${3 + i * 0.5}s ease-in-out infinite` : undefined,
            }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-primary/50" />
            <span className="text-[10px] text-muted-foreground/50 font-medium whitespace-nowrap">{el.label}</span>
          </motion.div>
        ))}
      </div>

      <div className="container mx-auto px-4 max-w-6xl relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase bg-primary/10 text-primary mb-4">
            Como funciona
          </span>
          <h2 className="font-display text-3xl sm:text-4xl md:text-[2.75rem] font-bold text-foreground mb-4 leading-tight">
            O sistema por trás das{" "}
            <br className="hidden sm:block" />
            <span className="text-shimmer-highlight">vendas em escala</span>
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto">
            Um fluxo contínuo que transforma leads em clientes, sem depender de operação manual.
          </p>
        </motion.div>

        {/* Timeline */}
        <div className="relative">
          {/* Central line — grows with scroll via CSS */}
          <div className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-px overflow-visible hidden md:block">
            <motion.div
              initial={{ scaleY: 0 }}
              animate={isVisible ? { scaleY: 1 } : {}}
              transition={{ duration: 2.5, delay: 0.3, ease: "easeOut" }}
              className="w-full h-full origin-top bg-gradient-to-b from-primary/40 via-primary/20 to-primary/40"
            />
            {isVisible && (
              <motion.div
                initial={{ top: "0%" }}
                animate={{ top: ["0%", "100%"] }}
                transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                className="absolute left-1/2 -translate-x-1/2 w-1.5 h-12 rounded-full bg-gradient-to-b from-primary/0 via-primary/40 to-primary/0"
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
            <div className="flex items-center gap-2.5 px-5 py-2.5 rounded-full border border-primary/25 bg-card shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-50" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              <span className="text-xs font-medium text-primary">Leads entrando continuamente</span>
            </div>
          </motion.div>

          {/* Steps — each triggers its own animation on scroll */}
          <div className="flex flex-col gap-8 sm:gap-10">
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
            <div className="flex items-center gap-2.5 px-5 py-2.5 rounded-full border border-primary/25 bg-primary/10 shadow-sm">
              <CalendarCheck size={14} className="text-primary" />
              <span className="text-xs font-medium text-primary">Clientes gerados + pipeline organizado</span>
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
          Tudo isso acontece continuamente, sem depender de operação manual.
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
