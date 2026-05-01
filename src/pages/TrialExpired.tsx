import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Check, X, Sparkles, Loader2, AlertTriangle, Shield, Clock, CreditCard, Rocket, TrendingUp, Building2, LogOut } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PaymentMethodModal, type CustomerData } from "@/components/checkout/PaymentMethodModal";
import { Switch } from "@/components/ui/switch";
import type { LucideIcon } from "lucide-react";

const PRICE_IDS: Record<string, Record<string, string>> = {
  monthly: {
    start: "price_1TLZi1K8CM0R6xMMDOg3MSTp",
    growth: "price_1TLZlSK8CM0R6xMMFtvROCby",
    scale: "price_1SlylcK8CM0R6xMMyHRWAd8G",
  },
  annual: {
    start: "price_1TLZkSK8CM0R6xMMwr1Ke1IX",
    growth: "price_1TLZn8K8CM0R6xMMaEz5JuVW",
    scale: "price_1SlylcK8CM0R6xMMyHRWAd8G",
  },
};

type PlanFeature = { text: string; disabled?: boolean; isNew?: boolean };

const parsePrice = (price: string) => Number(price.replace(/\./g, '').replace(',', '.'));
const formatPrice = (value: number) => {
  const rounded = Math.round(value);
  if (rounded >= 1000) return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return rounded.toString();
};

type PlanDef = {
  name: string;
  key: string;
  price: string;
  anchorPrice: string;
  opportunities: string;
  description: string;
  features: PlanFeature[];
  popular: boolean;
  icon: LucideIcon;
};

const mainPlans: Record<string, PlanDef[]> = {
  monthly: [
    {
      name: "Start", key: "start", price: "296", anchorPrice: "592", opportunities: "1.000",
      description: "Para validar e começar a gerar oportunidades",
      features: [
        { text: "Geração de mensagens com IA" },
        { text: "IA analisa cada lead e identifica oportunidades reais" },
        { text: "CRM integrado" },
        { text: "Campanhas via Meta API oficial" },
        { text: "Até 2 números WhatsApp" },
        { text: "Suporte via email" },
        { text: "Sem automação", disabled: true },
        { text: "Sem follow-up", disabled: true },
        { text: "Sem agente", disabled: true },
      ],
      popular: false, icon: Rocket,
    },
    {
      name: "Growth", key: "growth", price: "696", anchorPrice: "1.392", opportunities: "3.000",
      description: "Para escalar e converter oportunidades com IA",
      features: [
        { text: "Geração de mensagens com IA" },
        { text: "IA analisa cada lead e identifica oportunidades reais" },
        { text: "CRM integrado" },
        { text: "Campanhas via Meta API oficial" },
        { text: "Até 5 números WhatsApp" },
        { text: "Automação de atendimento" },
        { text: "Follow-up inteligente" },
        { text: "Agente de IA operacional" },
        { text: "Suporte prioritário" },
      ],
      popular: true, icon: TrendingUp,
    },
  ],
  annual: [
    {
      name: "Start", key: "start", price: "246", anchorPrice: "592", opportunities: "1.000",
      description: "Para validar e começar a gerar oportunidades",
      features: [
        { text: "Geração de mensagens com IA" },
        { text: "IA analisa cada lead e identifica oportunidades reais" },
        { text: "CRM integrado" },
        { text: "Campanhas via Meta API oficial" },
        { text: "Até 2 números WhatsApp" },
        { text: "Suporte via email" },
        { text: "Sem automação", disabled: true },
        { text: "Sem follow-up", disabled: true },
        { text: "Sem agente", disabled: true },
      ],
      popular: false, icon: Rocket,
    },
    {
      name: "Growth", key: "growth", price: "596", anchorPrice: "1.392", opportunities: "3.000",
      description: "Para escalar e converter oportunidades com IA",
      features: [
        { text: "Geração de mensagens com IA" },
        { text: "IA analisa cada lead e identifica oportunidades reais" },
        { text: "CRM integrado" },
        { text: "Campanhas via Meta API oficial" },
        { text: "Até 5 números WhatsApp" },
        { text: "Automação de atendimento" },
        { text: "Follow-up inteligente" },
        { text: "Agente de IA operacional" },
        { text: "Suporte prioritário" },
      ],
      popular: true, icon: TrendingUp,
    },
  ],
};

