import { Button } from "@/components/ui/button";
import { Check, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const plans = [
  {
    name: "Start",
    price: "69",
    anchorPrice: "129",
    searches: "200",
    description: "Ideal para começar a prospectar novos clientes",
    features: [
      "Até 200 buscas estratégicas/mês",
      "Até 50 leads por busca",
      "Download em Excel",
      "Dados completos dos leads",
      "Suporte por email",
    ],
    popular: false,
  },
  {
    name: "Growth",
    price: "197",
    anchorPrice: "397",
    searches: "600",
    description: "Para profissionais que querem escalar resultados",
    features: [
      "Até 600 buscas estratégicas/mês",
      "Até 50 leads por busca",
      "Download em Excel",
      "Dados completos dos leads",
      "Suporte prioritário",
      "Relatório de uso mensal",
    ],
    popular: true,
  },
  {
    name: "Scale",
    price: "397",
    anchorPrice: "797",
    searches: "1.200",
    description: "Para equipes e agências com alta demanda",
    features: [
      "Até 1.200 buscas estratégicas/mês",
      "Até 50 leads por busca",
      "Download em Excel",
      "Dados completos dos leads",
      "Suporte VIP",
      "Relatório de uso mensal",
      "API access (em breve)",
    ],
    popular: false,
  },
];

export const PricingSection = () => {
  const { ref, isVisible } = useScrollAnimation();
  
  return (
    <section 
      id="pricing" 
      className="py-24 relative"
      ref={ref as React.RefObject<HTMLElement>}
    >
      <div className="container mx-auto px-4">
        <div 
          className={`text-center mb-16 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            Planos que <span className="text-gradient">cabem no bolso</span>
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            Um único cliente fechado já paga o plano inteiro.
            Invista em prospecção previsível.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative rounded-2xl p-6 sm:p-8 transition-all duration-500 hover:-translate-y-2 ${
                plan.popular
                  ? "bg-gradient-card border-2 border-primary shadow-glow"
                  : "glass"
              } ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: `${150 + index * 100}ms` }}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className="flex items-center gap-1 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium whitespace-nowrap">
                    <Sparkles size={14} />
                    Mais Popular
                  </div>
                </div>
              )}

              <div className="mb-6">
                <h3 className="font-display text-xl sm:text-2xl font-bold mb-2">{plan.name}</h3>
                <p className="text-muted-foreground text-sm">{plan.description}</p>
              </div>

              <div className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base text-muted-foreground line-through decoration-muted-foreground/50 decoration-2">R$ {plan.anchorPrice}</span>
                  <span className="bg-primary/15 text-primary text-xs font-bold px-2 py-0.5 rounded-full">
                    -{Math.round((1 - parseInt(plan.price) / parseInt(plan.anchorPrice)) * 100)}%
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-sm text-muted-foreground">R$</span>
                  <span className="font-display text-4xl sm:text-5xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">/mês</span>
                </div>
                <p className="text-sm text-primary mt-2">
                  Até {plan.searches} buscas estratégicas para encontrar novos clientes
                </p>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <Check size={18} className="text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link to="/signup" className="block">
                <Button
                  variant={plan.popular ? "hero" : "outline"}
                  size="lg"
                  className="w-full"
                >
                  {plan.popular ? "Começar Agora" : "Escolher Plano"}
                </Button>
              </Link>
            </div>
          ))}
        </div>

        <p 
          className={`text-center text-muted-foreground mt-12 text-sm sm:text-base transition-all duration-700 delay-500 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          Todos os planos incluem 10 buscas grátis para testar.
          Cancele quando quiser.
        </p>
      </div>
    </section>
  );
};
