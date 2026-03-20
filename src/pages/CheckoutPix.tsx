import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type { CustomerData } from "@/components/checkout/PaymentMethodModal";

interface PixData {
  pixId: string;
  brCode: string;
  brCodeBase64: string;
  amount: number;
  expiresAt: string;
}

function formatCurrency(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function getTimeRemaining(expiresAt: string) {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Expirado";
  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function CheckoutPix() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const planKey = searchParams.get("plan") || "";
  const planName = searchParams.get("planName") || "";
  const planPrice = searchParams.get("planPrice") || "";

  const [customerData, setCustomerData] = useState<CustomerData | null>(null);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [pixLoading, setPixLoading] = useState(false);
  const [pixStatus, setPixStatus] = useState<string>("PENDING");
  const [copied, setCopied] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load customer data from sessionStorage (no auth required)
  useEffect(() => {
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
  }, [navigate]);

  // Generate PIX QR Code
  useEffect(() => {
    if (!customerData || !planKey || pixData) return;

    const generatePix = async () => {
      setPixLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke(
          "create-abacate-pix",
          {
            body: { planKey, customerData, couponCode: couponCode || undefined },
          }
        );
        if (error) throw new Error(error.message);
        if (!data?.brCode) throw new Error("QR Code não gerado");
        setPixData(data);
        setPixStatus("PENDING");
      } catch (err: any) {
        toast({
          title: "Erro ao gerar PIX",
          description: err.message,
          variant: "destructive",
        });
      } finally {
        setPixLoading(false);
      }
    };

    generatePix();
  }, [customerData, planKey]);

  // Countdown timer
  useEffect(() => {
    if (!pixData?.expiresAt || pixStatus === "PAID") return;
    const update = () => setTimeRemaining(getTimeRemaining(pixData.expiresAt));
    update();
    timerRef.current = setInterval(update, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [pixData, pixStatus]);

  // Poll for payment status
  useEffect(() => {
    if (!pixData || pixStatus === "PAID") return;

    const checkStatus = async () => {
      try {
        const { data, error } = await supabase.functions.invoke(
          "check-abacate-pix",
          { body: { pixId: pixData.pixId } }
        );
        if (!error && data?.status) {
          setPixStatus(data.status);
          if (data.status === "PAID") {
            if (pollRef.current) clearInterval(pollRef.current);
            toast({
              title: "Pagamento confirmado! 🎉",
              description: "Seu plano foi ativado com sucesso.",
            });
            setTimeout(() => {
              sessionStorage.removeItem("pixCustomerData");
              navigate("/checkout-success?provider=abacate");
            }, 2500);
          }
        }
      } catch {
        // silent
      }
    };

    checkStatus();
    pollRef.current = setInterval(checkStatus, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [pixData, pixStatus, navigate]);

  const handleCopyCode = async () => {
    if (!pixData?.brCode) return;
    try {
      await navigator.clipboard.writeText(pixData.brCode);
      setCopied(true);
      toast({ title: "Código PIX copiado!" });
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast({ title: "Erro ao copiar", variant: "destructive" });
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponApplied(true);
    setPixData(null);
    toast({ title: "Cupom aplicado!", description: "Gerando novo QR Code com desconto..." });
  };

  const handleSimulatePayment = async () => {
    if (!pixData) return;
    try {
      const { data, error } = await supabase.functions.invoke(
        "simulate-abacate-pix",
        { body: { pixId: pixData.pixId } }
      );
      if (error) throw new Error(error.message);
      if (data?.status === "PAID") {
        setPixStatus("PAID");
        toast({
          title: "Pagamento simulado! 🎉",
          description: "Plano ativado com sucesso.",
        });
        setTimeout(() => {
          sessionStorage.removeItem("pixCustomerData");
          navigate("/checkout-success?provider=abacate");
        }, 2500);
      }
    } catch (err: any) {
      toast({
        title: "Erro na simulação",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  if (!customerData) return null;

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
            <div className="w-8 h-px bg-emerald-500" />
            <span className={cn(
              "flex items-center gap-1.5 font-medium",
              pixStatus === "PAID" ? "text-emerald-600" : "text-primary"
            )}>
              {pixStatus === "PAID" ? <Check className="h-3.5 w-3.5" /> : <span className="h-4 w-4 rounded-full border-2 border-primary flex items-center justify-center text-[10px] font-bold">3</span>}
              Pagamento
            </span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 container max-w-5xl mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          {/* Left — QR Code area */}
          <motion.div
            className="flex flex-col items-center gap-6"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-center space-y-1">
              <h1 className="text-2xl font-bold text-foreground">Pagamento via PIX</h1>
              <p className="text-sm text-muted-foreground">
                Escaneie o QR Code com o app do seu banco
              </p>
            </div>

            {pixLoading ? (
              <div className="flex flex-col items-center gap-4 py-16">
                <div className="relative">
                  <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  </div>
                </div>
                <p className="text-muted-foreground text-sm">Gerando QR Code...</p>
              </div>
            ) : pixData ? (
              <>
                {/* QR Code card */}
                <motion.div
                  className="relative rounded-2xl bg-white p-8 shadow-xl shadow-black/5 border border-border/10"
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                >
                  {pixData.brCodeBase64 ? (
                    <img
                      src={pixData.brCodeBase64}
                      alt="QR Code PIX"
                      className="w-60 h-60 sm:w-72 sm:h-72"
                    />
                  ) : (
                    <div className="w-60 h-60 flex items-center justify-center text-muted-foreground">
                      <QrCode className="h-16 w-16 opacity-30" />
                    </div>
                  )}
                  {pixStatus === "PAID" && (
                    <motion.div
                      className="absolute inset-0 flex items-center justify-center bg-white/95 rounded-2xl"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    >
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-20 w-20 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                          <PartyPopper className="h-10 w-10 text-white" />
                        </div>
                        <p className="font-bold text-xl text-emerald-600">
                          Pago com sucesso!
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Redirecionando...
                        </p>
                      </div>
                    </motion.div>
                  )}
                </motion.div>

                {/* Amount */}
                <div className="text-center">
                  <p className="text-4xl font-bold text-foreground tracking-tight tabular-nums">
                    {formatCurrency(pixData.amount)}
                  </p>
                  {timeRemaining && pixStatus !== "PAID" && (
                    <div className="flex items-center justify-center gap-1.5 mt-2 text-sm text-muted-foreground">
                      <Timer className="h-3.5 w-3.5" />
                      <span>Expira em <span className="font-mono font-medium text-foreground">{timeRemaining}</span></span>
                    </div>
                  )}
                </div>

                {/* Copy code */}
                <div className="w-full max-w-md space-y-3">
                  <p className="text-xs text-center text-muted-foreground font-medium uppercase tracking-wider">
                    Ou copie o código PIX
                  </p>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={pixData.brCode}
                      className="text-xs font-mono truncate bg-muted/40 border-border/30"
                    />
                    <Button
                      onClick={handleCopyCode}
                      className={cn(
                        "shrink-0 gap-2 transition-all",
                        copied
                          ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                          : "bg-primary hover:bg-primary/90"
                      )}
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4" />
                          Copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          Copiar
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Waiting status */}
                {pixStatus !== "PAID" && (
                  <motion.div
                    className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-amber-500/10 border border-amber-500/20"
                    animate={{ opacity: [0.7, 1, 0.7] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    <Clock className="h-4 w-4 text-amber-600" />
                    <span className="text-sm font-medium text-amber-700">
                      Aguardando pagamento...
                    </span>
                  </motion.div>
                )}
              </>
            ) : null}
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
                  <span className="font-bold text-lg text-foreground">R$ {planPrice}</span>
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
                    setCouponApplied(false);
                  }}
                  disabled={couponApplied}
                  className="text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleApplyCoupon}
                  disabled={!couponCode.trim() || couponApplied}
                  className="shrink-0"
                >
                  {couponApplied ? (
                    <Check className="h-4 w-4 text-emerald-500" />
                  ) : (
                    "Aplicar"
                  )}
                </Button>
              </div>
              {couponApplied && (
                <p className="text-xs text-emerald-600 font-medium">
                  ✓ Cupom aplicado com sucesso
                </p>
              )}
            </div>

            {/* Security badges */}
            <div className="rounded-2xl border border-border/40 bg-card p-5 space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <p className="text-sm font-semibold text-foreground">
                  Compra segura
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <Lock className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">Criptografia de ponta a ponta</p>
                    <p className="text-xs text-muted-foreground">Seus dados são protegidos com criptografia SSL 256-bit</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <Shield className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">Processamento via Banco Central</p>
                    <p className="text-xs text-muted-foreground">PIX regulamentado e fiscalizado pelo BACEN</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <BadgeCheck className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">Ativação instantânea</p>
                    <p className="text-xs text-muted-foreground">Seu plano é ativado imediatamente após o pagamento</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Dev simulate button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSimulatePayment}
              disabled={!pixData || pixStatus === "PAID"}
              className="w-full gap-2 border-dashed border-amber-500/40 text-amber-600 hover:bg-amber-500/5 text-xs"
            >
              <Zap className="h-3.5 w-3.5" />
              Simular pagamento (teste)
            </Button>
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
              <button
                onClick={() => navigate("/termos")}
                className="hover:text-foreground transition-colors"
              >
                Termos de uso
              </button>
            </div>
          </div>
          <p className="text-center text-[10px] text-muted-foreground/60 mt-4">
            © {new Date().getFullYear()} Wiize. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
