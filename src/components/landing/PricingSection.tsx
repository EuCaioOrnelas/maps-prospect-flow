import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Loader2 } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { EmailCaptureModal } from "./EmailCaptureModal";

const PRICE_IDS = {
  start: "price_1SkEsEK8CM0R6xMM9Y1ip21w",
  growth: "price_1SkEsZK8CM0R6xMMr0B2gEP1",
  scale: "price_1SkEsoK8CM0R6xMMF72J3hAi",
};

const plans = [
  {
    name: "Start",
    key: "start",
    price: "97",
    anchorPrice: "197",
    searches: "200",
    description: "Ideal para começar a prospectar novos clientes",
    features: [
      "Até 200 buscas estratégicas/mês",
      "Até 50 leads por busca",
      "Download em Excel",
      "Dados completos dos leads",
      "Suporte por email",
      "1 número WhatsApp (200 disparos/dia)",
    ],
    popular: false,
  },
  {
    name: "Growth",
    key: "growth",
    price: "247",
    anchorPrice: "497",
    searches: "600",
    description: "Para profissionais que querem escalar resultados",
    features: [
      "Até 600 buscas estratégicas/mês",
      "Até 50 leads por busca",
      "Download em Excel",
      "Dados completos dos leads",
      "Suporte prioritário",
      "Relatório de uso mensal",
      "2 números WhatsApp (200 disparos/dia cada)",
    ],
    popular: true,
  },
  {
    name: "Scale",
    key: "scale",
    price: "497",
    anchorPrice: "997",
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
      "5 números WhatsApp (200 disparos/dia cada)",
    ],
    popular: false,
  },
];

export const PricingSection = () => {
  const { ref, isVisible } = useScrollAnimation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<typeof plans[0] | null>(null);

  const handleCheckout = async (planKey: string, guestEmail?: string) => {
    setLoadingPlan(planKey);

    try {
      const priceId = PRICE_IDS[planKey as keyof typeof PRICE_IDS];

      const response = await supabase.functions.invoke("create-checkout", {
        body: { priceId, guestEmail },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.url) {
        window.location.href = response.data.url;
      } else {
        throw new Error("URL de checkout não recebida");
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast({
        title: "Erro ao iniciar checkout",
        description: error.message || "Tente novamente mais tarde",
        variant: "destructive",
      });
    } finally {
      setLoadingPlan(null);
      setEmailModalOpen(false);
    }
  };

  const handlePlanClick = (plan: typeof plans[0]) => {
    if (user) {
      // User is logged in, go directly to checkout
      handleCheckout(plan.key);
    } else {
      // User is not logged in, show email modal
      setSelectedPlan(plan);
      setEmailModalOpen(true);
    }
  };

  const handleEmailSubmit = (email: string) => {
    if (selectedPlan) {
      handleCheckout(selectedPlan.key, email);
    }
  };

  return (
    <>
      <section 
        id="pricing" 
        className="py-24 relative"
        ref={ref as React.RefObject<HTMLElement>}
      >
        <div className="container mx-auto px-4 max-w-6xl">
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
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

                <Button
                  variant={plan.popular ? "hero" : "outline"}
                  size="lg"
                  className="w-full"
                  onClick={() => handlePlanClick(plan)}
                  disabled={loadingPlan === plan.key}
                >
                  {loadingPlan === plan.key ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processando...
                    </>
                  ) : plan.popular ? (
                    "Começar Agora"
                  ) : (
                    "Escolher Plano"
                  )}
                </Button>
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

      <EmailCaptureModal
        open={emailModalOpen}
        onOpenChange={setEmailModalOpen}
        onSubmit={handleEmailSubmit}
        loading={loadingPlan !== null}
        planName={selectedPlan?.name || ""}
      />
    </>
  );
};
