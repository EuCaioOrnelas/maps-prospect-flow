import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Crown, Loader2, Settings, AlertTriangle, Shield, Clock, CreditCard } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { EmailCaptureModal } from "@/components/landing/EmailCaptureModal";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";

const PRICE_IDS = {
  start: "price_1SlykAK8CM0R6xMMOCM684rz",
  growth: "price_1SlykkK8CM0R6xMMZu7WJesV",
  scale: "price_1SlylcK8CM0R6xMMyHRWAd8G",
};

const plans = [
  {
    name: "Start",
    key: "start",
    price: "197",
    anchorPrice: "397",
    searches: "100",
    whatsappNumbers: 2,
    monthlyMessages: "10.000",
    description: "Ideal para começar a prospectar novos clientes",
    features: [
      "Até 100 buscas estratégicas/mês",
      "Até 50 leads por busca",
      "Download em Excel",
      "Dados completos dos leads",
      "Suporte por email",
      "2 números WhatsApp",
      "Até 10.000 disparos/mês",
    ],
    popular: false,
  },
  {
    name: "Growth",
    key: "growth",
    price: "497",
    anchorPrice: "997",
    searches: "500",
    whatsappNumbers: 5,
    monthlyMessages: "30.000",
    description: "Para profissionais que querem escalar resultados",
    features: [
      "Até 500 buscas estratégicas/mês",
      "Até 50 leads por busca",
      "Download em Excel",
      "Dados completos dos leads",
      "Suporte prioritário",
      "Relatório de uso mensal",
      "5 números WhatsApp",
      "Até 30.000 disparos/mês",
    ],
    popular: true,
  },
  {
    name: "Scale",
    key: "scale",
    price: "897",
    anchorPrice: "1.797",
    searches: "1.200",
    whatsappNumbers: 10,
    monthlyMessages: "60.000",
    description: "Para equipes e agências com alta demanda",
    features: [
      "Até 1.200 buscas estratégicas/mês",
      "Até 50 leads por busca",
      "Download em Excel",
      "Dados completos dos leads",
      "Suporte VIP",
      "Relatório de uso mensal",
      "API access (em breve)",
      "10 números WhatsApp",
      "Até 60.000 disparos/mês",
    ],
    popular: false,
  },
];

const Upgrade = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile, user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [loadingRefresh, setLoadingRefresh] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [selectedPlanKey, setSelectedPlanKey] = useState<string | null>(null);

  const currentPlan = profile?.plan || "free";
  const isTrialExpired = searchParams.get("expired") === "true";

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

  // Check subscription status on mount and after checkout success
  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const response = await supabase.functions.invoke("check-subscription");
        if (response.data && !response.error) {
          await refreshProfile();
        }
      } catch (error) {
        console.error("Error checking subscription:", error);
      }
    };

    checkSubscription();
  }, [refreshProfile]);

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

  const handleUpgrade = (planKey: string) => {
    if (user) {
      // User is logged in, go directly to checkout
      handleCheckout(planKey);
    } else {
      // User is not logged in, show email modal
      setSelectedPlanKey(planKey);
      setEmailModalOpen(true);
    }
  };

  const handleEmailSubmit = (email: string) => {
    if (selectedPlanKey) {
      handleCheckout(selectedPlanKey, email);
    }
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

  // Force refresh subscription status
  const handleRefreshSubscription = async () => {
    setLoadingRefresh(true);
    
    try {
      const response = await supabase.functions.invoke("check-subscription");
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      await refreshProfile();
      
      if (response.data?.plan && response.data.plan !== "free") {
        toast({
          title: "Plano atualizado!",
          description: `Seu plano ${response.data.plan.toUpperCase()} está ativo. Aproveite!`,
        });
      } else {
        toast({
          title: "Status verificado",
          description: "Nenhuma assinatura ativa encontrada.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Refresh error:", error);
      toast({
        title: "Erro ao verificar",
        description: error.message || "Tente novamente mais tarde",
        variant: "destructive",
      });
    } finally {
      setLoadingRefresh(false);
    }
  };

  const hasPaidPlan = currentPlan !== "free";

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Sidebar - Desktop only */}
      <AppSidebar profile={profile} />

      {/* Header */}
      <AppHeader profile={profile} />

      {/* Promo Banner */}
      <div className="lg:pl-14 bg-gradient-to-r from-primary/5 via-primary/15 to-primary/5 border-b border-primary/20 overflow-hidden">
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
      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-12 lg:pl-20">
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
                  Obrigado por testar o WiizeProspect! Para continuar prospectando e acessando todas as funcionalidades, 
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
            Escolha o plano <span className="text-gradient">ideal para você</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Faça upgrade do seu plano e desbloqueie mais buscas para encontrar novos clientes.
          </p>
        </div>

        {/* Manage Subscription Button for paid users OR Refresh button for anyone */}
        <div className="flex justify-center gap-4 mb-8">
          {hasPaidPlan && (
            <Button
              variant="outline"
              onClick={handleManageSubscription}
              disabled={loadingPortal}
              className="gap-2"
            >
              {loadingPortal ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Settings size={16} />
              )}
              Gerenciar Assinatura
            </Button>
          )}
          
          {/* Button to check/refresh subscription status */}
          <Button
            variant="ghost"
            onClick={handleRefreshSubscription}
            disabled={loadingRefresh}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            {loadingRefresh ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <CreditCard size={16} />
            )}
            {loadingRefresh ? "Verificando..." : "Já comprei, verificar meu plano"}
          </Button>
        </div>

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
                  <h3 className="font-display text-xl sm:text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-muted-foreground text-sm">{plan.description}</p>
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
                  <p className="text-sm text-primary mt-2">
                    Até {plan.searches} buscas estratégicas
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

      <EmailCaptureModal
        open={emailModalOpen}
        onOpenChange={setEmailModalOpen}
        onSubmit={handleEmailSubmit}
        loading={loadingPlan !== null}
        planName={plans.find(p => p.key === selectedPlanKey)?.name || ""}
      />
    </div>
  );
};

export default Upgrade;
