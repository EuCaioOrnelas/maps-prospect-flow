import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PaymentMethodModal, type CustomerData } from "@/components/checkout/PaymentMethodModal";
import { EmailCaptureModal } from "@/components/landing/EmailCaptureModal";
import { Logo } from "@/components/Logo";
import { motion, AnimatePresence } from "framer-motion";
import {
  Crown, Check, Sparkles, Loader2, Shield, Clock, CreditCard,
  Rocket, TrendingUp, Building2, Flame, ShieldCheck, AlertTriangle
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAutoScoreTracking } from "@/hooks/useAutoScoreTracking";

const COUPON_CODE = "FIRST50";
const TIMER_SECONDS = 10 * 60;

const PRICE_IDS = {
  start: "price_1SlykAK8CM0R6xMMOCM684rz",
  growth: "price_1SlykkK8CM0R6xMMZu7WJesV",
  scale: "price_1SlylcK8CM0R6xMMyHRWAd8G",
};

interface Plan {
  name: string;
  key: string;
  price: number;
  originalPrice: number;
  searches: string;
  whatsappNumbers: number;
  monthlyMessages: string;
  description: string;
  features: string[];
  popular: boolean;
  icon: LucideIcon;
}

const plans: Plan[] = [
  {
    name: "Start",
    key: "start",
    price: 197,
    originalPrice: 397,
    searches: "100",
    whatsappNumbers: 2,
    monthlyMessages: "10.000",
    description: "Ideal para começar a prospectar novos clientes",
    features: [
      "Até 10.000 disparos/mês",
      "Aquecimento de até 2 chips",
      "Agentes de IA Integrados",
      "Até 2 Números WhatsApp",
      "CRM integrado",
      "Até 60 leads por busca",
      "Suporte por email",
    ],
    popular: false,
    icon: Rocket,
  },
  {
    name: "Growth",
    key: "growth",
    price: 497,
    originalPrice: 997,
    searches: "500",
    whatsappNumbers: 5,
    monthlyMessages: "30.000",
    description: "Para profissionais que querem escalar resultados",
    features: [
      "Até 30.000 disparos/mês",
      "Aquecimento de até 5 chips",
      "Agentes de IA Integrados",
      "Até 5 Números WhatsApp",
      "CRM integrado",
      "Até 60 leads por busca",
      "Suporte prioritário",
    ],
    popular: true,
    icon: TrendingUp,
  },
  {
    name: "Scale",
    key: "scale",
    price: 897,
    originalPrice: 1797,
    searches: "1.200",
    whatsappNumbers: 10,
    monthlyMessages: "60.000",
    description: "Para equipes e agências com alta demanda",
    features: [
      "Até 60.000 disparos/mês",
      "Aquecimento de até 10 chips",
      "Agentes de IA Integrados",
      "Até 10 Números WhatsApp",
      "CRM integrado",
      "Até 60 leads por busca",
      "Suporte VIP",
    ],
    popular: false,
    icon: Building2,
  },
];
/** Animated number that counts from `from` to `to` */
const AnimatedPrice = ({ from, to, prefix = "R$ " }: { from: number; to: number; prefix?: string }) => {
  const [value, setValue] = useState(from);

  useEffect(() => {
    const duration = 1800;
    const startTime = performance.now();
    let raf: number;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from + (to - from) * eased));
      if (progress < 1) raf = requestAnimationFrame(animate);
    };

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [from, to]);

  return (
    <span>
      {prefix}{value}
    </span>
  );
};

