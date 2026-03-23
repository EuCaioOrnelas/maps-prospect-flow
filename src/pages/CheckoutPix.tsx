import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useUserScoreTracking } from "@/hooks/useUserScoreTracking";
import { Logo } from "@/components/Logo";
import {
  QrCode,
  Copy,
  Check,
  Clock,
  Shield,
  ArrowLeft,
  Tag,
  Loader2,
  Zap,
  PartyPopper,
  Lock,
  BadgeCheck,
  Timer,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type { CustomerData } from "@/components/checkout/PaymentMethodModal";

function formatCurrency(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function CheckoutPix() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { trackScoreEvent } = useUserScoreTracking();

  const planKey = searchParams.get("plan") || "";
  const planName = searchParams.get("planName") || "";
  const planPriceParam = searchParams.get("planPrice") || "";

  // Auto-resolve price from plan key when not provided (e.g. renewal links)
  const PLAN_PRICES: Record<string, string> = {
    start: "197",
    growth: "497",
    scale: "897",
  };
  const planPrice = planPriceParam || PLAN_PRICES[planKey] || "";

  const isRenewal = searchParams.get("renewal") === "true";
  const renewalEmail = searchParams.get("email") || "";
  const renewalName = searchParams.get("name") || "";

  const [customerData, setCustomerData] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponValidating, setCouponValidating] = useState(false);
  const [couponDiscount, setCouponDiscount] = useState<{ discountKind: string; discount: number; code: string } | null>(null);
  const [couponError, setCouponError] = useState("");
  const [pixData, setPixData] = useState<{ brCode: string; brCodeBase64: string; amount: number; expiresAt: string; pixId: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [paid, setPaid] = useState(false);

  // Load customer data from sessionStorage or query params (renewal)
  useEffect(() => {
    if (isRenewal && renewalEmail && planKey) {
      // Renewal flow: data comes from URL params, no login needed
      setCustomerData({
        name: renewalName || "Cliente",
        email: renewalEmail,
        phone: "",
        taxId: "",
      } as CustomerData);
    } else {
      const stored = sessionStorage.getItem("pixCustomerData");
      if (stored) {
        try {
          setCustomerData(JSON.parse(stored));
        } catch {
          navigate("/upgrade");
        }
      } else {
        navigate("/upgrade");
      }
    }
  }, [navigate, isRenewal, renewalEmail, renewalName, planKey]);

  // Create subscription via Asaas
  const handleSubscribe = async () => {
    if (!customerData || !planKey) return;
    setLoading(true);
    
    trackScoreEvent("checkout_started", { plan: planKey, method: "pix", source: "asaas" });
    
    try {
      const { data, error } = await supabase.functions.invoke(
        "create-asaas-subscription",
        {
          body: { planKey, customerData, couponCode: couponApplied ? couponCode : undefined },
        }
      );
      if (error) throw new Error(error.message);
      if (!data?.brCode) throw new Error("QR Code não gerado");

      setPixData({
        brCode: data.brCode,
        brCodeBase64: data.brCodeBase64,
        amount: data.amount,
        expiresAt: data.expiresAt,
        pixId: data.pixId,
      });

      // Start polling for payment
      startPaymentPolling(data.pixId);
    } catch (err: any) {
      toast({
        title: "Erro ao criar assinatura",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const startPaymentPolling = (pixId: string) => {
    setCheckingPayment(true);
    const interval = setInterval(async () => {
      try {
        const { data } = await supabase.functions.invoke("check-asaas-payment", {
          body: { pixId },
        });
        if (data?.status === "PAID" || data?.status === "CONFIRMED" || data?.status === "RECEIVED") {
          clearInterval(interval);
          setPaid(true);
          setCheckingPayment(false);
          trackScoreEvent("checkout_completed", { plan: planKey, method: "pix", source: "asaas", renewal: isRenewal });
          toast({ title: "🎉 Pagamento confirmado!", description: "Seu plano será ativado em instantes." });
          if (isRenewal) {
            setTimeout(() => navigate(`/renewal-success?email=${encodeURIComponent(renewalEmail)}&plan=${encodeURIComponent(planKey)}`), 2000);
          } else {
            setTimeout(() => navigate("/checkout-success?provider=asaas"), 2000);
          }
        }
      } catch {
        // Silent fail on polling
      }
    }, 5000);

    // Stop polling after 30 minutes
    setTimeout(() => {
      clearInterval(interval);
      setCheckingPayment(false);
    }, 30 * 60 * 1000);
  };

  const handleCopyCode = () => {
    if (pixData?.brCode) {
      navigator.clipboard.writeText(pixData.brCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Código copiado!", description: "Cole no app do seu banco para pagar." });
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponValidating(true);
    setCouponError("");
    try {
      const { data, error } = await supabase.functions.invoke("validate-abacate-coupon", {
        body: { couponCode: couponCode.trim(), email: customerData?.email },
      });
      if (error) throw new Error(error.message);
      if (data?.valid) {
        setCouponDiscount({ discountKind: data.discountKind, discount: data.discount, code: data.code });
        setCouponApplied(true);
      } else {
        setCouponError(data?.error || "Cupom inválido");
      }
    } catch {
      setCouponError("Erro ao validar cupom");
    } finally {
      setCouponValidating(false);
    }
  };

  if (!customerData) return null;

  // Compute display prices
  const cleanPrice = planPrice.replace(",", ".");
  const originalCents = Math.round(parseFloat(cleanPrice) * 100);
  let discountAmount = 0;
  if (couponApplied && couponDiscount) {
    if (couponDiscount.discountKind === "PERCENTAGE") {
      const pct = couponDiscount.discount / 100;
      discountAmount = Math.round(originalCents * pct / 100);
    } else {
      discountAmount = couponDiscount.discount;
    }
  }
  const finalCents = Math.max(100, originalCents - discountAmount);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/40 bg-card/90 backdrop-blur-md sticky top-0 z-20">
        <div className="container max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted transition-colors active:scale-95"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <Logo size="sm" asLink={false} />
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5 text-emerald-500" />
            <span className="hidden sm:inline font-medium">Checkout Seguro</span>
          </div>
        </div>
      </header>

      {/* Progress steps */}
      <div className="border-b border-border/20 bg-muted/30">
        <div className="container max-w-5xl mx-auto px-4 py-2.5">
          <div className="flex items-center justify-center gap-2 text-xs">
            <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
              <Check className="h-3.5 w-3.5" /> Dados
            </span>
            <div className="w-8 h-px bg-emerald-500" />
            <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
              <Check className="h-3.5 w-3.5" /> Método
            </span>
            <div className="w-8 h-px bg-primary" />
            <span className="flex items-center gap-1.5 font-medium text-primary">
              <span className="h-4 w-4 rounded-full border-2 border-primary flex items-center justify-center text-[10px] font-bold">3</span>
              Pagamento
            </span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 container max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="grid gap-6 sm:gap-8 lg:grid-cols-[1fr_380px]">
          {/* Left — Subscribe action */}
          <motion.div
            className="flex flex-col items-center gap-6"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {pixData ? (
              paid ? (
                <motion.div
                  className="flex flex-col items-center gap-5 py-12"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                >
                  {/* Animated success rings */}
                  <div className="relative">
                    <motion.div
                      className="absolute inset-0 rounded-full bg-emerald-500/20"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 2.5, opacity: 0 }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                    />
                    <motion.div
                      className="absolute inset-0 rounded-full bg-emerald-500/15"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 2, opacity: 0 }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut", delay: 0.3 }}
                    />
                    <motion.div
                      className="relative h-24 w-24 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                    >
                      <motion.div
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                      >
                        <Check className="h-12 w-12 text-white stroke-[3]" />
                      </motion.div>
                    </motion.div>
                  </div>

                  <motion.div
                    className="text-center space-y-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <h2 className="text-2xl font-bold text-foreground">Pagamento confirmado!</h2>
                    <p className="text-muted-foreground text-sm">Seu plano <span className="font-semibold text-emerald-600">{planName}</span> está sendo ativado</p>
                  </motion.div>

                  <motion.div
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                  >
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                    <span>Redirecionando...</span>
                  </motion.div>
                </motion.div>
              ) : (
                <div className="flex flex-col items-center gap-4 sm:gap-5 py-2 sm:py-4 w-full max-w-md">
                  {/* QR Code */}
                  <div className="rounded-2xl bg-white p-3 sm:p-4 shadow-sm border border-border/30">
                    {pixData.brCodeBase64 ? (
                      <img src={pixData.brCodeBase64.startsWith("data:") ? pixData.brCodeBase64 : `data:image/png;base64,${pixData.brCodeBase64}`} alt="QR Code PIX" className="w-44 h-44 sm:w-56 sm:h-56" />
                    ) : (
                      <div className="w-44 h-44 sm:w-56 sm:h-56 flex items-center justify-center">
                        <QrCode className="h-20 w-20 sm:h-24 sm:w-24 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>

                  <p className="text-2xl sm:text-3xl font-bold text-foreground tabular-nums">
                    {formatCurrency(pixData.amount)}
                    <span className="text-sm sm:text-base font-normal text-muted-foreground">/mês</span>
                  </p>

                  {/* Copy code */}
                  <Button variant="outline" onClick={handleCopyCode} className="w-full max-w-xs gap-2">
                    {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                    {copied ? "Código copiado!" : "Copiar código PIX"}
                  </Button>

                  {/* Status */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span>Aguardando pagamento...</span>
                  </div>


                  <p className="text-[11px] text-muted-foreground text-center max-w-sm">
                    Escaneie o QR Code ou cole o código no app do seu banco. O pagamento será confirmado automaticamente.
                  </p>
                </div>
              )
            ) : (
              <div className="flex flex-col items-center gap-6 py-8 w-full max-w-md">
                <div className="text-center space-y-1">
                  <h1 className="text-2xl font-bold text-foreground">Pagamento via PIX</h1>
                  <p className="text-sm text-muted-foreground">
                    Gere o QR Code para pagar. Renovação mensal via novo PIX.
                  </p>
                </div>

                {/* Generate PIX button */}
                <Button
                  onClick={handleSubscribe}
                  size="lg"
                  disabled={loading}
                  className="w-full gap-2 h-12 text-base"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Gerando QR Code...
                    </>
                  ) : (
                    <>
                      <QrCode className="h-5 w-5" />
                      Gerar QR Code PIX
                    </>
                  )}
                </Button>

                <p className="text-[11px] text-muted-foreground text-center max-w-sm">
                  O QR Code será gerado para pagamento imediato. Após a confirmação, seu plano será ativado instantaneamente.
                </p>
              </div>
            )}
          </motion.div>

          {/* Right sidebar */}
          <motion.div
            className="space-y-4 sm:space-y-5 lg:sticky lg:top-28 lg:self-start order-first lg:order-last"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            {/* Plan summary */}
            <div className="rounded-2xl border border-border/40 bg-card p-4 sm:p-5 space-y-3 sm:space-y-4">
              <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-primary" />
                Resumo do pedido
              </p>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Plano</span>
                  <span className="font-semibold text-foreground">{planName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Valor mensal</span>
                  <span className="font-semibold text-foreground">{formatCurrency(originalCents)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Método</span>
                  <span className="font-semibold text-emerald-600 flex items-center gap-1">
                    <QrCode className="h-3.5 w-3.5" /> PIX
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-medium text-foreground text-xs truncate max-w-[180px]">{customerData?.email}</span>
                </div>
                <div className="h-px bg-border/50" />
                {couponApplied && couponDiscount && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-emerald-600 text-xs font-medium">Cupom {couponDiscount.code}</span>
                      <span className="text-emerald-600 text-xs font-medium">
                        {couponDiscount.discountKind === "PERCENTAGE" ? `${couponDiscount.discount / 100}%` : `R$ ${(couponDiscount.discount / 100).toFixed(2)}`}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-xs">Desconto</span>
                      <span className="text-emerald-600 text-xs font-medium">
                        -R$ {(discountAmount / 100).toFixed(2)}
                      </span>
                    </div>
                  </>
                )}
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-foreground">Total</span>
                  <span className="font-bold text-lg text-foreground">
                    {couponApplied && discountAmount > 0 ? formatCurrency(finalCents) : formatCurrency(originalCents)}
                  </span>
                </div>
              </div>
            </div>

            {/* Coupon */}
            <div className="rounded-2xl border border-border/40 bg-card p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Tag className="h-4 w-4 text-primary" />
                Cupom de desconto
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Código do cupom"
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value.toUpperCase());
                    if (!couponApplied) setCouponError("");
                  }}
                  disabled={couponApplied || couponValidating}
                  className="text-sm h-9"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleApplyCoupon}
                  disabled={!couponCode.trim() || couponApplied || couponValidating}
                  className="shrink-0 h-9"
                >
                  {couponValidating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : couponApplied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    "Aplicar"
                  )}
                </Button>
              </div>
              {couponApplied && couponDiscount && (
                <p className="text-xs text-emerald-600 font-medium">
                  ✓ Cupom aplicado com sucesso!
                </p>
              )}
              {couponError && (
                <p className="text-xs text-destructive font-medium">
                  ✗ {couponError}
                </p>
              )}
            </div>

            {/* Security badges */}
            <div className="rounded-2xl border border-border/40 bg-card p-5 space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <p className="text-sm font-semibold text-foreground">Compra segura</p>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <Lock className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">Criptografia de ponta a ponta</p>
                    <p className="text-xs text-muted-foreground">Dados protegidos com SSL 256-bit</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <Shield className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">PIX</p>
                    <p className="text-xs text-muted-foreground">Renovação mensal com envio de novo PIX</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <BadgeCheck className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">Ativação instantânea</p>
                    <p className="text-xs text-muted-foreground">Plano ativo imediatamente após pagamento</p>
                  </div>
                </div>
                <div className="h-px bg-border/30 my-1" />
                <p className="text-[10px] text-muted-foreground/70">
                  Pagamentos processados por <span className="font-semibold">AbacatePay</span> — intermediadora regulamentada
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/30 bg-muted/20 mt-auto">
        <div className="container max-w-5xl mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Logo size="sm" asLink={false} showText={false} />
              <div className="text-xs text-muted-foreground">
                <p className="font-medium text-foreground/80">Wiize Tecnologia</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Shield className="h-3 w-3 text-emerald-500" />
                <span>SSL Seguro</span>
              </div>
              <div className="h-3 w-px bg-border" />
              <div className="flex items-center gap-1.5">
                <Lock className="h-3 w-3 text-emerald-500" />
                <span>Dados protegidos</span>
              </div>
              <div className="h-3 w-px bg-border" />
              <button onClick={() => navigate("/termos")} className="hover:text-foreground transition-colors">
                Termos de uso
              </button>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2 mt-4">
            <p className="text-[10px] text-muted-foreground/60">
              Pagamentos processados com segurança por{" "}
              <a href="https://abacatepay.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-muted-foreground/80 hover:text-foreground transition-colors">
                AbacatePay
              </a>
              {" "}• Intermediadora de pagamentos regulamentada
            </p>
            <p className="text-[10px] text-muted-foreground/60">
              © {new Date().getFullYear()} Wiize. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
