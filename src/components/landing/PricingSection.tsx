import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Loader2, Shield, Clock, CreditCard, Gift, Search, MessageSquare, Smartphone, ArrowRight } from "lucide-react";
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
      "1 número WhatsApp",
      "Até 6.000 disparos/mês",
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
      "2 números WhatsApp",
      "Até 12.000 disparos/mês",
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
      "5 números WhatsApp",
      "Até 30.000 disparos/mês",
    ],
    popular: false,
  },
];

export const PricingSection = () => {
  const { ref, isVisible } = useScrollAnimation();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
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
        window.open(response.data.url, "_blank");
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-center">
            {plans.map((plan, index) => (
              <div
                key={index}
                className={`relative rounded-2xl transition-all duration-500 hover:-translate-y-2 ${
                  plan.popular
                    ? "bg-gradient-card border-2 border-primary shadow-glow p-7 sm:p-9 md:scale-105 md:z-10"
                    : "glass p-5 sm:p-7 md:scale-95"
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
                  <h3 className={`font-display font-bold mb-2 ${plan.popular ? 'text-xl sm:text-2xl' : 'text-lg sm:text-xl'}`}>{plan.name}</h3>
                  <p className={`text-muted-foreground ${plan.popular ? 'text-sm' : 'text-xs sm:text-sm'}`}>{plan.description}</p>
                </div>

                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-muted-foreground line-through decoration-muted-foreground/50 decoration-2 ${plan.popular ? 'text-base' : 'text-sm'}`}>R$ {plan.anchorPrice}</span>
                    <span className="bg-primary/15 text-primary text-xs font-bold px-2 py-0.5 rounded-full">
                      -{Math.round((1 - parseInt(plan.price) / parseInt(plan.anchorPrice)) * 100)}%
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm text-muted-foreground">R$</span>
                    <span className={`font-display font-bold ${plan.popular ? 'text-4xl sm:text-5xl' : 'text-3xl sm:text-4xl'}`}>{plan.price}</span>
                    <span className="text-muted-foreground">/mês</span>
                  </div>
                  <p className={`text-primary mt-2 ${plan.popular ? 'text-sm' : 'text-xs sm:text-sm'}`}>
                    Até {plan.searches} buscas estratégicas para encontrar novos clientes
                  </p>
                </div>

                <ul className={`space-y-3 mb-8 ${plan.popular ? '' : 'text-sm'}`}>
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <Check size={plan.popular ? 18 : 16} className="text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant={plan.popular ? "hero" : "outline"}
                  size={plan.popular ? "lg" : "default"}
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

          {/* Guarantee Section */}
          <div 
            className={`grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 transition-all duration-700 delay-500 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border border-border/50">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">100% Seguro</p>
                <p className="text-sm text-muted-foreground">Pagamento via Stripe</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border border-border/50">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Cancele quando quiser</p>
                <p className="text-sm text-muted-foreground">Sem fidelidade</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border border-border/50">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                <CreditCard className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Garantia 7 dias</p>
                <p className="text-sm text-muted-foreground">Devolução sem burocracia</p>
              </div>
            </div>
          </div>

          {/* Free Trial Section */}
          <div 
            className={`mt-16 transition-all duration-700 delay-600 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/15 via-primary/5 to-background border border-primary/30 p-8 md:p-10">
              {/* Background decoration */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/10 rounded-full blur-2xl" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
              
              <div className="relative z-10">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center gap-2 bg-primary/20 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-4">
                    <Gift className="h-4 w-4" />
                    Teste Gratuito por 30 dias
                  </div>
                  
                  <h3 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-3">
                    Experimente antes de assinar
                  </h3>
                  <p className="text-muted-foreground max-w-lg mx-auto">
                    Teste todas as funcionalidades da Prospex gratuitamente durante 30 dias. Sem compromisso.
                  </p>
                </div>
                
                {/* Features Cards */}
                <div className="space-y-4">
                  {/* Search card - full width on top */}
                  <div 
                    className={`flex items-center gap-4 p-5 rounded-xl bg-background/90 border border-border/50 shadow-sm transition-all duration-500 hover:shadow-md hover:border-primary/30 ${
                      isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                    }`}
                    style={{ transitionDelay: '700ms' }}
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 flex-shrink-0">
                      <Search className="h-7 w-7 text-primary" />
                    </div>
                    <div>
                      <p className="font-bold text-lg text-foreground">10 buscas estratégicas com IA</p>
                      <p className="text-sm text-muted-foreground">grátis</p>
                    </div>
                  </div>
                  
                  {/* Bottom row - messages and whatsapp side by side */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div 
                      className={`flex items-center gap-4 p-5 rounded-xl bg-background/90 border border-border/50 shadow-sm transition-all duration-500 hover:shadow-md hover:border-primary/30 ${
                        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                      }`}
                      style={{ transitionDelay: '800ms' }}
                    >
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 flex-shrink-0">
                        <MessageSquare className="h-7 w-7 text-primary" />
                      </div>
                      <div>
                        <p className="font-bold text-lg text-foreground">400 disparos em massa</p>
                        <p className="text-sm text-muted-foreground">grátis</p>
                      </div>
                    </div>
                    
                    <div 
                      className={`flex items-center gap-4 p-5 rounded-xl bg-background/90 border border-border/50 shadow-sm transition-all duration-500 hover:shadow-md hover:border-primary/30 ${
                        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                      }`}
                      style={{ transitionDelay: '900ms' }}
                    >
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 flex-shrink-0">
                        <Smartphone className="h-7 w-7 text-primary" />
                      </div>
                      <div>
                        <p className="font-bold text-lg text-foreground">1 número WhatsApp</p>
                        <p className="text-sm text-muted-foreground">grátis</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* CTA Button */}
                <div className="mt-8 flex flex-col items-center gap-4 pt-6 border-t border-primary/20">
                  <Button 
                    variant="hero" 
                    size="lg" 
                    className="gap-2 w-full sm:w-auto"
                    onClick={() => navigate("/signup")}
                  >
                    Começar Teste Grátis
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <p className="text-xs sm:text-sm text-muted-foreground text-center">
                    * Válido apenas durante os 30 dias do período de teste
                  </p>
                </div>
              </div>
            </div>
          </div>
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
