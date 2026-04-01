import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Loader2, Shield, Clock, CreditCard, Gift, Search, MessageSquare, Smartphone, ArrowRight, Rocket, TrendingUp, Building2 } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PaymentMethodModal, type CustomerData } from "@/components/checkout/PaymentMethodModal";
import type { LucideIcon } from "lucide-react";

const PRICE_IDS = {
  start: "price_1SlykAK8CM0R6xMMOCM684rz",
  growth: "price_1SlykkK8CM0R6xMMZu7WJesV",
  scale: "price_1SlylcK8CM0R6xMMyHRWAd8G",
};

const plans: {
  name: string;
  key: string;
  price: string;
  anchorPrice: string;
  searches: string;
  whatsappNumbers: number;
  description: string;
  features: string[];
  popular: boolean;
  icon: LucideIcon;
}[] = [
  {
    name: "Start",
    key: "start",
    price: "197",
    anchorPrice: "397",
    searches: "200",
    whatsappNumbers: 2,
    description: "Ideal para começar a prospectar novos clientes",
    features: [
      "Até 10.000 disparos/mês",
      "Aquecimento de até 2 chips",
      "Agentes de IA Integrados",
      "Até 2 Números WhatsApp",
      "CRM integrado",
      "Até 50 leads por busca",
      "Suporte por email",
    ],
    popular: false,
    icon: Rocket,
  },
  {
    name: "Growth",
    key: "growth",
    price: "497",
    anchorPrice: "997",
    searches: "600",
    whatsappNumbers: 5,
    description: "Para profissionais que querem escalar resultados",
    features: [
      "Até 30.000 disparos/mês",
      "Aquecimento de até 5 chips",
      "Agentes de IA Integrados",
      "Até 5 Números WhatsApp",
      "CRM integrado",
      "Até 50 leads por busca",
      "Suporte prioritário",
    ],
    popular: true,
    icon: TrendingUp,
  },
  {
    name: "Scale",
    key: "scale",
    price: "897",
    anchorPrice: "1.797",
    searches: "1.200",
    whatsappNumbers: 10,
    description: "Para equipes e agências com alta demanda",
    features: [
      "Até 60.000 disparos/mês",
      "Aquecimento de até 10 chips",
      "Agentes de IA Integrados",
      "Até 10 Números WhatsApp",
      "CRM integrado",
      "Até 50 leads por busca",
      "Suporte VIP",
    ],
    popular: false,
    icon: Building2,
  },
];

