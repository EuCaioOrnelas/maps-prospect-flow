import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
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
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load customer data from sessionStorage & check auth
  useEffect(() => {
    const init = async () => {
      // Check if user is logged in
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Faça login primeiro",
          description: "Você precisa estar logado para concluir a compra.",
          variant: "destructive",
        });
        navigate("/login?redirect=/upgrade");
        return;
      }

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
    };
    init();
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
            }, 2000);
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
    // For now just mark as applied — the coupon will be validated when generating a new PIX
    setCouponApplied(true);
    // Regenerate PIX with coupon
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
        }, 2000);
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
      {/* Top bar */}
      <div className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted transition-colors active:scale-95"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1">
            <p className="font-semibold text-sm text-foreground">Pagamento via PIX</p>
            <p className="text-xs text-muted-foreground">
              {planName} — R$ {planPrice}/mês
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Shield className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Pagamento seguro</span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 container max-w-2xl mx-auto px-4 py-8">
        <div className="grid gap-8 md:grid-cols-[1fr_320px]">
          {/* Left — QR Code */}
          <div className="flex flex-col items-center gap-6">
            {pixLoading ? (
              <div className="flex flex-col items-center gap-4 py-12">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground">Gerando QR Code...</p>
              </div>
            ) : pixData ? (
              <>
                {/* QR Code card */}
                <div className="relative rounded-2xl bg-white p-6 shadow-lg border border-border/20">
                  {pixData.brCodeBase64 ? (
                    <img
                      src={pixData.brCodeBase64}
                      alt="QR Code PIX"
                      className="w-56 h-56 sm:w-64 sm:h-64"
                    />
                  ) : (
                    <div className="w-56 h-56 flex items-center justify-center text-muted-foreground">
                      <QrCode className="h-16 w-16 opacity-30" />
                    </div>
                  )}
                  {pixStatus === "PAID" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/95 rounded-2xl animate-scale-in">
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-16 w-16 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                          <PartyPopper className="h-8 w-8 text-white" />
                        </div>
                        <p className="font-bold text-lg text-emerald-600">
                          Pago com sucesso!
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Redirecionando...
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Amount */}
                <div className="text-center">
                  <p className="text-3xl font-bold text-foreground">
                    {formatCurrency(pixData.amount)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Escaneie o QR Code ou copie o código abaixo
                  </p>
                </div>

                {/* Copy code */}
                <div className="w-full max-w-md space-y-2">
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={pixData.brCode}
                      className="text-xs font-mono truncate bg-muted/50"
                    />
                    <Button
                      variant="outline"
                      onClick={handleCopyCode}
                      className="shrink-0 gap-2"
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4 text-emerald-500" />
                          Copiado
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

                {/* Status */}
                {pixStatus !== "PAID" && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="relative">
                      <Clock className="h-4 w-4" />
                      <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                    </div>
                    <span>Aguardando pagamento...</span>
                  </div>
                )}
              </>
            ) : null}
          </div>

          {/* Right sidebar */}
          <div className="space-y-6">
            {/* Coupon */}
            <div className="rounded-xl border border-border/50 bg-card p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
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
                <p className="text-xs text-emerald-600">
                  ✓ Cupom aplicado com sucesso
                </p>
              )}
            </div>

            {/* Plan summary */}
            <div className="rounded-xl border border-border/50 bg-card p-5 space-y-3">
              <p className="text-sm font-medium text-foreground">Resumo</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plano</span>
                  <span className="font-medium">{planName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor</span>
                  <span className="font-medium">R$ {planPrice}/mês</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Método</span>
                  <span className="font-medium text-emerald-600">PIX</span>
                </div>
              </div>
            </div>

            {/* Security */}
            <div className="rounded-xl border border-border/50 bg-card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium text-foreground">
                  Pagamento seguro
                </p>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Transação processada com criptografia de ponta a ponta via
                AbacatePay. Seus dados estão protegidos.
              </p>
            </div>

            {/* Simulate payment button (dev mode) */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSimulatePayment}
              disabled={!pixData || pixStatus === "PAID"}
              className="w-full gap-2 border-dashed border-amber-500/50 text-amber-600 hover:bg-amber-500/5"
            >
              <Zap className="h-4 w-4" />
              Simular pagamento (teste)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
