import { motion } from "framer-motion";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Star, Quote } from "lucide-react";

interface Testimonial {
  text: string;
  image: string;
  name: string;
  role: string;
  company: string;
}

const testimonials: Testimonial[] = [
  {
    text: "O WiizeProspect revolucionou nossa prospecção. Em uma semana conseguimos 3x mais leads qualificados do que em um mês usando métodos tradicionais.",
    image: "https://randomuser.me/api/portraits/women/44.jpg",
    name: "Mariana Santos",
    role: "Diretora Comercial",
    company: "AgênciaMax",
  },
  {
    text: "A qualidade dos leads é impressionante. Todos os contatos são reais e as empresas estão ativas. Nossa taxa de conversão aumentou 40%.",
    image: "https://randomuser.me/api/portraits/men/32.jpg",
    name: "Rafael Oliveira",
    role: "Gerente de Vendas",
    company: "TechSolutions",
  },
  {
    text: "Ferramenta essencial para quem trabalha com vendas B2B. Os filtros por região são perfeitos para nossa estratégia de expansão.",
    image: "https://randomuser.me/api/portraits/women/68.jpg",
    name: "Camila Ferreira",
    role: "Head de Growth",
    company: "StartupHub",
  },
  {
    text: "Antes perdia horas buscando leads no Google Maps. Agora em minutos tenho uma lista completa com telefone, email e tudo organizado.",
    image: "https://randomuser.me/api/portraits/men/75.jpg",
    name: "Lucas Mendes",
    role: "CEO",
    company: "Vendas Express",
  },
  {
    text: "O ROI foi imediato. No primeiro mês já fechamos 5 novos clientes que vieram das buscas do WiizeProspect.",
    image: "https://randomuser.me/api/portraits/women/33.jpg",
    name: "Amanda Costa",
    role: "Empreendedora",
    company: "Costa Marketing",
  },
  {
    text: "A IA realmente entrega leads qualificados. Não é só volume, é precisão. Recomendo para qualquer equipe comercial.",
    image: "https://randomuser.me/api/portraits/women/21.jpg",
    name: "Juliana Prado",
    role: "Coordenadora de Vendas",
    company: "Grupo Êxito",
  },
  {
    text: "Excelente custo-benefício. Um cliente que fechamos já pagou 6 meses de assinatura do plano Growth.",
    image: "https://randomuser.me/api/portraits/men/46.jpg",
    name: "Pedro Almeida",
    role: "Diretor de Marketing",
    company: "Almeida & Cia",
  },
  {
    text: "Os disparos de WhatsApp integrados são game-changer. Automação que funciona sem risco de bloqueio.",
    image: "https://randomuser.me/api/portraits/women/89.jpg",
    name: "Beatriz Lima",
    role: "Gerente de Projetos",
    company: "Lima Digital",
  },
  {
    text: "Interface intuitiva e resultados reais. Nunca foi tão fácil encontrar novos clientes para nossa agência.",
    image: "https://randomuser.me/api/portraits/men/54.jpg",
    name: "Thiago Souza",
    role: "Fundador",
    company: "Agência Impulso",
  },
];

const firstColumn = testimonials.slice(0, 3);
const secondColumn = testimonials.slice(3, 6);
const thirdColumn = testimonials.slice(6, 9);

const TestimonialCard = ({ text, image, name, role, company }: Testimonial) => (
  <div className="glass rounded-2xl p-4 sm:p-6">
    <Quote size={20} className="text-primary/30 mb-3 sm:mb-4" />
    <p className="text-muted-foreground leading-relaxed mb-4 sm:mb-6 text-xs sm:text-sm md:text-base">
      {text}
    </p>
    <div className="flex items-center gap-3 sm:gap-4">
      <img
        src={image}
        alt={name}
        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-primary/20 flex-shrink-0"
      />
      <div className="min-w-0">
        <p className="font-semibold text-foreground text-xs sm:text-sm md:text-base truncate">
          {name}
        </p>
        <p className="text-muted-foreground text-[10px] sm:text-xs md:text-sm truncate">
          {role} • {company}
        </p>
      </div>
    </div>
  </div>
);

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
    <div className={`relative ${className}`} style={{ overflow: 'hidden' }}>
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
            {testimonials.map((testimonial, i) => (
              <TestimonialCard key={`${index}-${i}`} {...testimonial} />
            ))}
          </div>
        ))}
      </motion.div>
    </div>
  );
};

// Static testimonials for mobile (no animation)
const StaticTestimonials = ({ testimonials }: { testimonials: Testimonial[] }) => (
  <div className="flex flex-col gap-4">
    {testimonials.slice(0, 3).map((testimonial, i) => (
      <TestimonialCard key={i} {...testimonial} />
    ))}
  </div>
);

export const TestimonialsSection = () => {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section
      id="testimonials"
      className="py-16 md:py-24 relative overflow-hidden"
      ref={ref as React.RefObject<HTMLElement>}
    >
      <div className="absolute inset-0 bg-gradient-glow opacity-20" />

      <div className="container mx-auto px-4 relative z-10 max-w-6xl">
        <div
          className={`text-center mb-12 md:mb-16 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6">
            <Star size={16} className="text-primary" />
            <span className="text-sm text-muted-foreground">
              +500 clientes satisfeitos
            </span>
          </div>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            O que nossos{" "}
            <span className="text-gradient">clientes dizem</span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
            Descubra como empresas estão transformando sua prospecção com o WiizeProspect
          </p>
        </div>

        {/* Desktop: 3 columns */}
        <div className="hidden lg:flex justify-center gap-6 max-w-6xl mx-auto h-[600px] mask-gradient">
          <TestimonialsColumn testimonials={firstColumn} duration={25} />
          <TestimonialsColumn
            testimonials={secondColumn}
            className="mt-16"
            duration={30}
          />
          <TestimonialsColumn testimonials={thirdColumn} duration={22} />
        </div>

        {/* Tablet: 2 columns */}
        <div className="hidden md:flex lg:hidden justify-center gap-6 max-w-4xl mx-auto h-[500px] mask-gradient">
          <TestimonialsColumn testimonials={firstColumn} duration={25} />
          <TestimonialsColumn
            testimonials={secondColumn}
            className="mt-12"
            duration={30}
          />
        </div>

        {/* Mobile: Static cards (no scroll issues) */}
        <div className="md:hidden max-w-sm mx-auto px-2">
          <StaticTestimonials testimonials={firstColumn} />
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
