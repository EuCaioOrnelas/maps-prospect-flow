import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CreditCard, QrCode, ArrowLeft, Shield, Copy, Check, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface CustomerData {
  name: string;
  email: string;
  phone: string;
  taxId: string;
}

interface PixData {
  pixId: string;
  brCode: string;
  brCodeBase64: string;
  amount: number;
  expiresAt: string;
}

interface PaymentMethodModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planName: string;
  planPrice: string;
  planKey: string;
  onSelectCard: (data: CustomerData) => void;
  onSelectPix: (data: CustomerData) => void;
  loading: boolean;
  defaultEmail?: string;
  defaultName?: string;
}

function formatCPF(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return digits
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return digits
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

function formatCurrency(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function PaymentMethodModal({
  open,
  onOpenChange,
  planName,
  planPrice,
  planKey,
  onSelectCard,
  onSelectPix,
  loading,
  defaultEmail,
  defaultName,
}: PaymentMethodModalProps) {
  const [step, setStep] = useState<"data" | "method" | "pix">("data");
  const [customerData, setCustomerData] = useState<CustomerData>({
    name: defaultName || "",
    email: defaultEmail || "",
    phone: "",
    taxId: "",
  });
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [pixLoading, setPixLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pixStatus, setPixStatus] = useState<string>("PENDING");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup polling on unmount or close
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // Poll for PIX payment status
  useEffect(() => {
    if (step !== "pix" || !pixData) return;

    const checkStatus = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("check-abacate-pix", {
          body: { pixId: pixData.pixId },
        });
        if (!error && data?.status) {
          setPixStatus(data.status);
          if (data.status === "PAID") {
            if (pollRef.current) clearInterval(pollRef.current);
            toast({ title: "Pagamento confirmado! 🎉", description: "Seu plano foi ativado com sucesso." });
            setTimeout(() => {
              onOpenChange(false);
              window.location.href = "/checkout-success?provider=abacate";
            }, 1500);
          }
        }
      } catch (e) {
        // silent
      }
    };

    pollRef.current = setInterval(checkStatus, 5000);
    // Check immediately
    checkStatus();

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [step, pixData]);

  const handleDataSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep("method");
  };

  const handlePixSelect = async () => {
    setPixLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-abacate-pix", {
        body: { planKey, customerData },
      });
      if (error) throw new Error(error.message);
      if (!data?.brCode) throw new Error("QR Code não gerado");
      
      setPixData(data);
      setPixStatus("PENDING");
      setStep("pix");
    } catch (err: any) {
      toast({ title: "Erro ao gerar PIX", description: err.message, variant: "destructive" });
    } finally {
      setPixLoading(false);
    }
  };

  const handleCopyCode = async () => {
    if (!pixData?.brCode) return;
    try {
      await navigator.clipboard.writeText(pixData.brCode);
      setCopied(true);
      toast({ title: "Código copiado!" });
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast({ title: "Erro ao copiar", variant: "destructive" });
    }
  };

  const handleBack = () => {
    if (step === "pix") {
      if (pollRef.current) clearInterval(pollRef.current);
      setStep("method");
    } else if (step === "method") {
      setStep("data");
    } else {
      onOpenChange(false);
    }
  };

  const handleClose = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    onOpenChange(false);
    setTimeout(() => {
      setStep("data");
      setPixData(null);
      setPixStatus("PENDING");
    }, 300);
  };

  const isDataValid =
    customerData.name.trim().length >= 3 &&
    customerData.email.includes("@") &&
    customerData.phone.replace(/\D/g, "").length >= 10 &&
    customerData.taxId.replace(/\D/g, "").length >= 11;

  const stepIndex = step === "data" ? 0 : step === "method" ? 1 : 2;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg border-border/50 bg-card overflow-hidden p-0">
        {/* Header */}
        <div className="p-6 pb-0">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-2">
              {step !== "data" && (
                <button
                  onClick={handleBack}
                  className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              )}
              <div>
                <DialogTitle className="text-xl font-bold">
                  {step === "data" ? "Seus dados" : step === "method" ? "Forma de pagamento" : "Pagamento via PIX"}
                </DialogTitle>
                <DialogDescription>
                  Plano <strong>{planName}</strong> — R$ {planPrice}/mês
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Step indicator */}
          <div className="flex gap-2 mt-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className={cn("h-1 flex-1 rounded-full transition-colors", i <= stepIndex ? "bg-primary" : "bg-muted")} />
            ))}
          </div>
        </div>

        <div className="p-6">
          {step === "data" && (
            <form onSubmit={handleDataSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="checkout-name">Nome completo</Label>
                <Input
                  id="checkout-name"
                  placeholder="Seu nome completo"
                  value={customerData.name}
                  onChange={(e) => setCustomerData((d) => ({ ...d, name: e.target.value }))}
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="checkout-email">E-mail</Label>
                <Input
                  id="checkout-email"
                  type="email"
                  placeholder="seu@email.com"
                  value={customerData.email}
                  onChange={(e) => setCustomerData((d) => ({ ...d, email: e.target.value }))}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="checkout-phone">Telefone</Label>
                  <Input
                    id="checkout-phone"
                    placeholder="(00) 00000-0000"
                    value={customerData.phone}
                    onChange={(e) =>
                      setCustomerData((d) => ({ ...d, phone: formatPhone(e.target.value) }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="checkout-taxid">CPF / CNPJ</Label>
                  <Input
                    id="checkout-taxid"
                    placeholder="000.000.000-00"
                    value={customerData.taxId}
                    onChange={(e) =>
                      setCustomerData((d) => ({ ...d, taxId: formatCPF(e.target.value) }))
                    }
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={!isDataValid}>
                Continuar
              </Button>
            </form>
          )}

          {step === "method" && (
            <div className="space-y-4">
              {/* Card option */}
              <button
                onClick={() => onSelectCard(customerData)}
                disabled={loading}
                className={cn(
                  "w-full flex items-center gap-4 p-5 rounded-xl border-2 border-border/50",
                  "hover:border-primary/50 hover:bg-primary/5 transition-all duration-200",
                  "text-left group active:scale-[0.98]",
                  loading && "opacity-50 cursor-not-allowed"
                )}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                  <CreditCard className="h-6 w-6 text-blue-500" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Cartão de Crédito</p>
                  <p className="text-sm text-muted-foreground">Parcelamento e recorrência automática</p>
                </div>
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30 group-hover:border-primary transition-colors" />
                )}
              </button>

              {/* PIX option */}
              <button
                onClick={handlePixSelect}
                disabled={loading || pixLoading}
                className={cn(
                  "w-full flex items-center gap-4 p-5 rounded-xl border-2 border-border/50",
                  "hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all duration-200",
                  "text-left group active:scale-[0.98]",
                  (loading || pixLoading) && "opacity-50 cursor-not-allowed"
                )}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
                  <QrCode className="h-6 w-6 text-emerald-500" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">PIX</p>
                  <p className="text-sm text-muted-foreground">Pagamento instantâneo via QR Code</p>
                </div>
                {pixLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30 group-hover:border-emerald-500 transition-colors" />
                )}
              </button>

              <div className="flex items-center justify-center gap-2 pt-2 text-xs text-muted-foreground">
                <Shield className="h-3.5 w-3.5" />
                <span>Pagamento 100% seguro e criptografado</span>
              </div>
            </div>
          )}

          {step === "pix" && pixData && (
            <div className="space-y-5">
              {/* QR Code */}
              <div className="flex flex-col items-center gap-4">
                <div className="relative rounded-2xl bg-white p-4 shadow-sm border border-border/30">
                  {pixData.brCodeBase64 ? (
                    <img
                      src={pixData.brCodeBase64}
                      alt="QR Code PIX"
                      className="w-48 h-48"
                    />
                  ) : (
                    <div className="w-48 h-48 flex items-center justify-center text-muted-foreground">
                      QR Code indisponível
                    </div>
                  )}
                  {pixStatus === "PAID" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/90 rounded-2xl">
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-12 w-12 rounded-full bg-emerald-500 flex items-center justify-center">
                          <Check className="h-6 w-6 text-white" />
                        </div>
                        <p className="font-semibold text-emerald-600">Pago!</p>
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-lg font-bold text-foreground">{formatCurrency(pixData.amount)}</p>
              </div>

              {/* Copy code */}
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground text-center">
                  Ou copie o código PIX abaixo:
                </p>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={pixData.brCode}
                    className="text-xs font-mono truncate"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyCode}
                    className="shrink-0"
                  >
                    {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Status */}
              {pixStatus !== "PAID" && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground animate-pulse">
                  <Clock className="h-4 w-4" />
                  <span>Aguardando pagamento...</span>
                </div>
              )}

              <div className="flex items-center justify-center gap-2 pt-1 text-xs text-muted-foreground">
                <Shield className="h-3.5 w-3.5" />
                <span>Pagamento 100% seguro via AbacatePay</span>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
