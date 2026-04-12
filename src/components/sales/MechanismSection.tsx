import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { motion } from "framer-motion";
import { Search, Brain, MessageSquare, Send, Bot, RefreshCw, CalendarCheck, LayoutGrid } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const steps = [
  { icon: Search, title: "Captação", desc: "Encontra empresas prontas para comprar" },
  { icon: Brain, title: "Diagnóstico IA", desc: "Identifica quem realmente vale a pena" },
  { icon: MessageSquare, title: "Mensagem", desc: "Cria abordagem personalizada automaticamente" },
  { icon: Send, title: "Envio", desc: "Dispara mensagens no momento ideal" },
  { icon: Bot, title: "IA responde", desc: "Conversa, qualifica e conduz o lead" },
  { icon: RefreshCw, title: "Follow-up", desc: "Recupera leads que iriam esfriar" },
  { icon: CalendarCheck, title: "Conversão", desc: "Gera reuniões e oportunidades reais" },
  { icon: LayoutGrid, title: "CRM", desc: "Organiza tudo sem esforço manual" },
];

// Organic vertical offsets to break rigidity
const yOffsets = [0, -18, 6, -12, 8, -16, 4, -8];

export const MechanismSection = () => {
  const { ref, isVisible } = useScrollAnimation();
  const pathRef = useRef<SVGPathElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pathD, setPathD] = useState("");
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Build a smooth curve connecting all nodes
  useEffect(() => {
    if (!isVisible || !containerRef.current) return;

    const updatePath = () => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const points: { x: number; y: number }[] = [];

      nodeRefs.current.forEach((node) => {
        if (!node) return;
        const nr = node.getBoundingClientRect();
        points.push({
          x: nr.left - rect.left + nr.width / 2,
          y: nr.top - rect.top + nr.height / 2,
        });
      });

      if (points.length < 2) return;

      let d = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const cpx = (prev.x + curr.x) / 2;
        d += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
      }
      setPathD(d);
    };

    // small delay to let layout settle
    const t = setTimeout(updatePath, 200);
    window.addEventListener("resize", updatePath);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", updatePath);
    };
  }, [isVisible]);

  return (
    <section ref={ref as React.RefObject<HTMLElement>} className="py-12 sm:py-20 w-full relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-primary/4 rounded-full blur-[160px]" />

      <div className="container mx-auto px-4 max-w-7xl relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase bg-primary/10 text-primary mb-4">
            Como funciona
          </span>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
            O sistema por trás das{" "}
            <span className="text-shimmer-highlight">vendas em escala</span>
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Um fluxo contínuo que transforma leads em clientes, sem depender de operação manual.
          </p>
        </motion.div>

        {/* ── FLOW ── */}
        <div ref={containerRef} className="relative hidden md:block" style={{ minHeight: 260 }}>
          {/* SVG connector curve */}
          {pathD && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" style={{ overflow: "visible" }}>
              {/* Static faint line */}
              <path d={pathD} fill="none" stroke="hsl(var(--primary) / 0.12)" strokeWidth="2" />
              {/* Animated travelling dot */}
              <circle r="4" fill="hsl(var(--primary))" opacity="0.6">
                <animateMotion dur="6s" repeatCount="indefinite" path={pathD} />
              </circle>
            </svg>
          )}

          {/* Nodes row */}
          <div className="flex items-start justify-between relative z-10 px-2">
            {/* Input badge */}
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={isVisible ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="flex-shrink-0 self-center"
              style={{ marginTop: yOffsets[0] }}
              ref={(el) => { nodeRefs.current[0] = el; }}
            >
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-primary/25 bg-primary/5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-50" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
                <span className="text-[11px] font-medium text-primary whitespace-nowrap">Leads entrando continuamente</span>
              </div>
            </motion.div>

            {/* Step nodes */}
            {steps.map((step, i) => (
              <motion.div
                key={i}
                ref={(el) => { nodeRefs.current[i + 1] = el; }}
                initial={{ opacity: 0, y: 20 }}
                animate={isVisible ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.45, delay: 0.3 + i * 0.09 }}
                className="flex-shrink-0 flex flex-col items-center text-center group cursor-default"
                style={{ marginTop: 60 + yOffsets[i], width: 110 }}
              >
                <div className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center mb-2.5 group-hover:border-primary/40 group-hover:shadow-[0_0_16px_-4px_hsl(var(--primary)/0.2)] group-hover:scale-110 transition-all duration-300">
                  <step.icon size={17} className="text-primary" />
                </div>
                <span className="text-[10px] font-bold tracking-[0.12em] text-primary/40 mb-0.5">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="text-xs font-semibold text-foreground mb-0.5 leading-tight">{step.title}</h3>
                <p className="text-[10px] text-muted-foreground leading-snug max-w-[100px]">{step.desc}</p>
              </motion.div>
            ))}

            {/* Output badge */}
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={isVisible ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.5, delay: 1.2 }}
              className="flex-shrink-0 self-center"
              style={{ marginTop: yOffsets[7] }}
              ref={(el) => { nodeRefs.current[9] = el; }}
            >
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-primary/25 bg-primary/10">
                <CalendarCheck size={13} className="text-primary" />
                <span className="text-[11px] font-medium text-primary whitespace-nowrap">Clientes gerados</span>
              </div>
            </motion.div>
          </div>
        </div>

        {/* ── MOBILE: vertical flow ── */}
        <div className="md:hidden flex flex-col items-center gap-1">
          {/* Input */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={isVisible ? { opacity: 1 } : {}}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-primary/25 bg-primary/5 mb-2"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-50" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            <span className="text-[11px] font-medium text-primary">Leads entrando continuamente</span>
          </motion.div>

          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -12 }}
              animate={isVisible ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.35, delay: 0.3 + i * 0.08 }}
              className="flex items-center gap-3 w-full max-w-xs"
            >
              {/* Vertical line + dot */}
              <div className="flex flex-col items-center w-5 flex-shrink-0">
                <div className="w-px h-4 bg-border" />
                <div className="w-2.5 h-2.5 rounded-full border-2 border-primary bg-card" />
                <div className="w-px h-4 bg-border" />
              </div>
              {/* Content */}
              <div className="flex items-center gap-2.5 py-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <step.icon size={14} className="text-primary" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-foreground leading-tight">{step.title}</h3>
                  <p className="text-[10px] text-muted-foreground">{step.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}

          {/* Output */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={isVisible ? { opacity: 1 } : {}}
            transition={{ delay: 1.1 }}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-primary/25 bg-primary/10 mt-2"
          >
            <CalendarCheck size={13} className="text-primary" />
            <span className="text-[11px] font-medium text-primary">Clientes gerados + pipeline organizado</span>
          </motion.div>
        </div>

        {/* Bottom statement */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 1.5 }}
          className="text-center text-sm text-muted-foreground mt-12 max-w-md mx-auto"
        >
          Tudo isso acontece continuamente, sem depender de operação manual.
        </motion.p>
      </div>
    </section>
  );
};
