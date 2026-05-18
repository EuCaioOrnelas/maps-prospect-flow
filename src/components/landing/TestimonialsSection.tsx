import { motion } from "framer-motion";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Quote } from "lucide-react";

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

const firstColumn = testimonials.slice(0, 3);
const secondColumn = testimonials.slice(3, 6);
const thirdColumn = testimonials.slice(6, 9);

const TestimonialsColumn = ({
  className,
  testimonials,
  duration = 20,
}: {
  className?: string;
  testimonials: Testimonial[];
  duration?: number;
}) => {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <motion.div
        animate={{ translateY: "-50%" }}
        transition={{
          duration,
          repeat: Infinity,
          ease: "linear",
          repeatType: "loop",
        }}
        className="flex flex-col gap-6"
      >
        {[...new Array(2)].map((_, index) => (
          <div key={index} className="flex flex-col gap-6">
            {testimonials.map(({ text, name, role, company, avatar }, i) => (
              <div
                key={`${index}-${i}`}
                className="glass rounded-2xl p-6 hover:bg-card/80 transition-all duration-300"
              >
                <Quote size={24} className="text-primary/30 mb-4" />
                <p className="text-muted-foreground leading-relaxed mb-6 text-sm md:text-base">
                  {text}
                </p>
                <div className="flex items-center gap-4">
                  <img
                    src={avatar}
                    alt={name}
                    className="w-12 h-12 rounded-full border-2 border-primary/20 object-cover shrink-0"
                    loading="lazy"
                  />
                  <div>
                    <p className="font-semibold text-foreground text-sm md:text-base">
                      {name}
                    </p>
                    <p className="text-muted-foreground text-xs md:text-sm">
                      {role} • {company}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </motion.div>
    </div>
  );
};

export const TestimonialsSection = () => {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section
      id="testimonials"
      className="py-16 md:py-24 relative overflow-hidden w-full"
      ref={ref as React.RefObject<HTMLElement>}
    >
      <div className="absolute inset-0 bg-gradient-glow opacity-20" />

      <div className="container mx-auto px-4 relative z-10 max-w-6xl">
        <div
          className={`text-center mb-12 md:mb-16 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass mb-6 border border-primary/10">
            <div className="flex -space-x-2">
              <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=40&h=40&fit=crop&crop=face" alt="" className="w-5 h-5 rounded-full border-2 border-background object-cover" loading="lazy" />
              <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face" alt="" className="w-5 h-5 rounded-full border-2 border-background object-cover" loading="lazy" />
              <img src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop&crop=face" alt="" className="w-5 h-5 rounded-full border-2 border-background object-cover" loading="lazy" />
              <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=40&h=40&fit=crop&crop=face" alt="" className="w-5 h-5 rounded-full border-2 border-background object-cover" loading="lazy" />
            </div>
            <span className="text-xs font-medium text-foreground tracking-tight">+500 pessoas já utilizam a Wiize</span>
          </div>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-foreground">
            O que nossos clientes dizem
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
            Descubra como empresas estão convertendo mais com prospecção inteligente e mensagens personalizadas por IA
          </p>
        </div>

        {/* Desktop: 3 columns */}
        <div className="hidden lg:grid lg:grid-cols-3 gap-6 max-w-6xl mx-auto h-[600px] mask-gradient">
          <TestimonialsColumn testimonials={firstColumn} duration={25} />
          <TestimonialsColumn testimonials={secondColumn} duration={30} />
          <TestimonialsColumn testimonials={thirdColumn} duration={22} />
        </div>

        {/* Tablet: 2 columns */}
        <div className="hidden md:grid md:grid-cols-2 lg:hidden gap-6 max-w-4xl mx-auto h-[500px] mask-gradient">
          <TestimonialsColumn testimonials={firstColumn} duration={25} />
          <TestimonialsColumn testimonials={secondColumn} duration={30} />
        </div>

        {/* Mobile: 1 column */}
        <div className="md:hidden w-full h-[400px] mask-gradient px-2">
          <TestimonialsColumn testimonials={firstColumn} duration={20} />
        </div>
      </div>

      <style>{`
        .mask-gradient {
          mask-image: linear-gradient(
            to bottom,
            transparent 0%,
            black 10%,
            black 90%,
            transparent 100%
          );
          -webkit-mask-image: linear-gradient(
            to bottom,
            transparent 0%,
            black 10%,
            black 90%,
            transparent 100%
          );
        }
      `}</style>
    </section>
  );
};
