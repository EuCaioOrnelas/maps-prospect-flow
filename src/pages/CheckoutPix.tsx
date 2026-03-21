import { useState, useEffect, useRef } from "react";
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
  const planPrice = searchParams.get("planPrice") || "";

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

  // Create subscription and redirect to AbacatePay checkout
  const handleSubscribe = async () => {
    if (!customerData || !planKey) return;
    setLoading(true);
    
    trackScoreEvent("checkout_started", { plan: planKey, method: "pix", source: "abacate_pay" });
    
    try {
      const { data, error } = await supabase.functions.invoke(
        "create-abacate-subscription",
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
        const { data } = await supabase.functions.invoke("check-abacate-pix", {
          body: { pixId },
        });
        if (data?.status === "PAID" || data?.status === "COMPLETED") {
          clearInterval(interval);
          setPaid(true);
          setCheckingPayment(false);
          toast({ title: "🎉 Pagamento confirmado!", description: "Seu plano será ativado em instantes." });
          setTimeout(() => navigate("/checkout-success?provider=abacate"), 2000);
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
        body: { couponCode: couponCode.trim() },
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
  const originalCents = parseFloat(planPrice) * 100;
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
      <main className="flex-1 container max-w-5xl mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          {/* Left — Subscribe action */}
          <motion.div
            className="flex flex-col items-center gap-6"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-center space-y-1">
              <h1 className="text-2xl font-bold text-foreground">Assinatura via PIX</h1>
              <p className="text-sm text-muted-foreground">
                PIX recorrente — débito automático mensal regulamentado pelo Banco Central
              </p>
            </div>

            {redirecting ? (
              <div className="flex flex-col items-center gap-4 py-16">
                <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
                <p className="text-muted-foreground text-sm">Redirecionando para o checkout seguro...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-6 py-8 w-full max-w-md">
                {/* Plan card */}
                <motion.div
                  className="w-full rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 p-6 space-y-4"
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                >
                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground font-medium">Plano selecionado</p>
                    <p className="text-2xl font-bold text-foreground">{planName}</p>
                    <div className="flex flex-col items-center gap-1">
                      {couponApplied && discountAmount > 0 ? (
                        <>
                          <p className="text-sm text-muted-foreground line-through">
                            R$ {planPrice}/mês
                          </p>
                          <p className="text-3xl font-bold text-foreground tabular-nums">
                            {formatCurrency(finalCents)}
                            <span className="text-base font-normal text-muted-foreground">/mês</span>
                          </p>
                        </>
                      ) : (
                        <p className="text-3xl font-bold text-foreground tabular-nums">
                          R$ {planPrice}
                          <span className="text-base font-normal text-muted-foreground">/mês</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="h-px bg-primary/10" />
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                      <span>Cobrança automática mensal via PIX</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                      <span>Cancele quando quiser, sem multa</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                      <span>Ativação instantânea após primeiro pagamento</span>
                    </div>
                  </div>
                </motion.div>

                {/* Subscribe button */}
                <Button
                  onClick={handleSubscribe}
                  size="lg"
                  disabled={loading}
                  className="w-full gap-2 h-12 text-base"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="h-5 w-5" />
                      Assinar agora — {couponApplied && discountAmount > 0 ? formatCurrency(finalCents) : `R$ ${planPrice}`}/mês
                    </>
                  )}
                </Button>

                <p className="text-[11px] text-muted-foreground text-center max-w-sm">
                  Você será redirecionado para a página segura da AbacatePay para confirmar o pagamento via PIX.
                </p>
              </div>
            )}
          </motion.div>

          {/* Right sidebar */}
          <motion.div
            className="space-y-5 lg:sticky lg:top-28 lg:self-start"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            {/* Plan summary */}
            <div className="rounded-2xl border border-border/40 bg-card p-5 space-y-4">
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
                  <span className="font-semibold text-foreground">R$ {planPrice}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Método</span>
                  <span className="font-semibold text-emerald-600 flex items-center gap-1">
                    <QrCode className="h-3.5 w-3.5" /> PIX Recorrente
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
                    {couponApplied && discountAmount > 0 ? formatCurrency(finalCents) : `R$ ${planPrice}`}
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
                    <p className="text-xs font-semibold text-foreground">PIX Recorrente regulamentado</p>
                    <p className="text-xs text-muted-foreground">Débito automático aprovado pelo Banco Central</p>
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
                <p>CNPJ: 00.000.000/0001-00</p>
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
