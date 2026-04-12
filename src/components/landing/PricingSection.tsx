import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, X, Sparkles, Loader2, Shield, Lock, CreditCard, Server, FileCheck, ShieldCheck, BadgeCheck, RotateCcw, Rocket, TrendingUp, Building2 } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PaymentMethodModal, type CustomerData } from "@/components/checkout/PaymentMethodModal";
import { Switch } from "@/components/ui/switch";
import type { LucideIcon } from "lucide-react";

const parsePrice = (price: string) => Number(price.replace(/\./g, '').replace(',', '.'));
const formatPrice = (value: number) => {
  const rounded = Math.round(value);
  if (rounded >= 1000) return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return rounded.toString();
};

const AnimatedPrice = ({ targetPrice, anchorPrice, isVisible }: { targetPrice: string; anchorPrice: string; isVisible: boolean }) => {
  const target = parsePrice(targetPrice);
  const start = parsePrice(anchorPrice);
  const [displayValue, setDisplayValue] = useState(start);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!isVisible || hasAnimated.current) return;
    hasAnimated.current = true;

    const duration = 2000;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setDisplayValue(Math.round(start - (start - target) * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };

    const timeout = setTimeout(() => requestAnimationFrame(animate), 500);
    return () => clearTimeout(timeout);
  }, [isVisible, target, start]);

  return <span>{formatPrice(displayValue)}</span>;
};

const PRICE_IDS = {
  start: "price_1SlykAK8CM0R6xMMOCM684rz",
  growth: "price_1SlykkK8CM0R6xMMZu7WJesV",
  scale: "price_1SlylcK8CM0R6xMMyHRWAd8G",
};

type PlanFeature = { text: string; disabled?: boolean; highlight?: boolean; subItems?: string[]; sectionHeader?: string; subDetail?: boolean; isNew?: boolean };

const mainPlans = {
  monthly: [
    {
      name: "Start",
      key: "start",
      price: "296",
      anchorPrice: "592",
      opportunities: "1.000",
      description: "Para validar e começar a gerar oportunidades",
      features: [
        { text: "Geração de mensagens com IA" },
        { text: "IA analisa cada lead e identifica oportunidades reais de abordagem" },
        { text: "CRM integrado" },
        { text: "Campanhas de mensagem via Meta API oficial" },
        { text: "Até 2 números WhatsApp" },
        { text: "Suporte via email" },
        { text: "Sem automação", disabled: true },
        { text: "Sem follow-up", disabled: true },
        { text: "Sem agente", disabled: true },
      ] as PlanFeature[],
      popular: false,
      icon: Rocket,
    },
    {
      name: "Growth",
      key: "growth",
      price: "696",
      anchorPrice: "1.392",
      opportunities: "3.000",
      description: "Para escalar e converter oportunidades com IA",
      features: [
        { text: "Geração de mensagens com IA" },
        { text: "IA analisa cada lead e identifica oportunidades reais de abordagem" },
        { text: "CRM integrado" },
        { text: "Campanhas de mensagem via Meta API oficial" },
        { text: "Até 5 números WhatsApp" },
        { text: "Automação de atendimento" },
        { text: "Follow-up inteligente" },
        { text: "Agente de IA operacional" },
        { text: "Suporte prioritário" },
      ] as PlanFeature[],
      popular: true,
      icon: TrendingUp,
      badge: "⭐",
    },
  ],
  annual: [
    {
      name: "Start",
      key: "start",
      price: "246",
      anchorPrice: "592",
      opportunities: "1.000",
      description: "Para validar e começar a gerar oportunidades",
      features: [
        { text: "Geração de mensagens com IA" },
        { text: "IA analisa cada lead e identifica oportunidades reais de abordagem" },
        { text: "CRM integrado" },
        { text: "Campanhas de mensagem via Meta API oficial" },
        { text: "Até 2 números WhatsApp" },
        { text: "Suporte via email" },
        { text: "Sem automação", disabled: true },
        { text: "Sem follow-up", disabled: true },
        { text: "Sem agente", disabled: true },
      ] as PlanFeature[],
      popular: false,
      icon: Rocket,
    },
    {
      name: "Growth",
      key: "growth",
      price: "496",
      anchorPrice: "1.392",
      opportunities: "3.000",
      description: "Para escalar e converter oportunidades com IA",
      features: [
        { text: "Geração de mensagens com IA" },
        { text: "IA analisa cada lead e identifica oportunidades reais de abordagem" },
        { text: "CRM integrado" },
        { text: "Campanhas de mensagem via Meta API oficial" },
        { text: "Até 5 números WhatsApp" },
        { text: "Automação de atendimento" },
        { text: "Follow-up inteligente" },
        { text: "Agente de IA operacional" },
        { text: "Suporte prioritário" },
      ] as PlanFeature[],
      popular: true,
      icon: TrendingUp,
      badge: "⭐",
    },
  ],
};

