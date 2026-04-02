import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Loader2, Shield, Clock, CreditCard, ArrowRight, Rocket, TrendingUp, Building2 } from "lucide-react";
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
    description: "Ideal para começar a encontrar e converter novas oportunidades",
    features: [
      "Geração de mensagens personalizadas com IA",
      "Automação de atendimento e follow-up inteligente com IA",
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
    description: "Para profissionais que querem aumentar conversão e produtividade",
    features: [
      "Geração de mensagens personalizadas com IA",
      "Automação de atendimento e follow-up inteligente com IA",
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
      "Geração de mensagens personalizadas com IA",
      "Automação de atendimento e follow-up inteligente com IA",
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
              Planos que <br className="md:hidden" /><span className="text-shimmer-highlight">cabem no bolso</span>
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
                    Até {plan.searches} buscas estratégicas para encontrar novas oportunidades
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

          {/* Trust & Security Section */}
          <div 
            className={`mt-16 transition-all duration-700 delay-600 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <div className="relative overflow-hidden rounded-2xl border border-border/50 p-6 md:p-10">
              {/* Subtle background */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/5 rounded-full blur-2xl" />
              
              <div className="relative z-10">
                <div className="text-center mb-10">
                  <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-4">
                    <Shield className="h-4 w-4" />
                    Infraestrutura Profissional
                  </div>
                  
                  <h3 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-3">
                    Segurança e confiança em cada etapa
                  </h3>
                  <p className="text-muted-foreground max-w-xl mx-auto">
                    Sua operação protegida por padrões de mercado, com transparência total e suporte dedicado.
                  </p>
                </div>
                
                {/* Trust Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
                  {[
                    {
                      icon: Shield,
                      title: "100% Seguro",
                      description: "Pagamento via Stripe",
                    },
                    {
                      icon: Clock,
                      title: "Cancele quando quiser",
                      description: "Sem fidelidade",
                    },
                    {
                      icon: CreditCard,
                      title: "Garantia 7 dias",
                      description: "Devolução sem burocracia",
                    },
                    {
                      icon: Shield,
                      title: "Dados Protegidos",
                      description: "Criptografia ponta a ponta",
                    },
                    {
                      icon: CreditCard,
                      title: "Pagamento Seguro",
                      description: "Processamento via Stripe",
                    },
                    {
                      icon: Clock,
                      title: "Uptime 99.9%",
                      description: "Disponibilidade contínua",
                    },
                    {
                      icon: Check,
                      title: "LGPD Compliant",
                      description: "Proteção de dados",
                    },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="group p-5 rounded-xl bg-background/60 border border-border/50 hover:border-primary/20 transition-all duration-300 hover:shadow-sm text-center"
                    >
                      <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-xl bg-primary/10 mb-4 group-hover:bg-primary/15 transition-all duration-300">
                        <item.icon className="h-6 w-6 text-primary transition-all duration-300 group-hover:scale-125 group-hover:rotate-12" />
                      </div>
                      <p className="font-semibold text-foreground mb-1.5 text-sm">{item.title}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                    </div>
                  ))}
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
