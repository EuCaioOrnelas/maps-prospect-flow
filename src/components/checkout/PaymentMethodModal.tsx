import { useState } from "react";
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
import {
  Loader2,
  CreditCard,
  QrCode,
  ArrowLeft,
  Shield,
  User,
  Mail,
  Phone,
  FileText,
  Check,
  RefreshCw,
  BadgeCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

export interface CustomerData {
  name: string;
  email: string;
  phone: string;
  taxId: string;
}

interface PaymentMethodModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planName: string;
  planPrice: string;
  planKey: string;
  billingPeriod?: "monthly" | "annual";
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

export function PaymentMethodModal({
  open,
  onOpenChange,
  planName,
  planPrice,
  planKey,
  billingPeriod,
  onSelectCard,
  onSelectPix,
  loading,
  defaultEmail,
  defaultName,
}: PaymentMethodModalProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<"data" | "method">("data");
  const [selectedMethod, setSelectedMethod] = useState<"card" | "pix" | null>(null);
  const [customerData, setCustomerData] = useState<CustomerData>({
    name: defaultName || "",
    email: defaultEmail || "",
    phone: "",
    taxId: "",
  });

  const handleDataSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep("method");
  };

  const handleConfirm = () => {
    if (!selectedMethod) return;
    if (selectedMethod === "card") {
      onSelectCard(customerData);
    } else {
      const params = new URLSearchParams({ plan: planKey, planName, planPrice });
      if (billingPeriod) params.set("billing", billingPeriod);
      sessionStorage.setItem("pixCustomerData", JSON.stringify(customerData));
      navigate(`/checkout-pix?${params.toString()}`);
      setTimeout(() => onOpenChange(false), 50);
    }
  };

  const handleBack = () => {
    if (step === "method") {
      setStep("data");
      setSelectedMethod(null);
    } else {
      onOpenChange(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStep("data");
      setSelectedMethod(null);
    }, 300);
  };

  const isDataValid =
    customerData.name.trim().length >= 3 &&
    customerData.email.includes("@") &&
    customerData.phone.replace(/\D/g, "").length >= 10 &&
    customerData.taxId.replace(/\D/g, "").length >= 11;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="landing-light max-w-[95vw] sm:max-w-lg border-border/50 bg-card text-foreground overflow-hidden p-0 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 pb-0">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-2">
              {step === "method" && (
                <button
                  onClick={handleBack}
                  className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition-colors active:scale-95"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              )}
              <div>
                <DialogTitle className="text-xl font-bold">
                  {step === "data" ? "Seus dados" : "Forma de pagamento"}
                </DialogTitle>
                <DialogDescription>
                  Plano <strong>{planName}</strong> — R$ {planPrice}/mês
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Step indicator */}
          <div className="flex gap-2 mt-4">
            <div className={cn("h-1 flex-1 rounded-full transition-colors duration-300", "bg-primary")} />
            <div className={cn("h-1 flex-1 rounded-full transition-colors duration-300", step === "method" ? "bg-primary" : "bg-muted")} />
          </div>
        </div>

        <div className="p-6">
          {step === "data" ? (
            <form onSubmit={handleDataSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="checkout-name" className="text-sm font-medium flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  Nome completo
                </Label>
                <Input
                  id="checkout-name"
                  placeholder="Seu nome completo"
                  value={customerData.name}
                  onChange={(e) => setCustomerData((d) => ({ ...d, name: e.target.value }))}
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="checkout-email" className="text-sm font-medium flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  E-mail
                </Label>
                <Input
                  id="checkout-email"
                  type="email"
                  placeholder="seu@email.com"
                  value={customerData.email}
                  onChange={(e) => setCustomerData((d) => ({ ...d, email: e.target.value }))}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="checkout-phone" className="text-sm font-medium flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    Telefone
                  </Label>
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
                <div className="space-y-1.5">
                  <Label htmlFor="checkout-taxid" className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    CPF / CNPJ
                  </Label>
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

              <Button type="submit" className="w-full mt-4" size="lg" disabled={!isDataValid}>
                Continuar
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              {/* Card option */}
              <button
                onClick={() => setSelectedMethod("card")}
                disabled={loading}
                className={cn(
                  "w-full flex items-center gap-4 p-5 rounded-xl border-2 transition-all duration-200 text-left group active:scale-[0.98]",
                  selectedMethod === "card"
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                    : "border-border/50 hover:border-primary/40 hover:bg-primary/[0.02]",
                  loading && "opacity-50 cursor-not-allowed"
                )}
              >
                <div className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-xl transition-colors shrink-0",
                  selectedMethod === "card" ? "bg-primary/15" : "bg-primary/8 group-hover:bg-primary/12"
                )}>
                  <CreditCard className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm">Cartão de Crédito</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Recorrência automática • Stripe</p>
                </div>
                <div className={cn(
                  "h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                  selectedMethod === "card"
                    ? "border-primary bg-primary"
                    : "border-muted-foreground/30 group-hover:border-primary/50"
                )}>
                  {selectedMethod === "card" && <Check className="h-3 w-3 text-primary-foreground" />}
                </div>
              </button>

              {/* PIX option */}
              <button
                onClick={() => setSelectedMethod("pix")}
                disabled={loading}
                className={cn(
                  "w-full flex items-center gap-4 p-5 rounded-xl border-2 transition-all duration-200 text-left group active:scale-[0.98]",
                  selectedMethod === "pix"
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                    : "border-border/50 hover:border-primary/40 hover:bg-primary/[0.02]",
                  loading && "opacity-50 cursor-not-allowed"
                )}
              >
                <div className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-xl transition-colors shrink-0",
                  selectedMethod === "pix" ? "bg-primary/15" : "bg-primary/8 group-hover:bg-primary/12"
                )}>
                  <QrCode className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm">PIX Recorrente</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Débito automático mensal via PIX</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <RefreshCw className="h-3 w-3 text-muted-foreground/70" />
                    <span className="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-medium">
                      Autorize a recorrência e cancele quando quiser
                    </span>
                  </div>
                </div>
                <div className={cn(
                  "h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                  selectedMethod === "pix"
                    ? "border-primary bg-primary"
                    : "border-muted-foreground/30 group-hover:border-primary/50"
                )}>
                  {selectedMethod === "pix" && <Check className="h-3 w-3 text-primary-foreground" />}
                </div>
              </button>

              {/* Confirm button */}
              <Button
                onClick={handleConfirm}
                disabled={!selectedMethod || loading}
                className="w-full mt-2"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Processando...
                  </>
                ) : (
                  "Continuar para pagamento"
                )}
              </Button>

              {/* Trust badges */}
              <div className="flex items-center justify-center gap-4 pt-1 text-[10px] text-muted-foreground/60">
                <span className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Pagamento seguro
                </span>
                <span className="flex items-center gap-1">
                  <BadgeCheck className="h-3 w-3" />
                  Dados criptografados
                </span>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