const TrialExpired = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile, user, refreshProfile, signOut } = useAuth();
  const { toast } = useToast();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedPlanKey, setSelectedPlanKey] = useState<string | null>(null);
  const [isAnnual, setIsAnnual] = useState(false);

  const isFromCheckout = searchParams.get("checkout") === "success" || searchParams.get("session_id");
  const couponFromUrl = searchParams.get("coupon");
  const billingKey = isAnnual ? "annual" : "monthly";
  const plans = mainPlans[billingKey];
  const currentPlan = profile?.plan || "free";

  useEffect(() => {
    const checkoutResult = searchParams.get("checkout");
    if (checkoutResult === "canceled") {
      toast({ title: "Checkout cancelado", description: "Você pode tentar novamente quando quiser.", variant: "destructive" });
    }
  }, [searchParams, toast]);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const checkSubscription = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || cancelled) return;
        const response = await supabase.functions.invoke("check-subscription");
        if (cancelled) return;
        if (response.data && !response.error) {
          if (isFromCheckout || (response.data.plan && response.data.plan !== currentPlan)) {
            await refreshProfile();
          }
          if (isFromCheckout && response.data.plan && response.data.plan !== "free") {
            toast({ title: "🎉 Plano ativado!", description: `Seu plano ${String(response.data.plan).toUpperCase()} está ativo.` });
            navigate("/dashboard", { replace: true });
          }
        }
      } catch (error) {
        console.error("[TrialExpired] Error checking subscription:", error);
      }
    };

    checkSubscription();
    if (isFromCheckout) {
      let attempts = 0;
      intervalId = setInterval(() => {
        attempts += 1;
        if (attempts >= 24) { if (intervalId) clearInterval(intervalId); return; }
        checkSubscription();
      }, 5000);
    }

    return () => { cancelled = true; if (intervalId) clearInterval(intervalId); };
  }, [refreshProfile, isFromCheckout, currentPlan, toast, navigate]);

  const handleCardCheckout = async (customerData: CustomerData) => {
    if (!selectedPlanKey) return;
    setLoadingPlan(selectedPlanKey);
    try {
      const priceId = PRICE_IDS[billingKey][selectedPlanKey];
      const response = await supabase.functions.invoke("create-checkout", {
        body: { priceId, guestEmail: user ? undefined : customerData.email, couponCode: couponFromUrl || undefined },
      });
      if (response.error) throw new Error(response.error.message);
      if (response.data?.url) window.location.href = response.data.url;
      else throw new Error("URL de checkout não recebida");
    } catch (error: any) {
      toast({ title: "Erro ao iniciar checkout", description: error.message || "Tente novamente mais tarde", variant: "destructive" });
    } finally {
      setLoadingPlan(null);
      setPaymentModalOpen(false);
    }
  };

  const handlePixCheckout = async () => {};

  const handleUpgrade = (planKey: string) => {
    setSelectedPlanKey(planKey);
    setPaymentModalOpen(true);
  };

  const selectedPlanData = plans.find(p => p.key === selectedPlanKey);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <main className="container mx-auto px-3 sm:px-4 py-8 sm:py-12">
        {/* Expired Banner */}
        <div className="max-w-3xl mx-auto mb-12 animate-fade-in">
          <div className="relative overflow-hidden bg-gradient-to-br from-destructive/10 via-destructive/5 to-primary/10 border border-destructive/30 rounded-2xl p-8 sm:p-10 text-center">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-destructive/10 rounded-full blur-2xl" />
            <div className="relative z-10">
              <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-5">
                <AlertTriangle size={32} className="text-destructive" />
              </div>
              <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3">
                Seu teste gratuito expirou
              </h1>
              <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
                Obrigado por testar a Wiize! Para continuar prospectando e acessando todas as funcionalidades,
                escolha o plano ideal para o seu negócio.
              </p>
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

        {/* Toggle */}
        <div className="text-center mb-8 sm:mb-12 animate-fade-in">
          <h2 className="font-display text-2xl sm:text-3xl font-bold mb-4">
            Escolha o plano <span className="text-gradient">ideal para você</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
            Desbloqueie todo o potencial da Wiize e continue gerando vendas no automático.
          </p>
          <div className="flex items-center justify-center gap-3 h-8">
            <span className={`text-sm font-medium transition-colors ${!isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>Mensal</span>
            <Switch checked={isAnnual} onCheckedChange={setIsAnnual} />
            <span className={`text-sm font-medium transition-colors ${isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>Anual</span>
            <span className={`bg-primary/15 text-primary text-xs font-bold px-2.5 py-1 rounded-full ml-1 transition-opacity duration-200 ${isAnnual ? 'opacity-100' : 'opacity-0'}`}>
              Economize até 30%
            </span>
          </div>
        </div>

        {isFromCheckout && (
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-2 text-muted-foreground bg-muted/50 px-4 py-2 rounded-full">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm">Verificando pagamento automaticamente...</span>
            </div>
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-5xl mx-auto items-stretch mb-8">
          {plans.map((plan, index) => {
            const isLoading = loadingPlan === plan.key;
            return (
              <div
                key={`${plan.key}-${billingKey}`}
                className={`group relative rounded-2xl p-5 sm:p-6 transition-all duration-300 hover:-translate-y-2 animate-fade-in flex flex-col h-full ${
                  plan.popular ? "bg-gradient-card border-2 border-primary shadow-glow" : "glass"
                }`}
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

                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
                      <plan.icon className="h-5 w-5 text-primary transition-all duration-300 group-hover:scale-125 group-hover:rotate-12" />
                    </div>
                    <h3 className="font-display text-xl sm:text-2xl font-bold">{plan.name}</h3>
                  </div>
                  <p className="text-muted-foreground text-xs sm:text-sm min-h-[2.5rem]">{plan.description}</p>
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
                    <span className="font-display font-bold text-4xl sm:text-5xl tabular-nums">{plan.price}</span>
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
                  disabled={isLoading}
                  onClick={() => handleUpgrade(plan.key)}
                >
                  {isLoading ? (
                    <><Loader2 size={16} className="animate-spin mr-2" />Processando...</>
                  ) : plan.popular ? (
                    "Começar a Gerar Vendas"
                  ) : (
                    "Fazer Upgrade"
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        {/* Scale */}
        <div className="max-w-5xl mx-auto mb-16">
          <div className="group rounded-2xl glass p-5 sm:p-6 transition-all duration-300 hover:-translate-y-1 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
                    <Building2 className="h-5 w-5 text-primary transition-all duration-300 group-hover:scale-125 group-hover:rotate-12" />
                  </div>
                  <h3 className="font-display font-bold text-lg md:text-xl">Enterprise</h3>
                  <span className="bg-primary text-primary-foreground text-[10px] font-bold px-2.5 py-0.5 rounded-full">🔥 SOB MEDIDA</span>
                </div>
                <p className="text-muted-foreground text-xs sm:text-sm mb-4">Um plano sob medida para a sua operação. Estrutura, volume e suporte dedicado.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    "Tudo do Growth incluso", "Estrutura 100% personalizada", "Número de oportunidades sob demanda",
                    "Fluxos e automações sob medida", "Onboarding dedicado com especialista", "Números WhatsApp ilimitados",
                  ].map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <Check size={16} className="text-primary flex-shrink-0" />
                      <span className="text-muted-foreground">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col items-center md:items-end justify-center gap-4 md:min-w-[220px] md:border-l md:border-border/40 md:pl-6">
                <div className="text-center md:text-right">
                  <p className="text-xs text-muted-foreground mb-1">Investimento</p>
                  <div className="flex items-baseline gap-1 justify-center md:justify-end">
                    <span className="font-display font-bold text-2xl md:text-3xl">Personalizado</span>
                  </div>
                  <p className="text-primary mt-1.5 text-xs font-medium">
                    Sob medida conforme a sua operação
                  </p>
                </div>
                <Button variant="outline" size="lg" className="w-full md:w-auto" onClick={() => navigate("/enterprise")}>
                  Falar com Especialista
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Trust */}
        <div className="max-w-4xl mx-auto mt-16 animate-fade-in" style={{ animationDelay: '0.5s' }}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border border-border/50">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div><p className="font-semibold text-foreground">100% Seguro</p><p className="text-sm text-muted-foreground">Pagamento certificado</p></div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border border-border/50">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <div><p className="font-semibold text-foreground">Cancele quando quiser</p><p className="text-sm text-muted-foreground">Sem fidelidade</p></div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border border-border/50">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                <CreditCard className="h-6 w-6 text-primary" />
              </div>
              <div><p className="font-semibold text-foreground">Garantia 7 dias</p><p className="text-sm text-muted-foreground">Devolução sem burocracia</p></div>
            </div>
          </div>
        </div>

        {/* Logout */}
        <div className="flex justify-center mt-10">
          <button onClick={() => signOut()} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <LogOut size={16} />
            Sair da conta
          </button>
        </div>

        <p className="text-center text-muted-foreground mt-8 text-sm">
          Dúvidas? Entre em contato com nosso suporte.
        </p>
      </main>

      <PaymentMethodModal
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        planName={selectedPlanData?.name || ""}
        planPrice={selectedPlanData?.price || ""}
        planKey={selectedPlanKey || ""}
        billingPeriod={isAnnual ? "annual" : "monthly"}
        onSelectCard={handleCardCheckout}
        onSelectPix={handlePixCheckout}
        loading={loadingPlan !== null}
        defaultEmail={user?.email || ""}
        defaultName={profile?.name || ""}
      />
    </div>
  );
};

export default TrialExpired;
