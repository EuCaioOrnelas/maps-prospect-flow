import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

import { useAuth } from "@/contexts/AuthContext";
import { useUserScoreTracking } from "@/hooks/useUserScoreTracking";
import { Logo } from "@/components/Logo";
import { Input } from "@/components/ui/input";
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
  CreditCard,
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
  const billingPeriod = searchParams.get("billing") || "monthly";

  // Auto-resolve price from plan key when not provided (e.g. renewal links)
  const PLAN_PRICES: Record<string, Record<string, string>> = {
    monthly: { start: "296", growth: "696", scale: "897" },
    annual: { start: "2952", growth: "7152", scale: "897" },
  };
  const planPrice = planPriceParam || PLAN_PRICES[billingPeriod]?.[planKey] || PLAN_PRICES.monthly[planKey] || "";

  const isRenewal = searchParams.get("renewal") === "true";
  const renewalEmail = searchParams.get("email") || "";
  const renewalName = searchParams.get("name") || "";

  const [customerData, setCustomerData] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState<{ brCode: string; brCodeBase64: string; amount: number; expiresAt: string; pixId: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [paid, setPaid] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Expiration timer (1 hour from QR generation)
  useEffect(() => {
    if (!pixData || paid) return;
    const expirationMs = 60 * 60 * 1000; // 1 hour
    const createdAt = Date.now();
    const expiresAt = createdAt + expirationMs;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        toast({ title: "QR Code expirado", description: "Gere um novo QR Code para continuar.", variant: "destructive" });
        setPixData(null);
        setCheckingPayment(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [pixData, paid]);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

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
      const body: any = { planKey, customerData, billingPeriod };
      const { data, error } = await supabase.functions.invoke(
        "create-asaas-subscription",
        { body }
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

  if (!customerData) return null;

  // Compute display prices
  const cleanPrice = planPrice.replace(",", ".");
  const originalCents = Math.round(parseFloat(cleanPrice) * 100);

  return (
    <div className="landing-light min-h-screen bg-background text-foreground flex flex-col">
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
                  {/* Expiration timer — above QR */}
                  {timeLeft !== null && (
                    <div className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold",
                      timeLeft > 300 ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive animate-pulse"
                    )}>
                      <Timer className="h-4 w-4" />
                      <span>Expira em {formatTimer(timeLeft)}</span>
                    </div>
                  )}

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

                  {/* PIX Copia e Cola — single line overflow */}
                  {pixData.brCode && (
                    <div className="w-full max-w-sm">
                      <p className="text-xs font-semibold text-foreground mb-1.5 text-center">PIX Copia e Cola</p>
                      <div 
                        onClick={handleCopyCode}
                        className="flex items-center gap-2 rounded-xl border border-border/40 bg-muted/50 px-3 py-2.5 cursor-pointer hover:bg-muted/70 transition-colors group"
                      >
                        <p className="flex-1 text-xs text-muted-foreground font-mono truncate overflow-hidden whitespace-nowrap">
                          {pixData.brCode}
                        </p>
                        <button className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors">
                          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                          {copied ? "Copiado!" : "Copiar"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Status */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span>Aguardando pagamento...</span>
                  </div>

                  <div className="rounded-xl border border-border/30 bg-muted/30 p-3 text-center max-w-sm">
                    <p className="text-[11px] text-muted-foreground">
                      Escaneie o QR Code ou cole o código no app do seu banco. Ao pagar, você <strong>autoriza a cobrança automática mensal</strong>. Cancele quando quiser pelo seu perfil.
                    </p>
                  </div>
                </div>
              )
            ) : (
              <div className="flex flex-col items-center gap-6 py-8 w-full max-w-md">
                <div className="text-center space-y-2">
                  <h1 className="text-2xl font-bold text-foreground">Pagamento via PIX Recorrente</h1>
                  <p className="text-sm text-muted-foreground">
                    O PIX funciona no formato de <strong>débito automático</strong>. Ao pagar, você autoriza a cobrança recorrente mensal.
                  </p>
                  <p className="text-xs text-muted-foreground/80">
                    Cancele quando quiser, sem multa ou fidelidade.
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

                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-center max-w-sm">
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium mb-1 flex items-center justify-center gap-1">
                    ⚡ PIX Recorrente (Débito Automático)
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Ao escanear o QR Code, você autoriza a cobrança automática mensal via PIX. O valor será debitado todo mês. Você pode cancelar a qualquer momento pelo seu perfil.
                  </p>
                </div>
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
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-foreground">Total</span>
                  <span className="font-bold text-lg text-foreground">
                    {formatCurrency(originalCents)}
                  </span>
                </div>
              </div>
            </div>

            {/* Coupon notice — only for credit card */}
            <div className="rounded-2xl border border-border/40 bg-muted/30 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-semibold text-foreground">Cupom de desconto</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Cupons de desconto estão disponíveis apenas para pagamentos via <strong>Cartão de Crédito</strong>. Se você possui um cupom, volte e selecione o método de pagamento por cartão.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => navigate("/upgrade")}
              >
                <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                Pagar com Cartão de Crédito
              </Button>
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
                    <p className="text-xs font-semibold text-foreground">Débito automático via PIX</p>
                    <p className="text-xs text-muted-foreground">Renovação mensal automática. Cancele quando quiser.</p>
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
                  Pagamentos processados por <span className="font-semibold">Asaas</span> — intermediadora regulamentada pelo Banco Central
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
              <button onClick={() => navigate("/terms")} className="hover:text-foreground transition-colors">
                Termos de uso
              </button>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2 mt-4">
            <p className="text-[10px] text-muted-foreground/60">
              Pagamentos processados com segurança por{" "}
              <a href="https://www.asaas.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-muted-foreground/80 hover:text-foreground transition-colors">
                Asaas
              </a>
              {" "}• Instituição de pagamento regulamentada pelo Banco Central
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
