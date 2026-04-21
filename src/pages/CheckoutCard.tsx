import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";
import {
  CreditCard,
  Check,
  ArrowLeft,
  Loader2,
  Lock,
  BadgeCheck,
  Shield,
  ShieldCheck,
  User,
  Calendar,
  Hash,
  MapPin,
  ChevronDown,
  RotateCcw,
  Star,
  MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import AnimatedCreditCard from "@/components/ui/animated-credit-card";
import type { CustomerData } from "@/components/checkout/PaymentMethodModal";
import { Elements, useStripe, useElements } from "@stripe/react-stripe-js";
import { stripePromise } from "@/lib/stripe";
import { StripeCardForm, type StripeCardFormHandle } from "@/components/checkout/StripeCardForm";

function formatCurrency(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatCardNumber(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
}

function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length >= 3) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  return digits;
}

const PLAN_PRICES: Record<string, { monthly: number; annual: number; name: string }> = {
  start: { monthly: 29600, annual: 295200, name: "Wiize Start" },
  growth: { monthly: 69600, annual: 715200, name: "Wiize Growth" },
};

const INSTALLMENT_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export default function CheckoutCard() {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutCardInner />
    </Elements>
  );
}

function CheckoutCardInner() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const planKey = searchParams.get("plan") || "";
  const planName = searchParams.get("planName") || "";
  const billingPeriod = searchParams.get("billing") || "annual";
  const isAnnual = billingPeriod === "annual";

  const planConfig = PLAN_PRICES[planKey];

  const [customerData, setCustomerData] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Card form state — Stripe Elements handles number/exp/cvv internally
  const [cardHolder, setCardHolder] = useState("");
  const cardFormRef = useRef<StripeCardFormHandle>(null);
  const [cardComplete, setCardComplete] = useState(false);
  const [installments, setInstallments] = useState("12");
  const [postalCode, setPostalCode] = useState("");
  const [addressStreet, setAddressStreet] = useState("");
  const [addressNeighborhood, setAddressNeighborhood] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const [cepValidating, setCepValidating] = useState(false);
  const [cepValid, setCepValid] = useState<boolean | null>(null);
  const [cepError, setCepError] = useState("");
  const [cvvFocused, setCvvFocused] = useState(false);
  const [installmentDropdownOpen, setInstallmentDropdownOpen] = useState(false);

  // Load customer data from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem("cardCustomerData");
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setCustomerData(data);
        setCardHolder(data.name || "");
      } catch {
        navigate("/upgrade");
      }
    } else {
      navigate("/upgrade");
    }
  }, [navigate]);

  // Close dropdown on click outside
  useEffect(() => {
    if (!installmentDropdownOpen) return;
    const handler = () => setInstallmentDropdownOpen(false);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [installmentDropdownOpen]);

  // CEP validation via ViaCEP
  useEffect(() => {
    const cleanCep = postalCode.replace(/\D/g, "");
    if (cleanCep.length !== 8) {
      setCepValid(null);
      setCepError("");
      setAddressStreet("");
      setAddressNeighborhood("");
      return;
    }

    const timeout = setTimeout(async () => {
      setCepValidating(true);
      setCepError("");
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await res.json();
        if (data.erro) {
          setCepValid(false);
          setCepError("CEP não encontrado");
          setAddressStreet("");
          setAddressNeighborhood("");
        } else {
          setCepValid(true);
          setAddressStreet(data.logradouro || "");
          setAddressNeighborhood(data.bairro || "");
        }
      } catch {
        setCepValid(false);
        setCepError("Erro ao validar CEP");
      } finally {
        setCepValidating(false);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [postalCode]);

  const isCardValid =
    cardNumber.replace(/\s/g, "").length >= 13 &&
    cardHolder.trim().length >= 3 &&
    cardExpiry.length >= 4 &&
    cardCvv.length >= 3 &&
    cepValid === true &&
    addressStreet.trim().length >= 2 &&
    addressNeighborhood.trim().length >= 1 &&
    addressNumber.trim().length >= 1;

  const installmentCount = isAnnual ? parseInt(installments) : 1;
  const totalPrice = planConfig ? (isAnnual ? planConfig.annual : planConfig.monthly) : 0;
  const installmentValue = planConfig ? (isAnnual ? Math.round(planConfig.annual / installmentCount) : planConfig.monthly) : 0;

  const handleSubmit = async () => {
    if (!customerData || !planKey || !isCardValid) return;
    setLoading(true);

    try {
      const expiryParts = cardExpiry.replace(/\s/g, "").split("/");
      const expiryMonth = expiryParts[0];
      const expiryYear = expiryParts[1]?.length === 2 ? `20${expiryParts[1]}` : expiryParts[1];

      const { data, error } = await supabase.functions.invoke("create-asaas-card-checkout", {
        body: {
          planKey,
          installmentCount: isAnnual ? installmentCount : undefined,
          billingPeriod,
          customerData: {
            ...customerData,
            postalCode: postalCode.replace(/\D/g, ""),
            address: addressStreet,
            addressNumber: addressNumber || "S/N",
            neighborhood: addressNeighborhood,
          },
          creditCard: {
            holderName: cardHolder,
            number: cardNumber.replace(/\s/g, ""),
            expiryMonth: expiryMonth,
            expiryYear: expiryYear,
            ccv: cardCvv,
          },
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      setSuccess(true);
      toast({ title: "🎉 Assinatura criada!", description: isAnnual ? "Seu plano anual foi ativado com sucesso." : "Seu plano mensal foi ativado com sucesso." });
      setTimeout(() => navigate("/checkout-success?provider=asaas"), 2500);
    } catch (err: any) {
      toast({
        title: "Erro no pagamento",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!customerData || !planConfig) return null;

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
          {/* Left — Card form */}
          <motion.div
            className="flex flex-col items-center gap-0"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {success ? (
              <motion.div
                className="flex flex-col items-center gap-5 py-12"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="relative">
                  <motion.div
                    className="absolute inset-0 rounded-full bg-emerald-500/20"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 2.5, opacity: 0 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                  />
                  <motion.div
                    className="relative h-24 w-24 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                  >
                    <Check className="h-12 w-12 text-white stroke-[3]" />
                  </motion.div>
                </div>
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold text-foreground">Assinatura confirmada!</h2>
                  <p className="text-muted-foreground text-sm">
                    Seu plano <span className="font-semibold text-emerald-600">{planName}</span> está sendo ativado
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                  <span>Redirecionando...</span>
                </div>
              </motion.div>
            ) : (
              <div className="w-full max-w-md">
                <div className="text-center space-y-2 mb-4">
                  <h1 className="text-2xl font-bold text-foreground">Pagamento com Cartão</h1>
                  <p className="text-sm text-muted-foreground">
                    {isAnnual
                      ? <>Assinatura anual — <strong>{formatCurrency(planConfig.annual)}</strong></>
                      : <>Assinatura mensal — <strong>{formatCurrency(planConfig.monthly)}</strong>/mês</>
                    }
                  </p>
                  <p className="text-xs text-muted-foreground/80">
                    Renovação automática {isAnnual ? "anual" : "mensal"}. Cancele quando quiser.
                  </p>
                </div>

                {/* Animated 3D Credit Card — overlapping the form card */}
                <div className="relative z-10 mb-[-40px]">
                  <AnimatedCreditCard
                    cardNumber={cardNumber}
                    cardHolder={cardHolder}
                    expiryDate={cardExpiry}
                    isFlipped={cvvFocused}
                  />
                </div>

                {/* Card form */}
                <div className="space-y-4 rounded-2xl border border-border/40 bg-card pt-14 pb-5 px-5">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    <p className="text-sm font-semibold text-foreground">Dados do cartão</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="card-number" className="text-xs font-medium flex items-center gap-1.5">
                      <Hash className="h-3 w-3 text-muted-foreground" />
                      Número do cartão
                    </Label>
                    <Input
                      id="card-number"
                      placeholder="0000 0000 0000 0000"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      maxLength={19}
                      autoFocus
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="card-holder" className="text-xs font-medium flex items-center gap-1.5">
                      <User className="h-3 w-3 text-muted-foreground" />
                      Nome no cartão
                    </Label>
                    <Input
                      id="card-holder"
                      placeholder="NOME IMPRESSO NO CARTÃO"
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="card-expiry" className="text-xs font-medium flex items-center gap-1.5">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        Validade
                      </Label>
                      <Input
                        id="card-expiry"
                        placeholder="MM/AA"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                        maxLength={5}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="card-cvv" className="text-xs font-medium flex items-center gap-1.5">
                        <Lock className="h-3 w-3 text-muted-foreground" />
                        CVV
                      </Label>
                      <Input
                        id="card-cvv"
                        placeholder="000"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        maxLength={4}
                        type="password"
                        onFocus={() => setCvvFocused(true)}
                        onBlur={() => setCvvFocused(false)}
                      />
                    </div>
                  </div>

                  <div className="h-px bg-border/30 my-1" />

                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    <p className="text-sm font-semibold text-foreground">Endereço de cobrança</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="postal-code" className="text-xs font-medium">CEP</Label>
                    <div className="relative">
                      <Input
                        id="postal-code"
                        placeholder="00000-000"
                        value={postalCode}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
                          setPostalCode(digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits);
                        }}
                        maxLength={9}
                        className={cn(
                          cepValid === false && "border-destructive"
                        )}
                      />
                      {cepValidating && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                      )}
                      {cepValid === true && !cepValidating && (
                        <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-emerald-500" />
                      )}
                    </div>
                    {cepError && <p className="text-[10px] text-destructive">{cepError}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="address-street" className="text-xs font-medium">Endereço</Label>
                    <Input
                      id="address-street"
                      placeholder="Rua, Avenida..."
                      value={addressStreet}
                      onChange={(e) => setAddressStreet(e.target.value)}
                      disabled={cepValidating}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="address-neighborhood" className="text-xs font-medium">Bairro</Label>
                      <Input
                        id="address-neighborhood"
                        placeholder="Bairro"
                        value={addressNeighborhood}
                        onChange={(e) => setAddressNeighborhood(e.target.value)}
                        disabled={cepValidating}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="address-number" className="text-xs font-medium">Número</Label>
                      <Input
                        id="address-number"
                        placeholder="Nº"
                        value={addressNumber}
                        onChange={(e) => setAddressNumber(e.target.value)}
                      />
                    </div>
                  </div>

                  {isAnnual && (
                    <>
                      <div className="h-px bg-border/30 my-2" />

                      {/* Installment selector — custom dropdown */}
                      <div className="space-y-1.5 relative">
                        <Label className="text-xs font-medium">Parcelas</Label>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInstallmentDropdownOpen(!installmentDropdownOpen);
                          }}
                          className="flex h-10 w-full items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm transition-colors hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                        >
                          <span>
                            {installmentCount}x de {formatCurrency(installmentValue)}
                            {installmentCount === 1 ? " (à vista)" : ""}
                          </span>
                          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", installmentDropdownOpen && "rotate-180")} />
                        </button>

                        <AnimatePresence>
                          {installmentDropdownOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: -4, scale: 0.98 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -4, scale: 0.98 }}
                              transition={{ duration: 0.15 }}
                              className="absolute bottom-full left-0 right-0 mb-1 z-50 rounded-xl border border-border bg-card shadow-xl shadow-black/10 overflow-hidden max-h-[280px] overflow-y-auto"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {INSTALLMENT_OPTIONS.map((n) => {
                                const val = Math.round(planConfig.annual / n);
                                const isSelected = installments === String(n);
                                return (
                                  <button
                                    key={n}
                                    type="button"
                                    onClick={() => {
                                      setInstallments(String(n));
                                      setInstallmentDropdownOpen(false);
                                    }}
                                    className={cn(
                                      "flex w-full items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-muted/60",
                                      isSelected && "bg-emerald-500/10 text-emerald-700 font-medium"
                                    )}
                                  >
                                    <span>{n}x de {formatCurrency(val)}</span>
                                    {n === 1 && <span className="text-xs text-muted-foreground">à vista</span>}
                                    {isSelected && <Check className="h-3.5 w-3.5 text-emerald-600" />}
                                  </button>
                                );
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </>
                  )}
                </div>

                <div className="mt-5">
                  <Button
                    onClick={handleSubmit}
                    size="lg"
                    disabled={loading || !isCardValid}
                    className="w-full gap-2 h-12 text-base"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Processando pagamento...
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4" />
                        Assinar agora
                      </>
                    )}
                  </Button>
                </div>

                <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
                  <p className="text-[11px] text-muted-foreground">
                    {isAnnual
                      ? <>Ao confirmar, você autoriza a cobrança de <strong>{formatCurrency(planConfig.annual)}</strong> em {installmentCount}x de {formatCurrency(installmentValue)} no cartão de crédito, com <strong>renovação automática anual</strong>. Cancele a qualquer momento pelo seu perfil.</>
                      : <>Ao confirmar, você autoriza a cobrança mensal de <strong>{formatCurrency(planConfig.monthly)}</strong> no cartão de crédito, com <strong>renovação automática todo mês</strong>. Cancele a qualquer momento pelo seu perfil.</>
                    }
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
                  <span className="text-muted-foreground">Período</span>
                  <span className="font-semibold text-foreground">{isAnnual ? "Anual (12 meses)" : "Mensal"}</span>
                </div>
                {isAnnual && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Parcelas</span>
                    <span className="font-semibold text-foreground">{installmentCount}x de {formatCurrency(installmentValue)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Método</span>
                  <span className="font-semibold text-primary flex items-center gap-1">
                    <CreditCard className="h-3.5 w-3.5" /> Cartão
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-medium text-foreground text-xs truncate max-w-[180px]">{customerData?.email}</span>
                </div>
                <div className="h-px bg-border/50" />
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-foreground">Total</span>
                  <div className="text-right">
                    <span className="font-bold text-lg text-foreground block">
                      {isAnnual ? formatCurrency(planConfig.annual) : formatCurrency(planConfig.monthly)}
                    </span>
                    {isAnnual ? (
                      <span className="text-xs text-muted-foreground">
                        {installmentCount}x de {formatCurrency(installmentValue)}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        cobrado todo mês
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Testimonials */}
            <div className="rounded-2xl border border-border/40 bg-card p-5 space-y-4">
              <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-emerald-500 fill-emerald-500" />
                O que dizem nossos clientes
              </p>
              <div className="space-y-3">
                <div className="rounded-xl bg-muted/40 p-3.5 space-y-2">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-3 w-3 text-amber-500 fill-amber-500" />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground italic leading-relaxed">
                    "Triplicamos nossos leads em 2 meses. A automação de WhatsApp é absurda, economiza horas do meu dia."
                  </p>
                  <p className="text-[11px] font-semibold text-foreground">Rafael M. — Agência Digital</p>
                </div>
                <div className="rounded-xl bg-muted/40 p-3.5 space-y-2">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "h-3 w-3",
                          i < 4 ? "text-amber-500 fill-amber-500" : "text-amber-500"
                        )}
                        style={i === 4 ? {
                          clipPath: "inset(0 50% 0 0)",
                          fill: "currentColor",
                          position: "relative",
                        } as React.CSSProperties : undefined}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground italic leading-relaxed">
                    "Melhor investimento que fiz pro meu negócio. O CRM + IA mudou minha forma de prospectar clientes."
                  </p>
                  <p className="text-[11px] font-semibold text-foreground">Camila S. — Consultoria</p>
                </div>
              </div>
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
                    <CreditCard className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">Parcelamento flexível</p>
                    <p className="text-xs text-muted-foreground">Escolha de 1x a 12x sem juros</p>
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
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                    <RotateCcw className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">Garantia de 7 dias</p>
                    <p className="text-xs text-muted-foreground">Não ficou satisfeito? Devolvemos 100% do valor</p>
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
