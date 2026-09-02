import { useEffect, useRef, useState } from "react";
import {
  motion,
  useInView,
  useScroll,
  useSpring,
  useTransform,
  useMotionValueEvent,
} from "framer-motion";
import { Search, Bot, LayoutGrid, Sparkles, CalendarCheck, CheckCircle2, MessageCircle, TrendingUp, Users, Target } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { SectionHeading } from "@/components/landing/SectionHeading";

const steps = [
  {
    icon: Search,
    title: "Capte",
    desc: "Encontre novas oportunidades sem fazer tudo manualmente: a plataforma busca empresas, analisa e mostra quais têm mais potencial de virar reunião.",
    bullets: [
      "Novas oportunidades sempre que a operação precisar",
      "Menos tempo pesquisando, mais tempo conversando",
      "Um pipeline que não depende da iniciativa de cada vendedor",
    ],
  },
  {
    icon: Bot,
    title: "Converta",
    desc: "Transforme oportunidades em conversas e reuniões, com abordagem personalizada, atendimento e follow-up conduzidos pela IA no WhatsApp oficial.",
    bullets: [
      "Abordagem personalizada para cada empresa",
      "Atendimento e follow-up sem depender de horário",
      "Reuniões agendadas direto na sua agenda",
    ],
  },
  {
    icon: LayoutGrid,
    title: "Gerencie",
    desc: "Controle toda a operação comercial em um só lugar, com cada conversa, oportunidade e venda registrada automaticamente no CRM.",
    bullets: [
      "Histórico completo de cada negociação",
      "CRM atualizado sem preenchimento manual",
      "Visão clara do que está travado no funil",
    ],
  },
  {
    icon: Sparkles,
    title: "Otimize",
    desc: "Saiba quais oportunidades merecem atenção agora e reduza o trabalho manual do time com automação e inteligência em cada etapa.",
    bullets: [
      "Priorização de quem está pronto para comprar",
      "Alertas do que precisa de atenção hoje",
      "Menos trabalho repetitivo para o time",
    ],
  },
];

