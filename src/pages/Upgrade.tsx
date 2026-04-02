import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Check, X, Sparkles, Crown, Loader2, Settings, AlertTriangle, Shield, Clock, CreditCard, Rocket, TrendingUp, Building2, Flame, Info } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PaymentMethodModal, type CustomerData } from "@/components/checkout/PaymentMethodModal";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { LucideIcon } from "lucide-react";
import { useAutoScoreTracking } from "@/hooks/useAutoScoreTracking";

const PRICE_IDS = {
  start: "price_1SlykAK8CM0R6xMMOCM684rz",
  growth: "price_1SlykkK8CM0R6xMMZu7WJesV",
  scale: "price_1SlylcK8CM0R6xMMyHRWAd8G",
};

type PlanFeature = { text: string; disabled?: boolean; highlight?: boolean; subItems?: string[] };

const plans: {
  name: string;
  key: string;
  price: string;
  anchorPrice: string;
  opportunities: string;
  description: string;
  features: PlanFeature[];
  popular: boolean;
  icon: LucideIcon;
}[] = [
  {
    name: "Start",
    key: "start",
    price: "197",
    anchorPrice: "397",
    opportunities: "1.000",
    description: "Para validar e começar a gerar oportunidades",
    features: [
      { text: "Geração de mensagens com IA" },
      { text: "IA analisa seus leads e orienta a melhor estratégia para converter cada oportunidade" },
      { text: "CRM integrado" },
      { text: "Disparos via Meta API oficial" },
      { text: "Até 2 números WhatsApp" },
      { text: "Sem automação", disabled: true },
      { text: "Sem follow-up", disabled: true },
      { text: "Sem agente", disabled: true },
    ],
    popular: false,
    icon: Rocket,
  },
  {
    name: "Growth",
    key: "growth",
    price: "497",
    anchorPrice: "997",
    opportunities: "3.000",
    description: "Para escalar e converter com IA",
    features: [
      { text: "Geração de mensagens com IA" },
      { text: "Diagnóstico individual por lead" },
      { text: "CRM integrado" },
      { text: "Disparos via Meta API oficial" },
      { text: "Até 5 números WhatsApp" },
      { text: "Automação de atendimento" },
      { text: "Follow-up inteligente" },
      { text: "Agente de IA operacional" },
      { text: "Suporte prioritário" },
    ],
    popular: true,
    icon: TrendingUp,
  },
  {
    name: "Scale",
    key: "scale",
    price: "1.297",
    anchorPrice: "2.597",
    opportunities: "10.000",
    description: "Para escalar com inteligência e tomada de decisão",
    features: [
      { text: "Tudo do Growth" },
      { text: "Agente de IA estratégico (exclusivo)", highlight: true, subItems: [
        "Prioriza leads automaticamente",
        "Sugere abordagem ideal",
        "Ajuda na decisão de conversão",
        "Aumenta taxa de conversão",
      ]},
      { text: "Prioridade de processamento" },
      { text: "Até 10 números WhatsApp" },
      { text: "Suporte VIP" },
    ],
    popular: false,
    icon: Building2,
  },
];
const Upgrade = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile, user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedPlanKey, setSelectedPlanKey] = useState<string | null>(null);

  const currentPlan = profile?.plan || "free";
  const { trackScoreEvent } = useAutoScoreTracking("upgrade");
  const isTrialExpired = searchParams.get("expired") === "true";
  const isRenewal = searchParams.get("renewal") === "true";
  const isFromCheckout = searchParams.get("checkout") === "success" || searchParams.get("session_id");
  const couponFromUrl = searchParams.get("coupon");
  const isCleanPage = true;

  // Check for checkout result
  useEffect(() => {
    const checkoutResult = searchParams.get("checkout");
    if (checkoutResult === "canceled") {
      toast({
        title: "Checkout cancelado",
        description: "Você pode tentar novamente quando quiser.",
        variant: "destructive",
      });
    }
  }, [searchParams, toast]);

  // Automatic subscription check - runs on mount and polls briefly after returning from checkout/portal
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const checkSubscription = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session || cancelled) return;

        console.log("[Upgrade] Checking subscription status...");
        const response = await supabase.functions.invoke("check-subscription");
        if (cancelled) return;

        if (response.data && !response.error) {
          console.log("[Upgrade] Subscription check result:", response.data);

          // Só sincroniza perfil quando necessário para evitar loop de re-render
          if (isFromCheckout || (response.data.plan && response.data.plan !== currentPlan)) {
            await refreshProfile();
          }

          if (isFromCheckout && response.data.plan && response.data.plan !== currentPlan) {
            toast({
              title: "🎉 Plano atualizado!",
              description: `Seu plano ${String(response.data.plan).toUpperCase()} está ativo.`,
            });
            navigate("/upgrade", { replace: true });
          }
        }
      } catch (error) {
        console.error("[Upgrade] Error checking subscription:", error);
      }
    };

    checkSubscription();

    if (isFromCheckout) {
      let attempts = 0;
      const maxAttempts = 24; // até 2 minutos

      intervalId = setInterval(() => {
        attempts += 1;
        if (attempts >= maxAttempts) {
          if (intervalId) clearInterval(intervalId);
          intervalId = null;
          return;
        }
        checkSubscription();
      }, 5000);
    }

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [refreshProfile, isFromCheckout, currentPlan, toast, navigate]);

  const getPlanOrder = (planName: string) => {
    const order: Record<string, number> = {
      free: 0,
      start: 1,
      growth: 2,
      scale: 3,
    };
    return order[planName.toLowerCase()] || 0;
  };

  const isCurrentPlan = (planName: string) => {
    return currentPlan.toLowerCase() === planName.toLowerCase();
  };

  const isDowngrade = (planName: string) => {
    return getPlanOrder(planName) < getPlanOrder(currentPlan);
  };

  const trackCheckoutEvents = (planKey: string) => {
    trackScoreEvent("checkout_started", { plan: planKey });
    trackScoreEvent("plan_selected", { plan: planKey });
    
    if (user?.id && currentPlan === 'free') {
      const priceId = PRICE_IDS[planKey as keyof typeof PRICE_IDS];
      supabase.from('trial_product_events').insert({
        user_id: user.id,
        event_name: 'checkout_started',
        event_source: 'frontend',
        metadata: { plan: planKey, price_id: priceId },
      }).then(() => {});

      try {
        const attrStr = sessionStorage.getItem('trial_email_attribution');
        if (attrStr) {
          const attr = JSON.parse(attrStr);
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          fetch(`${supabaseUrl}/functions/v1/trial-email-tracker?action=conversion&uid=${attr.user_id}&tid=${attr.template_id}&aid=${attr.automation_id}&plan=${planKey}&amount=0`, {
            method: 'GET',
          }).catch(() => {});
        }
      } catch (_) {}
    }
  };

  const handleCardCheckout = async (customerData: CustomerData) => {
    if (!selectedPlanKey) return;
    setLoadingPlan(selectedPlanKey);
    trackCheckoutEvents(selectedPlanKey);
    try {
      const priceId = PRICE_IDS[selectedPlanKey as keyof typeof PRICE_IDS];
      const response = await supabase.functions.invoke("create-checkout", {
        body: { priceId, guestEmail: user ? undefined : customerData.email, couponCode: couponFromUrl || undefined },
      });
      if (response.error) throw new Error(response.error.message);
      if (response.data?.url) {
        window.location.href = response.data.url;
      } else {
        throw new Error("URL de checkout não recebida");
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast({ title: "Erro ao iniciar checkout", description: error.message || "Tente novamente mais tarde", variant: "destructive" });
    } finally {
      setLoadingPlan(null);
      setPaymentModalOpen(false);
    }
  };

  const handlePixCheckout = async (_customerData: CustomerData) => {
    // PIX is now handled inline in the modal via QR Code
    if (selectedPlanKey) trackCheckoutEvents(selectedPlanKey);
  };

  const handleUpgrade = (planKey: string) => {
    trackScoreEvent("clicked_upgrade_button", { plan: planKey });
    setSelectedPlanKey(planKey);
    setPaymentModalOpen(true);
  };

  const handleManageSubscription = async () => {
    setLoadingPortal(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Sessão expirada",
          description: "Por favor, faça login novamente",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      const response = await supabase.functions.invoke("customer-portal");

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.url) {
        window.open(response.data.url, "_blank");
      } else {
        throw new Error("URL do portal não recebida");
      }
    } catch (error: any) {
      console.error("Portal error:", error);
      toast({
        title: "Erro ao abrir portal",
        description: error.message || "Tente novamente mais tarde",
        variant: "destructive",
      });
    } finally {
      setLoadingPortal(false);
    }
  };

  const hasPaidPlan = currentPlan !== "free";

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Sidebar & Header only when NOT in clean renewal/expired mode */}
      {!isCleanPage && (
        <>
          <AppSidebar profile={profile} />
          <AppHeader profile={profile} />
        </>
      )}

      {/* Promo Banner */}
      <div className={`${isCleanPage ? '' : 'lg:pl-14'} bg-gradient-to-r from-primary/5 via-primary/15 to-primary/5 border-b border-primary/20 overflow-hidden`}>
        <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3 relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--primary)/0.1),transparent_70%)] animate-pulse" />
          <p className="text-center text-xs sm:text-sm text-muted-foreground relative z-10">
            <Sparkles size={14} className="inline-block mr-1 sm:mr-1.5 text-primary animate-pulse" />
            <span className="text-primary font-semibold">Promoção:</span>{" "}
            <span className="hidden xs:inline">até </span>50% OFF{" "}
            <span className="hidden sm:inline">em todos os planos</span>
            <span className="inline-flex items-center gap-1 ml-1 bg-primary/20 text-primary text-[10px] sm:text-xs font-medium px-1.5 sm:px-2 py-0.5 rounded-full">
              Limitado
            </span>
          </p>
        </div>
      </div>

      {/* Content */}
      <main className={`container mx-auto px-3 sm:px-4 py-6 sm:py-12 ${isCleanPage ? '' : 'lg:pl-14'}`}>
        {/* Trial Expired Banner */}
        {isTrialExpired && (
          <div className="max-w-3xl mx-auto mb-10 animate-fade-in">
            <div className="relative overflow-hidden bg-gradient-to-br from-destructive/10 via-destructive/5 to-primary/10 border border-destructive/30 rounded-2xl p-8 text-center">
              {/* Background decoration */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-destructive/10 rounded-full blur-2xl" />
              
              <div className="relative z-10">
                <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-5">
                  <AlertTriangle size={32} className="text-destructive" />
                </div>
                
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-3">
                  Seu teste gratuito acabou
                </h2>
                
                <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
                  Obrigado por testar o Wiize! Para continuar prospectando e acessando todas as funcionalidades, 
                  escolha o plano ideal para o seu negócio.
                </p>

                {/* Promo Card */}
                <div className="inline-flex items-center gap-3 bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/30 rounded-xl px-6 py-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/20">
                    <Sparkles size={20} className="text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-primary font-bold text-sm">Promoção de Lançamento</p>
                    <p className="text-foreground font-display text-lg font-bold">Até 50% de desconto em todos os planos</p>
                    <p className="text-muted-foreground text-xs">Por tempo limitado</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="text-center mb-12 animate-fade-in">
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            {isRenewal ? (
              <>Renove seu plano <span className="text-gradient">e continue crescendo</span></>
            ) : (
              <>Escolha o plano <span className="text-gradient">ideal para você</span></>
            )}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {isRenewal
              ? "Selecione o plano desejado para renovar sua assinatura e restaurar todos os recursos."
              : "Faça upgrade do seu plano e desbloqueie mais buscas para encontrar novos clientes."}
          </p>
        </div>




        {/* Auto-checking indicator when coming from checkout */}
        {isFromCheckout && currentPlan === "free" && (
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-2 text-muted-foreground bg-muted/50 px-4 py-2 rounded-full">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm">Verificando pagamento automaticamente...</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto items-stretch">
          {plans.map((plan, index) => {
            const isCurrent = isCurrentPlan(plan.name);
            const isDowngradeOption = isDowngrade(plan.name);
            const isLoading = loadingPlan === plan.key;

            return (
              <div
                key={index}
                className={`relative rounded-2xl p-6 sm:p-8 transition-all duration-300 hover:-translate-y-2 animate-fade-in flex flex-col h-full ${
                  plan.popular
                    ? "bg-gradient-card border-2 border-primary shadow-glow"
                    : "glass"
                } ${isCurrent ? "ring-2 ring-primary/50" : ""}`}
                style={{ animationDelay: `${index * 0.15}s` }}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="flex items-center gap-1 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium whitespace-nowrap">
                      <Sparkles size={14} />
                      Mais Popular
                    </div>
                  </div>
                )}

                {isCurrent && (
                  <div className="absolute -top-4 right-4">
                    <div className="flex items-center gap-1 bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-xs font-medium">
                      <Crown size={12} />
                      Seu plano
                    </div>
                  </div>
                )}

                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="group/icon flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
                      <plan.icon className="h-5 w-5 text-primary transition-all duration-300 group-hover/icon:scale-125 group-hover/icon:rotate-12" />
                    </div>
                    <h3 className="font-display text-xl sm:text-2xl font-bold">{plan.name}</h3>
                  </div>
                  <p className="text-muted-foreground text-sm min-h-[2.5rem]">{plan.description}</p>
                </div>

                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base text-muted-foreground line-through decoration-muted-foreground/50 decoration-2">R$ {plan.anchorPrice}</span>
                    <span className="bg-primary/15 text-primary text-xs font-bold px-2 py-0.5 rounded-full">
                      -{Math.round((1 - parseInt(plan.price) / parseInt(plan.anchorPrice.replace('.', ''))) * 100)}%
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm text-muted-foreground">R$</span>
                    <span className="font-display text-4xl sm:text-5xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">/mês</span>
                  </div>
                  <p className="text-sm text-primary mt-2 font-medium">
                    Até {plan.opportunities} oportunidades/mês
                  </p>
                </div>

                <TooltipProvider delayDuration={200}>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className={`flex items-start gap-3 text-sm ${feature.disabled ? 'opacity-50' : ''}`}>
                      {feature.disabled ? (
                        <X size={18} className="text-muted-foreground flex-shrink-0 mt-0.5" />
                      ) : feature.highlight ? (
                        <Flame size={18} className="text-orange-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <Check size={18} className="text-primary flex-shrink-0 mt-0.5" />
                      )}
                      <span className={feature.highlight ? "text-foreground font-medium" : "text-muted-foreground"}>{feature.text}</span>
                      {feature.subItems && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button className="ml-auto shrink-0 text-primary hover:text-primary/80 transition-colors">
                              <Info size={15} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="max-w-[220px] p-3">
                            <ul className="space-y-1.5">
                              {feature.subItems.map((sub, j) => (
                                <li key={j} className="flex items-center gap-2 text-xs">
                                  <Flame size={10} className="text-orange-500 shrink-0" />
                                  {sub}
                                </li>
                              ))}
                            </ul>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </li>
                  ))}
                </ul>
                </TooltipProvider>

                <Button
                  variant={isCurrent ? "secondary" : plan.popular ? "hero" : "outline"}
                  size="lg"
                  className="w-full"
                  disabled={isCurrent || isDowngradeOption || isLoading}
                  onClick={() => handleUpgrade(plan.key)}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin mr-2" />
                      Processando...
                    </>
                  ) : isCurrent ? (
                    "Plano Atual"
                  ) : isDowngradeOption ? (
                    "Indisponível"
                  ) : (
                    "Fazer Upgrade"
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        {/* Guarantee Section */}
        <div className="max-w-4xl mx-auto mt-16 animate-fade-in" style={{ animationDelay: '0.5s' }}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
        </div>

        <p className="text-center text-muted-foreground mt-12 text-sm animate-fade-in" style={{ animationDelay: '0.6s' }}>
          Dúvidas? Entre em contato com nosso suporte.
        </p>
      </main>

      <PaymentMethodModal
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        planName={plans.find(p => p.key === selectedPlanKey)?.name || ""}
        planPrice={plans.find(p => p.key === selectedPlanKey)?.price || ""}
        planKey={selectedPlanKey || ""}
        onSelectCard={handleCardCheckout}
        onSelectPix={handlePixCheckout}
        loading={loadingPlan !== null}
        defaultEmail={user?.email || ""}
        defaultName={profile?.name || ""}
      />
    </div>
  );
};

export default Upgrade;
