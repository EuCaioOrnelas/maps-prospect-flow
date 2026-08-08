import { useEffect, useRef, useState } from "react";
import { Quote } from "lucide-react";
import { SectionHeading } from "@/components/landing/SectionHeading";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

interface Testimonial {
  text: string;
  name: string;
  role: string;
  company: string;
  avatar: string;
}

const testimonials: Testimonial[] = [
  {
    text: "O Wiize revolucionou nossa prospecção. A IA encontra os leads certos e gera mensagens personalizadas que realmente convertem. Em uma semana, 3x mais oportunidades.",
    name: "Mariana S.",
    role: "Diretora Comercial",
    company: "AgênciaMax",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&fit=crop&crop=face",
  },
  {
    text: "As mensagens geradas pela IA são incríveis. Cada lead recebe uma abordagem única e relevante. Nossa taxa de resposta aumentou 40% logo no primeiro mês.",
    name: "Rafael O.",
    role: "Gerente de Vendas",
    company: "TechSolutions",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=96&h=96&fit=crop&crop=face",
  },
  {
    text: "A IA Closer no WhatsApp é um game-changer. Responde leads automaticamente, faz follow-up inteligente e já converteu clientes enquanto dormíamos.",
    name: "Camila F.",
    role: "Head de Growth",
    company: "StartupHub",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=96&h=96&fit=crop&crop=face",
  },
  {
    text: "Antes perdia horas criando mensagens genéricas. Agora a IA analisa cada lead e cria uma abordagem personalizada em segundos. Produtividade no máximo.",
    name: "Lucas M.",
    role: "CEO",
    company: "Vendas Express",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=96&h=96&fit=crop&crop=face",
  },
  {
    text: "O ROI foi imediato. A combinação de prospecção inteligente + mensagens personalizadas com IA nos trouxe 5 novos clientes no primeiro mês.",
    name: "Amanda C.",
    role: "Empreendedora",
    company: "Costa Marketing",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=96&h=96&fit=crop&crop=face",
  },
  {
    text: "A automação de atendimento com IA transformou nosso processo. O agente qualifica leads, responde dúvidas e agenda reuniões sem intervenção humana.",
    name: "Juliana P.",
    role: "Coordenadora de Vendas",
    company: "Grupo Êxito",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=96&h=96&fit=crop&crop=face",
  },
  {
    text: "Excelente custo-benefício. A IA gera mensagens tão personalizadas que os leads acham que escrevemos uma por uma. Um cliente já pagou 6 meses de plano.",
    name: "Pedro A.",
    role: "Diretor de Marketing",
    company: "Almeida & Cia",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=96&h=96&fit=crop&crop=face",
  },
  {
    text: "As campanhas com mensagens personalizadas por IA têm taxa de conversão absurda. Cada lead recebe algo único, não parece automação. Resultados reais.",
    name: "Beatriz L.",
    role: "Gerente de Projetos",
    company: "Lima Digital",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=96&h=96&fit=crop&crop=face",
  },
  {
    text: "SDR IA captando + diagnóstico automático + IA Closer atendendo. Tudo integrado. Nunca foi tão fácil converter novos clientes.",
    name: "Thiago S.",
    role: "Fundador",
    company: "Agência Impulso",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=96&h=96&fit=crop&crop=face",
  },
];

const firstRow = testimonials.slice(0, 5);
const secondRow = testimonials.slice(5, 9);

/**
 * Marquee horizontal 100% CSS. Sem framer-motion.
 * A animação roda no compositor (transform GPU) — não dispara JS/reflow.
 * `animation-play-state` é alternado por IntersectionObserver:
 * quando a seção sai da viewport, pausa; volta, retoma. Zero custo fora da tela.
 */