export const PricingSection = () => {
  const { ref, isVisible } = useScrollAnimation();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<typeof plans[0] | null>(null);

  const handleCardCheckout = async (customerData: CustomerData) => {
    if (!selectedPlan) return;
    setLoadingPlan(selectedPlan.key);
    try {
      const priceId = PRICE_IDS[selectedPlan.key as keyof typeof PRICE_IDS];
      const response = await supabase.functions.invoke("create-checkout", {
        body: { priceId, guestEmail: user ? undefined : customerData.email },
      });
      if (response.error) throw new Error(response.error.message);
      if (response.data?.url) {
        window.open(response.data.url, "_blank");
      } else {
        throw new Error("URL de checkout não recebida");
      }
    } catch (error: any) {
      toast({ title: "Erro ao iniciar checkout", description: error.message || "Tente novamente mais tarde", variant: "destructive" });
    } finally {
      setLoadingPlan(null);
      setPaymentModalOpen(false);
    }
  };

  const handlePixCheckout = async (_customerData: CustomerData) => {
    // PIX is now handled inline in the modal via QR Code
    // This callback is kept for interface compatibility but no longer redirects
  };

  const handlePlanClick = (plan: typeof plans[0]) => {
    setSelectedPlan(plan);
    setPaymentModalOpen(true);
  };

  return (
    <>
      <section 
        id="pricing" 
        className="py-16 sm:py-24 relative overflow-hidden w-full"
        ref={ref as React.RefObject<HTMLElement>}
      >
        <div className="container mx-auto px-4 max-w-6xl">
          <div 
            className={`text-center mb-16 transition-all duration-700 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-4 text-foreground">
              Planos que <span className="text-highlight-static">cabem no bolso</span>
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              Um único cliente fechado já paga o plano inteiro.
              Invista em prospecção previsível.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
            {plans.map((plan, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ 
                  duration: 0.6, 
                  delay: index * 0.15,
                  ease: [0.25, 0.46, 0.45, 0.94]
                }}
                whileHover={{ 
                  y: -8, 
                  scale: plan.popular ? 1.02 : 1.03,
                  transition: { duration: 0.3 }
                }}
                className={`relative rounded-2xl flex flex-col ${
                  plan.popular
                    ? "bg-gradient-card border-2 border-primary shadow-glow p-5 md:p-6 md:z-10"
                    : "glass p-5 md:p-6"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="flex items-center gap-1 bg-primary text-white px-4 py-1 rounded-full text-sm font-medium whitespace-nowrap">
                      <Sparkles size={14} />
                      Mais Popular
                    </div>
                  </div>
                )}

                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
                      <plan.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-display font-bold text-lg md:text-xl">{plan.name}</h3>
                  </div>
                  <p className="text-muted-foreground text-xs sm:text-sm min-h-[2.5rem] md:min-h-[2.75rem]">{plan.description}</p>
                </div>

                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-muted-foreground line-through decoration-muted-foreground/50 decoration-2 text-sm">R$ {plan.anchorPrice}</span>
                    <span className="bg-primary/15 text-primary text-xs font-bold px-2 py-0.5 rounded-full">
                      -{Math.round((1 - parseInt(plan.price) / parseInt(plan.anchorPrice.replace('.', ''))) * 100)}%
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm text-muted-foreground">R$</span>
                    <span className="font-display font-bold text-3xl md:text-4xl">{plan.price}</span>
                    <span className="text-muted-foreground">/mês</span>
                  </div>
                  <p className="text-primary mt-2 text-xs sm:text-sm">
                    Até {plan.searches} buscas estratégicas para encontrar novos clientes
                  </p>
                </div>

                <ul className="space-y-3 mb-8 text-sm flex-grow">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <Check size={16} className="text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant={plan.popular ? "hero" : "outline"}
                  size="lg"
                  className="w-full mt-auto"
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
              </motion.div>
            ))}
          </div>

          {/* Guarantee Section */}
          <div 
            className={`grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 transition-all duration-700 delay-500 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <div className="flex items-center gap-4 p-4 rounded-xl glass">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">100% Seguro</p>
                <p className="text-sm text-muted-foreground">Pagamento via Stripe</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-4 rounded-xl glass">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Cancele quando quiser</p>
                <p className="text-sm text-muted-foreground">Sem fidelidade</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-4 rounded-xl glass">
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
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/15 via-primary/5 to-background border border-primary/30 p-4 md:p-10">
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
                     Experimente antes de <span className="text-highlight-static">assinar</span>
                   </h3>
                  <p className="text-muted-foreground max-w-lg mx-auto">
                    Teste todas as funcionalidades da Wiize gratuitamente durante 30 dias. Sem compromisso.
                  </p>
                </div>
                
                {/* Features Cards */}
                <div className="space-y-3 md:space-y-4">
                  {/* Search card - full width on top */}
                  <div 
                    className={`flex items-center gap-2 md:gap-4 p-3 md:p-5 rounded-xl bg-background/90 border border-border/50 shadow-sm transition-all duration-500 hover:shadow-md hover:border-primary/30 ${
                      isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                    }`}
                    style={{ transitionDelay: '700ms' }}
                  >
                    <div className="flex h-9 w-9 md:h-14 md:w-14 items-center justify-center rounded-full bg-primary/15 flex-shrink-0">
                      <Search className="h-4 w-4 md:h-7 md:w-7 text-primary" />
                    </div>
                    <div className="flex items-center gap-1 md:block min-w-0">
                      <p className="font-bold text-xs md:text-lg text-foreground">10 buscas com IA</p>
                      <p className="text-xs md:text-sm text-muted-foreground">até 50 leads por busca</p>
                    </div>
                  </div>
                  
                  {/* Bottom row - messages and whatsapp side by side */}
                  <div className="grid grid-cols-2 gap-2 md:gap-4">
                    <div 
                      className={`flex items-center gap-2 md:gap-4 p-3 md:p-5 rounded-xl bg-background/90 border border-border/50 shadow-sm transition-all duration-500 hover:shadow-md hover:border-primary/30 ${
                        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                      }`}
                      style={{ transitionDelay: '800ms' }}
                    >
                      <div className="flex h-9 w-9 md:h-14 md:w-14 items-center justify-center rounded-full bg-primary/15 flex-shrink-0">
                        <MessageSquare className="h-4 w-4 md:h-7 md:w-7 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-xs md:text-lg text-foreground">400 disparos grátis</p>
                        <p className="text-xs md:text-sm text-muted-foreground">limite de 20 por dia</p>
                      </div>
                    </div>
                    
                    <div 
                      className={`flex items-center gap-2 md:gap-4 p-3 md:p-5 rounded-xl bg-background/90 border border-border/50 shadow-sm transition-all duration-500 hover:shadow-md hover:border-primary/30 ${
                        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                      }`}
                      style={{ transitionDelay: '900ms' }}
                    >
                      <div className="flex h-9 w-9 md:h-14 md:w-14 items-center justify-center rounded-full bg-primary/15 flex-shrink-0">
                        <Smartphone className="h-4 w-4 md:h-7 md:w-7 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-xs md:text-lg text-foreground">1 número WhatsApp</p>
                        <p className="text-xs md:text-sm text-muted-foreground">conecte e dispare</p>
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

      <PaymentMethodModal
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        planName={selectedPlan?.name || ""}
        planPrice={selectedPlan?.price || ""}
        planKey={selectedPlan?.key || ""}
        onSelectCard={handleCardCheckout}
        onSelectPix={handlePixCheckout}
        loading={loadingPlan !== null}
        defaultEmail={user?.email || ""}
      />
    </>
  );
};
