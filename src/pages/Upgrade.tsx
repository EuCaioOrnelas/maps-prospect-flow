import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, ArrowLeft, Crown, Loader2, Settings } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
    searches: "100",
    whatsappNumbers: 1,
    description: "Ideal para começar a prospectar novos clientes",
    features: [
      "Até 100 buscas estratégicas/mês",
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
    searches: "500",
    whatsappNumbers: 2,
    description: "Para profissionais que querem escalar resultados",
    features: [
      "Até 500 buscas estratégicas/mês",
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
    whatsappNumbers: 5,
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

const Upgrade = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);

  const currentPlan = profile?.plan || "free";

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

  const handleUpgrade = async (planKey: string) => {
    setLoadingPlan(planKey);
    
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

      const priceId = PRICE_IDS[planKey as keyof typeof PRICE_IDS];
      
      const response = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
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

  const hasPaidPlan = currentPlan !== "free";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate("/dashboard")}
              className="gap-2"
            >
              <ArrowLeft size={18} />
              <span className="hidden sm:inline">Voltar</span>
            </Button>
            
            <Link to="/">
              <Logo size="md" />
            </Link>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Crown size={16} className="text-primary" />
              <span className="hidden sm:inline">Plano:</span>
              <span className="font-medium text-foreground capitalize">{currentPlan}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Promo Banner */}
      <div className="bg-gradient-to-r from-primary/5 via-primary/15 to-primary/5 border-b border-primary/20 overflow-hidden">
        <div className="container mx-auto px-4 py-3 relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--primary)/0.1),transparent_70%)] animate-pulse" />
          <p className="text-center text-xs sm:text-sm text-muted-foreground relative z-10">
            <Sparkles size={14} className="inline-block mr-1.5 text-primary animate-pulse" />
            <span className="text-primary font-semibold">Promoção de Lançamento:</span>{" "}
            até 50% de desconto em todos os planos{" "}
            <span className="inline-flex items-center gap-1 ml-1 bg-primary/20 text-primary text-xs font-medium px-2 py-0.5 rounded-full">
              Por tempo limitado
            </span>
          </p>
        </div>
      </div>

      {/* Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            Escolha o plano <span className="text-gradient">ideal para você</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Faça upgrade do seu plano e desbloqueie mais buscas para encontrar novos clientes.
          </p>
        </div>

        {/* Manage Subscription Button for paid users */}
        {hasPaidPlan && (
          <div className="flex justify-center mb-8">
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
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => {
            const isCurrent = isCurrentPlan(plan.name);
            const isDowngradeOption = isDowngrade(plan.name);
            const isLoading = loadingPlan === plan.key;

            return (
              <div
                key={index}
                className={`relative rounded-2xl p-6 sm:p-8 transition-all duration-300 hover:-translate-y-2 animate-fade-in ${
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
                      -{Math.round((1 - parseInt(plan.price) / parseInt(plan.anchorPrice)) * 100)}%
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

        <p className="text-center text-muted-foreground mt-12 text-sm animate-fade-in" style={{ animationDelay: '0.5s' }}>
          Dúvidas? Entre em contato com nosso suporte.
        </p>
      </main>
    </div>
  );
};

export default Upgrade;