const TestimonialsRow = ({
  testimonials,
  duration = 40,
  isActive = true,
  reverse = false,
  className,
}: {
  testimonials: Testimonial[];
  duration?: number;
  isActive?: boolean;
  reverse?: boolean;
  className?: string;
}) => {
  return (
    <div className={`relative overflow-hidden ${className ?? ""}`}>
      <div
        className="tm-track flex flex-row gap-6 w-max"
        style={{
          animationDuration: `${duration}s`,
          animationPlayState: isActive ? "running" : "paused",
          animationDirection: reverse ? "reverse" : "normal",
        }}
      >
        {[0, 1, 2].map((dupIdx) => (
          <div key={dupIdx} className="flex flex-row gap-6" aria-hidden={dupIdx !== 0}>

            {testimonials.map(({ text, name, role, company, avatar }, i) => (
              <div
                key={`${dupIdx}-${i}`}
                className="rounded-2xl p-6 border border-border/60 w-[320px] md:w-[380px] shrink-0"
                style={{
                  background:
                    "linear-gradient(160deg, hsl(var(--card)) 0%, hsl(var(--card)) 60%, hsl(var(--primary) / 0.05) 100%)",
                }}
              >
                <Quote size={24} className="text-primary/30 mb-4" />
                <p className="text-muted-foreground leading-relaxed mb-6 text-sm md:text-base">
                  {text}
                </p>
                <div className="flex items-center gap-4">
                  <img
                    src={avatar}
                    alt={name}
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-card border-2 border-primary/20 object-cover shrink-0"
                    loading="lazy"
                    decoding="async"
                  />
                  <div>
                    <p className="font-semibold text-foreground text-sm md:text-base">{name}</p>
                    <p className="text-muted-foreground text-xs md:text-sm">
                      {role} • {company}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export const TestimonialsSection = () => {
  const { ref, isVisible } = useScrollAnimation();
  const sectionRef = useRef<HTMLElement | null>(null);
  const [isActive, setIsActive] = useState(false);

  // Pausa marquee quando a seção sai da tela. Roda 1x observer, sem re-render em scroll.
  useEffect(() => {
    if (!sectionRef.current) return;
    const el = sectionRef.current;
    const io = new IntersectionObserver(
      ([entry]) => setIsActive(entry.isIntersecting),
      { threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      id="testimonials"
      className="py-16 md:py-24 relative overflow-hidden w-full"
      ref={(node) => {
        sectionRef.current = node;
        (ref as React.MutableRefObject<HTMLElement | null>).current = node;
      }}
      style={{
        background:
          "radial-gradient(ellipse 55% 45% at 50% 50%, hsl(var(--primary) / 0.06) 0%, transparent 70%)",
      }}
    >
      <div className="container mx-auto px-4 relative z-10 max-w-6xl">
        <SectionHeading
          eyebrow="Depoimentos"
          title="O que nossos"
          highlight="clientes dizem"
          description="Veja como empresas estão convertendo mais com prospecção inteligente e mensagens personalizadas por IA."
          isVisible={isVisible}
        />
      </div>

      {/* Linhas horizontais — largura total, direções alternadas */}
      <div className="relative z-10 flex flex-col gap-6 tm-mask-x">
        <TestimonialsRow testimonials={firstRow} duration={55} isActive={isActive} />
        <TestimonialsRow testimonials={secondRow} duration={65} isActive={isActive} reverse />
        <TestimonialsRow
          testimonials={thirdRow}
          duration={50}
          isActive={isActive}
          className="hidden md:block"
        />
      </div>

      <style>{`
        @keyframes tm-scroll-x {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }
        .tm-track {
          animation-name: tm-scroll-x;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          will-change: transform;
          backface-visibility: hidden;
        }
        .tm-mask-x {
          -webkit-mask-image: linear-gradient(to right, transparent 0%, #000 8%, #000 92%, transparent 100%);
          mask-image: linear-gradient(to right, transparent 0%, #000 8%, #000 92%, transparent 100%);
        }
        @media (prefers-reduced-motion: reduce) {
          .tm-track { animation: none !important; }
        }
      `}</style>
    </section>
  );
};