const UpgradePromo = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { trackScoreEvent } = useAutoScoreTracking("upgrade_promo");

  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [selectedPlanKey, setSelectedPlanKey] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [expired, setExpired] = useState(false);
  const [animateDiscount, setAnimateDiscount] = useState(false);

  const coupon = searchParams.get("coupon");

  useEffect(() => {
    if (coupon !== COUPON_CODE) {
      navigate("/upgrade", { replace: true });
    }
  }, [coupon, navigate]);

  useEffect(() => {
    const savedStart = localStorage.getItem("promo_timer_start");
    if (savedStart) {
      const elapsed = Math.floor((Date.now() - parseInt(savedStart)) / 1000);
      const remaining = TIMER_SECONDS - elapsed;
      if (remaining <= 0) {
        setExpired(true);
        setTimeLeft(0);
        return;
      }
      setTimeLeft(remaining);
    } else {
      localStorage.setItem("promo_timer_start", Date.now().toString());
      setTimeLeft(TIMER_SECONDS);
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => setAnimateDiscount(true), 600);
    return () => clearTimeout(timeout);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const isUrgent = timeLeft <= 120 && timeLeft > 0;
  const progressPct = Math.max(0, (timeLeft / TIMER_SECONDS) * 100);

  const handleCardCheckout = async (customerData: CustomerData) => {
    if (!selectedPlanKey) return;
    setLoadingPlan(selectedPlanKey);
    try {
      const priceId = PRICE_IDS[selectedPlanKey as keyof typeof PRICE_IDS];
      const response = await supabase.functions.invoke("create-checkout", {
        body: { priceId, guestEmail: user ? undefined : customerData.email, couponCode: COUPON_CODE },
      });

      if (response.error) throw new Error(response.error.message);
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
      setPaymentModalOpen(false);
    }
  };

  const handlePixCheckout = async (_customerData: CustomerData) => {
    if (selectedPlanKey) {
      trackScoreEvent("checkout_started", { plan: selectedPlanKey, method: "pix" });
    }
  };

  const handleUpgrade = (planKey: string) => {
    setSelectedPlanKey(planKey);
    if (user) {
      setPaymentModalOpen(true);
    } else {
      setEmailModalOpen(true);
    }
  };

  const handleEmailSubmit = (email: string) => {
    if (!selectedPlanKey) return;
    // For non-logged users from email capture, go directly to Stripe with coupon
    setLoadingPlan(selectedPlanKey);
    const priceId = PRICE_IDS[selectedPlanKey as keyof typeof PRICE_IDS];
    supabase.functions.invoke("create-checkout", {
      body: { priceId, guestEmail: email, couponCode: COUPON_CODE },
    }).then(({ data, error }) => {
      if (error) throw new Error(error.message);
      if (data?.url) window.location.href = data.url;
    }).catch((err: any) => {
      toast({ title: "Erro ao iniciar checkout", description: err.message, variant: "destructive" });
    }).finally(() => {
      setLoadingPlan(null);
      setEmailModalOpen(false);
    });
  };

  if (coupon !== COUPON_CODE) return null;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background decorations */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute top-20 -left-32 w-96 h-96 rounded-full bg-primary/5 blur-3xl"
          animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-20 -right-32 w-96 h-96 rounded-full bg-primary/5 blur-3xl"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.4, 0.2, 0.4] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Sticky Timer Bar */}
      <motion.div
        className="sticky top-0 z-50 overflow-hidden"
        style={{ background: "linear-gradient(to right, hsl(25 95% 53%), hsl(15 90% 50%))" }}
        initial={{ y: -60 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", damping: 20 }}
      >
        {/* Shimmer */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
        />

        <div className="container mx-auto px-4 py-3 flex items-center justify-center gap-4 relative">
          <Flame className="h-5 w-5 text-yellow-300 shrink-0" />
          {!expired ? (
            <>
              <span className="text-white text-sm font-semibold hidden sm:inline">
                Oferta exclusiva de 50% OFF expira em:
              </span>
              <span className="text-sm text-white font-semibold sm:hidden">
                50% OFF expira em:
              </span>
              <div className="flex items-center gap-2">
                <motion.span
                  className={`font-mono text-2xl sm:text-3xl font-black text-white tabular-nums ${isUrgent ? "text-yellow-300" : ""}`}
                  animate={isUrgent ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 0.5, repeat: Infinity }}
                >
                  {formatTime(timeLeft)}
                </motion.span>
                <motion.div
                  className="shrink-0"
                  animate={{ rotate: [0, 15, -15, 15, -15, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Clock className="h-7 w-7 text-white" />
                </motion.div>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-white" />
              <span className="text-white text-sm font-bold">Oferta expirada!</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-10 pb-6 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          {/* Logo */}
          <div className="flex justify-center mb-4">
            <Logo size="lg" asLink={false} />
          </div>

          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-full px-4 py-1.5 text-sm font-semibold text-primary">
            <Sparkles className="h-4 w-4" />
            Oferta exclusiva — Válida apenas agora
          </div>

          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-black text-foreground leading-tight">
            Todos os planos com{" "}
            <motion.span
              className="inline-block text-primary"
              animate={animateDiscount ? { scale: [1, 1.15, 1] } : {}}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              50% OFF
            </motion.span>
          </h1>

          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Aproveite o desconto especial no primeiro mês. O cupom <span className="font-mono font-bold text-primary">{COUPON_CODE}</span> já está aplicado automaticamente.
          </p>
        </motion.div>
      </div>

      {/* Plans Grid */}
      <div className="container mx-auto px-4 pb-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => {
            const discountedPrice = Math.round(plan.price * 0.5);
            const savings = plan.price - discountedPrice;
            const isLoading = loadingPlan === plan.key;

            return (
              <motion.div
                key={plan.key}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.15, type: "spring", damping: 20 }}
                className={`relative rounded-2xl p-6 sm:p-8 transition-all duration-300 hover:-translate-y-2 flex flex-col h-full ${
                  plan.popular
                    ? "border-2 border-primary/60 shadow-[0_0_40px_-10px_hsl(158_72%_38%_/_0.3)] bg-gradient-to-b from-card to-primary/5"
                    : "glass border border-border/50"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <motion.div
                      className="flex items-center gap-1 text-white px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap shadow-lg"
                      style={{ background: "linear-gradient(to right, hsl(158 72% 38%), hsl(170 65% 32%))" }}
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Flame className="h-3.5 w-3.5" />
                      Mais Popular
                    </motion.div>
                  </div>
                )}

                {/* 50% OFF Badge */}
                <motion.div
                  className="absolute -top-3 -right-3 flex items-center justify-center w-14 h-14 rounded-full shadow-lg shadow-primary/30"
                  style={{ background: "linear-gradient(135deg, hsl(158 72% 38%), hsl(170 65% 28%))" }}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.5 + index * 0.1, type: "spring", damping: 12 }}
                >
                  <span className="text-white text-xs font-black leading-tight text-center">
                    50%<br />OFF
                  </span>
                </motion.div>

                <div className="mb-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
                      <plan.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-display text-xl sm:text-2xl font-bold text-foreground">{plan.name}</h3>
                  </div>
                  <p className="text-muted-foreground text-sm">{plan.description}</p>
                </div>

                {/* Pricing with animation */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base text-muted-foreground line-through decoration-orange-400 decoration-2">
                      R$ {plan.price}
                    </span>
                    <span className="bg-orange-500/15 text-orange-400 text-xs font-bold px-2 py-0.5 rounded-full">
                      -50%
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm text-muted-foreground">R$</span>
                    <motion.span
                      className="font-display text-4xl sm:text-5xl font-black text-primary"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      {animateDiscount ? (
                        <AnimatedPrice from={plan.price} to={discountedPrice} prefix="" />
                      ) : (
                        plan.price
                      )}
                    </motion.span>
                    <span className="text-muted-foreground">/mês</span>
                  </div>
                  <motion.p
                    className="text-sm text-primary font-semibold mt-1"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.2 + index * 0.1 }}
                  >
                    Você economiza R$ {savings} no 1º mês
                  </motion.p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Depois R$ {plan.price}/mês • Cancele quando quiser
                  </p>
                </div>

                <ul className="space-y-2.5 mb-8 flex-1">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm">
                      <Check size={16} className="text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Button
                    size="lg"
                    className={`w-full font-bold text-base h-12 ${
                      plan.popular
                        ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 border-0"
                        : "bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20"
                    }`}
                    disabled={isLoading || expired}
                    onClick={() => handleUpgrade(plan.key)}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 size={16} className="animate-spin mr-2" />
                        Processando...
                      </>
                    ) : expired ? (
                      "Promoção encerrada"
                    ) : (
                      <>
                        <Crown className="h-4 w-4 mr-2" />
                        Assinar com 50% OFF
                      </>
                    )}
                  </Button>
                </motion.div>
              </motion.div>
            );
          })}
        </div>

        {/* Trust Signals */}
        <motion.div
          className="max-w-3xl mx-auto mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          {[
            { icon: Shield, title: "100% Seguro", desc: "Pagamento via Stripe" },
            { icon: Clock, title: "Cancele quando quiser", desc: "Sem fidelidade" },
            { icon: CreditCard, title: "Garantia 7 dias", desc: "Devolução sem burocracia" },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-center gap-3 p-4 rounded-xl bg-muted/30 border border-border/50">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 shrink-0">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">{title}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Trust badges */}
        <motion.div
          className="flex flex-col items-center gap-2 mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          {[
            "Cupom FIRST50 aplicado automaticamente",
            "Recursos PRO liberados instantaneamente",
            "Seus dados e campanhas continuam ativos",
          ].map((text) => (
            <div key={text} className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="text-xs text-muted-foreground">{text}</span>
            </div>
          ))}
        </motion.div>

        <p className="text-center text-muted-foreground mt-10 text-sm">
          Dúvidas? Entre em{" "}
          <button onClick={() => navigate("/contato")} className="text-primary hover:underline">
            contato com nosso suporte
          </button>.
        </p>
      </div>

      <PaymentMethodModal
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        planName={plans.find((p) => p.key === selectedPlanKey)?.name || ""}
        planPrice={selectedPlanKey ? String(plans.find((p) => p.key === selectedPlanKey)?.price || "") : ""}
        planKey={selectedPlanKey || ""}
        onSelectCard={handleCardCheckout}
        onSelectPix={handlePixCheckout}
        loading={loadingPlan !== null}
        defaultEmail={user?.email || ""}
        defaultName={profile?.name || ""}
      />

      <EmailCaptureModal
        open={emailModalOpen}
        onOpenChange={setEmailModalOpen}
        onSubmit={handleEmailSubmit}
        loading={loadingPlan !== null}
        planName={plans.find((p) => p.key === selectedPlanKey)?.name || ""}
      />
    </div>
  );
};

export default UpgradePromo;