const scalePlan = {
  name: "Scale",
  key: "scale",
  price: "1.496",
  opportunities: "Personalizado",
  description: "Um plano sob medida para a sua operação. Estrutura, volume e suporte dedicado para empresas que precisam de uma solução exclusiva.",
  features: [
    { text: "Tudo do Growth incluso" },
    { text: "Estrutura 100% personalizada", isNew: true },
    { text: "Número de oportunidades sob demanda" },
    { text: "Fluxos e automações sob medida" },
    { text: "Onboarding dedicado com especialista" },
    { text: "Processamento com prioridade máxima" },
    { text: "Números WhatsApp ilimitados" },
    { text: "Gerente de conta exclusivo" },
  ] as PlanFeature[],
  icon: Building2,
};


export const PricingSection = () => {
  const { ref, isVisible } = useScrollAnimation();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{ name: string; key: string; price: string } | null>(null);
  const [isAnnual, setIsAnnual] = useState(true);

  const plans = isAnnual ? mainPlans.annual : mainPlans.monthly;

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

  const handlePixCheckout = async (_customerData: CustomerData) => {};

  const handlePlanClick = (plan: { name: string; key: string; price: string }) => {
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
            className={`text-center mb-12 transition-all duration-700 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-4 text-foreground">
              Planos que <br className="md:hidden" /><span className="text-shimmer-highlight">cabem no bolso</span>
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Um único cliente fechado já paga o plano inteiro.
              Invista em prospecção previsível.
            </p>

            {/* Toggle Annual / Monthly - fixed height container */}
            <div className="flex items-center justify-center gap-3 h-8">
              <span className={`text-sm font-medium transition-colors ${!isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>
                Mensal
              </span>
              <Switch
                checked={isAnnual}
                onCheckedChange={setIsAnnual}
              />
              <span className={`text-sm font-medium transition-colors ${isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>
                Anual
              </span>
              {/* Always reserve space for the badge */}
              <span className={`bg-primary/15 text-primary text-xs font-bold px-2.5 py-1 rounded-full ml-1 transition-opacity duration-200 ${isAnnual ? 'opacity-100' : 'opacity-0'}`}>
                Economize até 30%
              </span>
            </div>
          </div>

          {/* Start + Growth */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-stretch mb-8">
            {plans.map((plan, index) => (
              <motion.div
                key={`${plan.key}-${isAnnual ? 'annual' : 'monthly'}`}
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
                className={`group relative rounded-2xl flex flex-col ${
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
                      <plan.icon className="h-5 w-5 text-primary transition-all duration-300 group-hover:scale-125 group-hover:rotate-12" />
                    </div>
                    <h3 className="font-display font-bold text-lg md:text-xl">{plan.name}</h3>
                  </div>
                  <p className="text-muted-foreground text-xs sm:text-sm min-h-[2.5rem] md:min-h-[2.75rem]">{plan.description}</p>
                </div>

                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-muted-foreground line-through decoration-muted-foreground/50 decoration-2 text-sm">R$ {plan.anchorPrice}</span>
                    <span className="bg-primary/15 text-primary text-xs font-bold px-2 py-0.5 rounded-full">
                      -{Math.round((1 - parsePrice(plan.price) / parsePrice(plan.anchorPrice)) * 100)}%
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-base text-muted-foreground">R$</span>
                    <span className="font-display font-bold text-4xl md:text-5xl tabular-nums">
                      <AnimatedPrice targetPrice={plan.price} anchorPrice={plan.anchorPrice} isVisible={isVisible} />
                    </span>
                    <span className="text-base text-muted-foreground">/mês</span>
                  </div>
                  {isAnnual && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Cobrado anualmente — R$ {formatPrice(parsePrice(plan.price) * 12)}/ano
                    </p>
                  )}
                  <p className="text-primary mt-1.5 text-xs sm:text-sm font-medium">
                    Até {plan.opportunities} oportunidades/mês
                  </p>
                </div>

                <ul className="space-y-3 mb-8 text-sm flex-grow">
                  {plan.features.map((feature, i) => (
                    <li key={i} className={`flex items-start gap-3 text-sm ${feature.disabled ? 'opacity-50' : ''}`}>
                      {feature.disabled ? (
                        <X size={16} className="text-muted-foreground flex-shrink-0 mt-0.5" />
                      ) : (
                        <Check size={16} className="text-primary flex-shrink-0 mt-0.5" />
                      )}
                      <span className="text-muted-foreground">{feature.text}</span>
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
                    "Começar a Gerar Vendas"
                  ) : (
                    "Começar Agora"
                  )}
                </Button>
              </motion.div>
            ))}
          </div>

          {/* Scale - Full width card, same style as others */}
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.3 }}
            whileHover={{ 
              y: -8,
              scale: 1.01,
              transition: { duration: 0.3 }
            }}
            className="group rounded-2xl glass p-5 md:p-6 mb-16"
          >
            <div className="flex flex-col md:flex-row gap-6">
              {/* Left: Plan info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
                    <Building2 className="h-5 w-5 text-primary transition-all duration-300 group-hover:scale-125 group-hover:rotate-12" />
                  </div>
                  <h3 className="font-display font-bold text-lg md:text-xl">Scale</h3>
                  <span className="bg-primary text-primary-foreground text-[10px] font-bold px-2.5 py-0.5 rounded-full">🔥 ENTERPRISE</span>
                </div>
                <p className="text-muted-foreground text-xs sm:text-sm mb-4">{scalePlan.description}</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {scalePlan.features.map((feature, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <Check size={16} className="text-primary flex-shrink-0" />
                      <span className="text-muted-foreground">{feature.text}</span>
                      {feature.isNew && (
                        <span className="shrink-0 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">SOB MEDIDA</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Price + CTA */}
              <div className="flex flex-col items-center md:items-end justify-center gap-4 md:min-w-[220px] md:border-l md:border-border/40 md:pl-6">
                <div className="text-center md:text-right">
                  <p className="text-xs text-muted-foreground mb-1">A partir de</p>
                  <div className="flex items-baseline gap-1 justify-center md:justify-end">
                    <span className="text-sm text-muted-foreground">R$</span>
                    <span className="font-display font-bold text-3xl md:text-4xl tabular-nums">1.496</span>
                    <span className="text-muted-foreground">/mês</span>
                  </div>
                  <p className="text-primary mt-1.5 text-xs font-medium">
                    Volume e estrutura personalizados
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full md:w-auto"
                  onClick={() => navigate("/enterprise")}
                >
                  Falar com Especialista
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Trust & Security Section */}
          <div 
            className={`transition-all duration-700 delay-600 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <div className="relative overflow-hidden rounded-2xl border border-border/50 p-6 md:p-10">
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
                
                <div className="hidden md:grid md:grid-cols-4 gap-4">
                  {[
                    { icon: Lock, title: "Dados Protegidos", description: "Criptografia ponta a ponta" },
                    { icon: CreditCard, title: "Pagamento Seguro", description: "Processamento via Stripe" },
                    { icon: Server, title: "Uptime 99.9%", description: "Disponibilidade contínua" },
                    { icon: FileCheck, title: "LGPD Compliant", description: "Proteção de dados" },
                  ].map((item, i) => (
                    <div key={i} className="group p-5 rounded-xl bg-background/60 border border-border/50 hover:border-primary/20 transition-all duration-300 hover:shadow-sm text-center">
                      <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-xl bg-primary/10 mb-4 group-hover:bg-primary/15 transition-all duration-300">
                        <item.icon className="h-6 w-6 text-primary transition-all duration-300 group-hover:scale-125 group-hover:rotate-12" />
                      </div>
                      <p className="font-semibold text-foreground mb-1.5 text-sm">{item.title}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                    </div>
                  ))}
                </div>

                <div className="hidden md:grid md:grid-cols-3 gap-4 mt-4">
                  {[
                    { icon: ShieldCheck, title: "100% Seguro", description: "Pagamento via Stripe" },
                    { icon: BadgeCheck, title: "Cancele quando quiser", description: "Sem fidelidade" },
                    { icon: RotateCcw, title: "Garantia 7 dias", description: "Devolução sem burocracia" },
                  ].map((item, i) => (
                    <div key={i} className="group p-5 rounded-xl bg-background/60 border border-border/50 hover:border-primary/20 transition-all duration-300 hover:shadow-sm text-center">
                      <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-xl bg-primary/10 mb-4 group-hover:bg-primary/15 transition-all duration-300">
                        <item.icon className="h-6 w-6 text-primary transition-all duration-300 group-hover:scale-125 group-hover:rotate-12" />
                      </div>
                      <p className="font-semibold text-foreground mb-1.5 text-sm">{item.title}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                    </div>
                  ))}
                </div>

                <div className="md:hidden space-y-3">
                  {[
                    { icon: Lock, title: "Dados Protegidos", description: "Criptografia ponta a ponta" },
                    { icon: CreditCard, title: "Pagamento Seguro", description: "Processamento via Stripe" },
                    { icon: Server, title: "Uptime 99.9%", description: "Disponibilidade contínua" },
                    { icon: FileCheck, title: "LGPD Compliant", description: "Proteção de dados" },
                    { icon: ShieldCheck, title: "100% Seguro", description: "Pagamento via Stripe" },
                    { icon: BadgeCheck, title: "Cancele quando quiser", description: "Sem fidelidade" },
                    { icon: RotateCcw, title: "Garantia 7 dias", description: "Devolução sem burocracia" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-background/60 border border-border/50">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                        <item.icon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      </div>
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
