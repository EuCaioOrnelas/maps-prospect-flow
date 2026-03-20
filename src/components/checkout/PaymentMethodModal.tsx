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
import { Loader2, CreditCard, QrCode, ArrowLeft, Check, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

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
  onSelectCard: (data: CustomerData) => void;
  onSelectPix: (data: CustomerData) => void;
  loading: boolean;
  /** Pre-fill email for logged-in users */
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
  onSelectCard,
  onSelectPix,
  loading,
  defaultEmail,
  defaultName,
}: PaymentMethodModalProps) {
  const [step, setStep] = useState<"data" | "method">("data");
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

  const handleBack = () => {
    if (step === "method") {
      setStep("data");
    } else {
      onOpenChange(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset after close animation
    setTimeout(() => {
      setStep("data");
    }, 300);
  };

  const isDataValid =
    customerData.name.trim().length >= 3 &&
    customerData.email.includes("@") &&
    customerData.phone.replace(/\D/g, "").length >= 10 &&
    customerData.taxId.replace(/\D/g, "").length >= 11;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg border-border/50 bg-card overflow-hidden p-0">
        {/* Header */}
        <div className="p-6 pb-0">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-2">
              {step === "method" && (
                <button
                  onClick={handleBack}
                  className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition-colors"
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
            <div className={cn("h-1 flex-1 rounded-full transition-colors", "bg-primary")} />
            <div className={cn("h-1 flex-1 rounded-full transition-colors", step === "method" ? "bg-primary" : "bg-muted")} />
          </div>
        </div>

        <div className="p-6">
          {step === "data" ? (
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
          ) : (
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
                onClick={() => onSelectPix(customerData)}
                disabled={loading}
                className={cn(
                  "w-full flex items-center gap-4 p-5 rounded-xl border-2 border-border/50",
                  "hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all duration-200",
                  "text-left group active:scale-[0.98]",
                  loading && "opacity-50 cursor-not-allowed"
                )}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
                  <QrCode className="h-6 w-6 text-emerald-500" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">PIX</p>
                  <p className="text-sm text-muted-foreground">Pagamento instantâneo via QR Code</p>
                </div>
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30 group-hover:border-emerald-500 transition-colors" />
                )}
              </button>

              {/* Security badge */}
              <div className="flex items-center justify-center gap-2 pt-2 text-xs text-muted-foreground">
                <Shield className="h-3.5 w-3.5" />
                <span>Pagamento 100% seguro e criptografado</span>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