function StepRow({
  step,
  index,
  isLeft,
  active,
  nodeRef,
}: {
  step: typeof steps[0];
  index: number;
  isLeft: boolean;
  active: boolean;
  nodeRef: (el: HTMLSpanElement | null) => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rowRef, { once: true, amount: 0.25 });
  const Icon = step.icon;

  return (
    <div ref={rowRef} className="relative md:grid md:grid-cols-2 md:items-center md:gap-16">
      {/* Numbered node on the center line — positioning wrapper is plain,
          motion only animates scale/opacity on the inner span so the
          Tailwind translate centering is never overridden */}
      <span
        ref={nodeRef}
        className="absolute left-[15px] top-8 z-20 -translate-x-1/2 md:left-1/2 md:top-1/2 md:-translate-y-1/2"
        aria-hidden
      >
        <motion.span
          initial={{ opacity: 0, scale: 0.6 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="block"
        >
          <motion.span
            animate={
              active
                ? {
                    backgroundColor: "hsl(var(--primary))",
                    color: "hsl(var(--primary-foreground))",
                    borderColor: "hsl(var(--primary))",
                  }
                : {
                    backgroundColor: "hsl(var(--card))",
                    color: "hsl(var(--muted-foreground))",
                    borderColor: "hsl(var(--border))",
                  }
            }
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="flex h-9 w-9 items-center justify-center rounded-full border text-[11px] font-bold tracking-wide shadow-[0_0_0_6px_hsl(var(--background))]"
          >
            {String(index + 1).padStart(2, "0")}
          </motion.span>
        </motion.span>
      </span>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 22 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={`pl-12 md:pl-0 ${isLeft ? "md:col-start-1" : "md:col-start-2"}`}
      >
        <div className="group rounded-panel border border-border/60 bg-card p-5 transition-all duration-300 hover:border-primary/30 hover:shadow-[0_12px_32px_-18px_hsl(var(--primary)/0.35)] sm:p-6">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-card bg-primary/10 transition-colors duration-300 group-hover:bg-primary/15">
            <Icon size={20} className="text-primary" strokeWidth={1.9} />
          </div>
          <h3 className="font-display text-lg font-semibold leading-tight text-foreground sm:text-xl">
            {step.title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
          <ul className="mt-4 space-y-2.5 border-t border-border/60 pt-4">
            {step.bullets.map((b) => (
              <li key={b} className="flex items-start gap-2.5">
                <CheckCircle2
                  size={17}
                  className="mt-[1px] shrink-0 text-primary"
                  strokeWidth={2}
                />
                <span className="text-sm leading-snug text-foreground/80">{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </motion.div>

    </div>
  );
}

const floatingChips = [
  { icon: MessageCircle, label: "Follow-up automático", className: "left-[3%] top-[18%]", delay: 0 },
  { icon: TrendingUp, label: "+ Reuniões na agenda", className: "right-[4%] top-[26%]", delay: 1.2 },
  { icon: Users, label: "Leads qualificados", className: "left-[5%] bottom-[22%]", delay: 2.1 },
  { icon: Target, label: "Pipeline organizado", className: "right-[3%] bottom-[14%]", delay: 0.7 },
];

export const MechanismSection = () => {
  const { ref, isVisible } = useScrollAnimation();
  const trackRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [trackH, setTrackH] = useState(0);
  const [passedCount, setPassedCount] = useState(0);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const update = () => setTrackH(el.getBoundingClientRect().height);
    update();
    const t = window.setTimeout(update, 350);
    if (typeof ResizeObserver === "undefined") return () => window.clearTimeout(t);
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      ro.disconnect();
      window.clearTimeout(t);
    };
  }, []);

  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start 80%", "end 55%"],
  });
  const progress = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 26,
    mass: 0.22,
    restDelta: 0.0005,
  });
  const dotY = useTransform(progress, (v) => Math.min(1, Math.max(0, v)) * trackH);
  const lineH = useTransform(dotY, (y) => Math.max(0, y - 5));

  useMotionValueEvent(dotY, "change", (y) => {
    // Mede na hora — evita posições desatualizadas por animações/resize.
    // O nó só ganha foco verde quando a bola já passou pelo centro dele.
    const tr = trackRef.current?.getBoundingClientRect();
    if (!tr) return;
    let count = 0;
    nodeRefs.current.forEach((n) => {
      if (!n) return;
      const r = n.getBoundingClientRect();
      const ny = r.top + r.height / 2 - tr.top;
      if (y >= ny - 2) count += 1;
    });
    setPassedCount((prev) => (prev === count ? prev : count));
  });

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="relative w-full overflow-hidden py-12 sm:py-20"
    >
      {/* Mini cards flutuantes discretos no fundo */}
      {floatingChips.map((chip) => (
        <motion.div
          key={chip.label}
          initial={{ opacity: 0, y: 12 }}
          animate={isVisible ? { opacity: 1, y: [0, -8, 0] } : {}}
          transition={{
            opacity: { duration: 0.6, delay: 0.4 + chip.delay * 0.2 },
            y: { duration: 5, repeat: Infinity, ease: "easeInOut", delay: chip.delay },
          }}
          className={`pointer-events-none absolute z-0 hidden items-center gap-2 rounded-hover border border-border/60 bg-card/80 px-3 py-2 shadow-sm xl:flex ${chip.className}`}
          aria-hidden
        >
          <chip.icon size={14} className="text-primary" strokeWidth={2} />
          <span className="text-[11px] font-medium text-muted-foreground">{chip.label}</span>
        </motion.div>
      ))}

      <div className="container relative z-10 mx-auto max-w-6xl px-4">
        <SectionHeading
          eyebrow="Por que é diferente"
          title="A Wiize centraliza e automatiza"
          highlight="sua operação comercial com IA"
          highlightFit="tight"
          description="Uma única plataforma de vendas B2B para captar, converter, gerenciar e otimizar, com IA e automação em cada etapa."
          isVisible={isVisible}
        />

        {/* Input badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="relative z-10 mb-10 flex justify-center"
        >
          <div className="flex items-center gap-2.5 rounded-hover border border-primary/20 bg-card px-4 py-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-50" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <span className="text-xs font-medium text-primary">Seu perfil de cliente ideal</span>
          </div>
        </motion.div>

        {/* Timeline */}
        <div ref={trackRef} className="relative space-y-8 sm:space-y-10 md:space-y-12">
          {/* trilha */}
          <span
            className="absolute left-[15px] top-0 z-0 h-full w-px bg-border/70 md:left-1/2"
            aria-hidden
          />
          {/* preenchimento verde — termina exatamente no topo da bola,
              nunca passa por cima dela nem deixa gap no início */}
          <motion.span
            className="absolute left-[15px] top-0 z-0 w-px bg-primary md:left-1/2"
            style={{ height: lineH }}
            aria-hidden
          />
          {/* bola — wrapper puro cuida da centralização; o motion só anima Y */}
          <span
            className="absolute left-[15px] top-0 z-10 -translate-x-1/2 md:left-1/2"
            aria-hidden
          >
            <motion.span
              className="block h-[11px] w-[11px] rounded-full bg-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.18)]"
              style={{ y: dotY, marginTop: -5, willChange: "transform" }}
            />
          </span>

          {steps.map((step, i) => (
            <StepRow
              key={step.title}
              step={step}
              index={i}
              isLeft={i % 2 === 0}
              passed={i < passedCount}
              nodeRef={(el) => {
                nodeRefs.current[i] = el;
              }}
            />
          ))}
        </div>

        {/* Output badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 mt-10 flex justify-center"
        >
          <div className="flex items-center gap-2.5 rounded-hover border border-primary/20 bg-primary/10 px-4 py-2">
            <CalendarCheck size={14} className="text-primary" />
            <span className="text-xs font-medium text-primary">
              Reuniões marcadas e pipeline abastecido
            </span>
          </div>
        </motion.div>

        <p className="mx-auto mt-10 max-w-md text-center text-sm text-muted-foreground">
          Todo dia, sem alguém precisar lembrar de fazer.
        </p>
      </div>
    </section>
  );
};
