// Página combinada em 2 etapas: 1) Dados da conta  2) Cartão (estilo checkout premium).
// O usuário só chega aqui depois de escolher o plano em /signup/escolher-plano.

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Lock,
  ShieldCheck,
  CreditCard,
  Calendar,
  User,
  Sparkles,
  Eye,
  EyeOff,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { PasswordStrength, isPasswordStrong } from "@/components/ui/password-strength";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { generateFingerprint, getClientIP } from "@/lib/fingerprint";
import AnimatedCreditCard from "@/components/ui/animated-credit-card";
import { EmailVerificationDialog } from "@/components/EmailVerificationDialog";
import { cn } from "@/lib/utils";
import { Elements } from "@stripe/react-stripe-js";
import { stripePromise } from "@/lib/stripe";
import { StripeCardForm, type StripeCardFormHandle } from "@/components/checkout/StripeCardForm";
import { useRef } from "react";

const PLAN_INFO: Record<string, { name: string; monthly: number }> = {
  start: { name: "Wiize Start", monthly: 296 },
  growth: { name: "Wiize Growth", monthly: 696 },
  scale: { name: "Wiize Scale", monthly: 1496 },
};

function fmtCard(v: string) {
  return v.replace(/\D/g, "").slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ");
}
function fmtExpiry(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 4);
  return d.length >= 3 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}
function fmtTaxId(v: string) {
  const digits = v.replace(/\D/g, "").slice(0, 14);
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

function isValidCpf(cpf: string) {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) s += parseInt(d[i]) * (10 - i);
  let r = (s * 10) % 11;
  if (r === 10) r = 0;
  if (r !== parseInt(d[9])) return false;
  s = 0;
  for (let i = 0; i < 10; i++) s += parseInt(d[i]) * (11 - i);
  r = (s * 10) % 11;
  if (r === 10) r = 0;
  return r === parseInt(d[10]);
}

function isValidCnpj(cnpj: string) {
  const d = cnpj.replace(/\D/g, "");
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const calc = (len: number) => {
    const w = len === 12 ? [5,4,3,2,9,8,7,6,5,4,3,2] : [6,5,4,3,2,9,8,7,6,5,4,3,2];
    let s = 0;
    for (let i = 0; i < len; i++) s += parseInt(d[i]) * w[i];
    const r = s % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === parseInt(d[12]) && calc(13) === parseInt(d[13]);
}

function isValidTaxId(v: string) {
  const d = v.replace(/\D/g, "");
  return d.length === 11 ? isValidCpf(d) : d.length === 14 ? isValidCnpj(d) : false;
}
function fmtCep(v: string) {
  return v.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");
}
function fmtPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").trim();
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").trim();
}

export default function SignupWithCard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const planKey = useMemo(() => sessionStorage.getItem("trial_plan_chosen") || "growth", []);
  const plan = PLAN_INFO[planKey];

  const [step, setStep] = useState<1 | 2>(1);

  // Account
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Customer billing
  const [taxId, setTaxId] = useState("");
  const [phone, setPhone] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [address, setAddress] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const [addressComplement, setAddressComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState("");

  // Card (Stripe Elements handles number/exp/cvv directly)
  const [cardHolder, setCardHolder] = useState("");
  const [cardFlipped, setCardFlipped] = useState(false);
  const [cardBrand, setCardBrand] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const cardFormRef = useRef<StripeCardFormHandle>(null);

  const [loading, setLoading] = useState(false);
  const [showEmailVerification, setShowEmailVerification] = useState(false);

  useEffect(() => {
    if (!sessionStorage.getItem("trial_plan_chosen")) {
      navigate("/signup/escolher-plano", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    const cleanCep = postalCode.replace(/\D/g, "");

    if (cleanCep.length !== 8) {
      setCepError("");
      setCepLoading(false);
      return;
    }

    const timeout = setTimeout(async () => {
      setCepLoading(true);
      setCepError("");

      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await res.json();

        if (data.erro) {
          setCepError("CEP não encontrado");
          setAddress("");
          setNeighborhood("");
          setCity("");
          setState("");
          return;
        }

        setAddress(data.logradouro || "");
        setNeighborhood(data.bairro || "");
        setCity(data.localidade || "");
        setState((data.estado || data.uf || "").trim());
      } catch {
        setCepError("Erro ao buscar o CEP");
      } finally {
        setCepLoading(false);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [postalCode]);

  const trialEndDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  }, []);

  const goToStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast({ title: "Preencha nome e email", variant: "destructive" });
      return;
    }
    if (!isPasswordStrong(password)) {
      toast({ title: "Senha muito fraca", description: "Use letras, números e símbolos.", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "As senhas não coincidem", variant: "destructive" });
      return;
    }
    if (!isValidTaxId(taxId)) {
      toast({
        title: "CPF ou CNPJ inválido",
        description: "Confira os dígitos — o número informado não é válido.",
        variant: "destructive",
      });
      return;
    }
    if (phone.replace(/\D/g, "").length < 10) {
      toast({ title: "Telefone inválido", variant: "destructive" });
      return;
    }
    if (postalCode.replace(/\D/g, "").length < 8 || !address || !addressNumber || !neighborhood || !city || !state || !!cepError) {
      toast({ title: "Complete o endereço", description: "Informe CEP, rua, número, bairro, cidade e estado.", variant: "destructive" });
      return;
    }
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (!acceptedTerms) {
      toast({ title: "Aceite os termos para continuar", variant: "destructive" });
      return;
    }

    const cleanTaxId = taxId.replace(/\D/g, "");
    const cleanCard = cardNumber.replace(/\D/g, "");
    if (cleanCard.length < 13) {
      toast({ title: "Número do cartão inválido", variant: "destructive" });
      return;
    }
    const [mm, yy] = cardExpiry.split("/");
    if (!mm || !yy || mm.length !== 2 || yy.length !== 2) {
      toast({ title: "Validade do cartão inválida (MM/AA)", variant: "destructive" });
      return;
    }
    if (cardCvv.length < 3) {
      toast({ title: "CVV inválido", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      const [fp, ip] = await Promise.all([generateFingerprint(), getClientIP()]);
      const { data: fraud, error: fraudErr } = await supabase.rpc("check_signup_fraud_strict", {
        p_fingerprint: fp,
        p_ip: ip,
        p_cpf: cleanTaxId,
      });
      if (fraudErr) {
        console.error("[SignupWithCard] fraud check error", fraudErr);
      } else if (fraud && (fraud as { allowed?: boolean }).allowed === false) {
        const f = fraud as { message?: string; reason?: string };
        toast({
          title: "Cadastro bloqueado",
          description: f.message || "Já existe uma conta vinculada a este IP/dispositivo/CPF.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // 1) Validate card with Asaas BEFORE creating the auth user.
      //    This prevents orphan accounts when the card is rejected.
      const { data: trialRes, error: trialErr } = await supabase.functions.invoke("create-trial-with-card", {
        body: {
          planKey,
          customerData: {
            name,
            email,
            taxId: cleanTaxId,
            phone: phone.replace(/\D/g, ""),
            postalCode: postalCode.replace(/\D/g, ""),
            address,
            addressNumber: addressNumber || "S/N",
            addressComplement: addressComplement.trim() || undefined,
            neighborhood,
            city: city.trim(),
            state: state.trim(),
            remoteIp: ip || undefined,
          },
          creditCard: {
            holderName: cardHolder,
            number: cleanCard,
            expiryMonth: mm,
            expiryYear: `20${yy}`,
            ccv: cardCvv,
          },
        },
      });
      if (trialErr || trialRes?.error) {
        const trialMessage = trialRes?.error || trialErr?.message || "Falha ao validar o cartão. Verifique os dados e tente novamente.";
        console.error("[SignupWithCard] trial setup failed", trialErr || trialRes?.error);
        throw new Error(trialMessage);
      }

      // 2) Card is valid — now create the auth user with trial metadata so the
      //    profile trigger can persist it.
      const redirectUrl = `${window.location.origin}/dashboard`;
      const { data: signupData, error: signupErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name,
            signup_ip: ip || "unknown",
            device_fingerprint: fp || "unknown",
            terms_accepted: "true",
            trial_with_card: "true",
            trial_plan_chosen: planKey,
            trial_asaas_subscription_id: trialRes.subscriptionId,
            trial_asaas_customer_id: trialRes.customerId,
            trial_card_last4: trialRes.cardLast4,
            trial_card_brand: trialRes.cardBrand,
            trial_will_charge_at: trialRes.nextDueDate,
          },
        },
      });
      if (signupErr) throw signupErr;
      const newUserId = signupData.user?.id;
      if (!newUserId) throw new Error("Conta criada, mas ID do usuário não retornado");

      // 3) Persist trial details on the profile (best-effort — webhook also reconciles).
      await supabase
        .from("profiles")
        .update({
          trial_card_last4: trialRes.cardLast4,
          trial_card_brand: trialRes.cardBrand,
          trial_asaas_subscription_id: trialRes.subscriptionId,
          trial_asaas_customer_id: trialRes.customerId,
          trial_plan_chosen: planKey,
          trial_billing_period: "monthly",
          trial_will_charge_at: new Date(trialRes.nextDueDate).toISOString(),
          trial_auto_charge_cancelled: false,
          cpf: cleanTaxId,
          phone: phone || null,
          postal_code: postalCode.replace(/\D/g, "") || null,
          address: address || null,
          address_number: addressNumber || null,
          neighborhood: neighborhood || null,
          city: city || null,
          state: state || null,
        })
        .eq("id", newUserId);

      sessionStorage.removeItem("trial_plan_chosen");

      toast({
        title: "Conta criada com sucesso!",
        description: `Confirme seu email para ativar o trial. Cobrança automática em ${trialEndDate}.`,
      });

      setShowEmailVerification(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[SignupWithCard] error", e);
      toast({ title: "Erro ao criar conta", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!plan) return null;

  return (
    <>
      <SEO title="Comece grátis por 7 dias | Wiize" description="Crie sua conta e ative seu teste de 7 dias. R$ 0,00 hoje. Cancele quando quiser." />
      <div className="min-h-screen bg-background overflow-x-hidden">
        <div className="absolute inset-0 bg-gradient-glow opacity-30 pointer-events-none" />
        <div className="container mx-auto max-w-5xl px-4 py-8 relative z-10">
          <button
            onClick={() => (step === 2 ? setStep(1) : navigate("/signup/escolher-plano"))}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 text-sm"
          >
            <ArrowLeft size={16} /> {step === 2 ? "Voltar para meus dados" : "Trocar plano"}
          </button>

          <div className="flex justify-center mb-6">
            <Logo size="lg" />
          </div>

          {/* Stepper */}
          <div className="max-w-md mx-auto mb-8">
            <div className="flex items-center gap-3">
              <StepDot active={step >= 1} done={step > 1} num={1} label="Seus dados" icon={<User size={14} />} />
              <div className={cn("flex-1 h-0.5 rounded-full transition-colors", step > 1 ? "bg-primary" : "bg-border")} />
              <StepDot active={step >= 2} done={false} num={2} label="Cartão" icon={<CreditCard size={14} />} />
            </div>
          </div>

          <div className="grid lg:grid-cols-[1fr_360px] gap-6">
            {/* Form */}
            <div className="glass rounded-2xl p-6 sm:p-8">
              {step === 1 ? (
                <>
                  <h1 className="font-display text-2xl font-bold mb-1">Crie sua conta</h1>
                  <p className="text-sm text-muted-foreground mb-6">
                    Plano: <strong className="text-foreground">{plan.name}</strong> · 7 dias grátis com acesso completo
                  </p>

                  <form onSubmit={goToStep2} className="space-y-5">
                    <section className="space-y-3">
                      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                        Sua conta
                      </h2>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label>Nome completo</Label>
                          <Input value={name} onChange={(e) => setName(e.target.value)} required />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Email</Label>
                          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                        </div>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label>Senha</Label>
                          <div className="relative">
                            <Input
                              type={showPassword ? "text" : "password"}
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              required
                              minLength={8}
                              className="pr-11"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword((prev) => !prev)}
                              className="absolute inset-y-0 right-0 px-3 text-muted-foreground hover:text-foreground"
                              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                            >
                              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                          <PasswordStrength password={password} />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Confirmar senha</Label>
                          <div className="relative">
                            <Input
                              type={showConfirmPassword ? "text" : "password"}
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              required
                              minLength={8}
                              className="pr-11"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword((prev) => !prev)}
                              className="absolute inset-y-0 right-0 px-3 text-muted-foreground hover:text-foreground"
                              aria-label={showConfirmPassword ? "Ocultar confirmação" : "Mostrar confirmação"}
                            >
                              {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </section>

                    <section className="space-y-3">
                      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                        Dados de cobrança
                      </h2>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label>CPF ou CNPJ</Label>
                          <Input value={taxId} onChange={(e) => setTaxId(fmtTaxId(e.target.value))} required placeholder="CPF ou CNPJ" inputMode="numeric" />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Telefone</Label>
                          <Input value={phone} onChange={(e) => setPhone(fmtPhone(e.target.value))} required placeholder="(11) 99999-9999" />
                        </div>
                      </div>
                      <div className="grid sm:grid-cols-[140px_1fr_110px_160px] gap-3">
                        <div className="space-y-1.5">
                          <Label>CEP</Label>
                          <Input value={postalCode} onChange={(e) => setPostalCode(fmtCep(e.target.value))} required placeholder="00000-000" />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Endereço</Label>
                          <Input value={address} onChange={(e) => setAddress(e.target.value)} required disabled={cepLoading} />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Número</Label>
                          <Input value={addressNumber} onChange={(e) => setAddressNumber(e.target.value)} required />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Complemento</Label>
                          <Input value={addressComplement} onChange={(e) => setAddressComplement(e.target.value)} placeholder="Apto, sala, bloco" />
                        </div>
                      </div>
                      <div className="grid sm:grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                          <Label>Bairro</Label>
                          <Input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} required disabled={cepLoading} />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Cidade</Label>
                          <Input value={city} onChange={(e) => setCity(e.target.value)} required disabled={cepLoading} />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Estado</Label>
                          <Input value={state} onChange={(e) => setState(e.target.value)} required placeholder="Paraná" disabled={cepLoading} />
                        </div>
                      </div>
                      {(cepLoading || cepError) && (
                        <p className={cn("text-xs", cepError ? "text-destructive" : "text-muted-foreground")}>
                          {cepLoading ? "Buscando endereço pelo CEP..." : cepError}
                        </p>
                      )}
                    </section>

                    <Button type="submit" variant="hero" size="lg" className="w-full group">
                      Continuar para o cartão
                      <ArrowRight size={18} className="ml-2 transition-transform group-hover:translate-x-1" />
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">
                      Já tem conta?{" "}
                      <Link to="/login" className="text-primary hover:underline">
                        Fazer login
                      </Link>
                    </p>
                  </form>
                </>
              ) : (
                <>
                  <h1 className="font-display text-2xl font-bold mb-1 flex items-center gap-2">
                    <Lock size={20} className="text-primary" /> Cartão de garantia
                  </h1>
                  <p className="text-sm text-muted-foreground mb-6">
                    R$ 0,00 hoje. Cobrança só no 8º dia, se você decidir continuar.
                  </p>

                  {/* Cartão animado em destaque (mobile-first) */}
                  <div className="lg:hidden mb-6 flex justify-center">
                    <AnimatedCreditCard
                      cardNumber={cardNumber || "•••• •••• •••• ••••"}
                      cardHolder={cardHolder || "NOME NO CARTÃO"}
                      expiryDate={cardExpiry || "MM/AA"}
                      isFlipped={cardFlipped}
                    />
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-1.5">
                      <Label>Nome impresso no cartão</Label>
                      <Input
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                        required
                        placeholder="Ex: João M Silva"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Número do cartão</Label>
                      <Input
                        value={cardNumber}
                        onChange={(e) => setCardNumber(fmtCard(e.target.value))}
                        required
                        placeholder="0000 0000 0000 0000"
                        inputMode="numeric"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Validade (MM/AA)</Label>
                        <Input
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(fmtExpiry(e.target.value))}
                          required
                          placeholder="12/30"
                          inputMode="numeric"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>CVV</Label>
                        <Input
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                          onFocus={() => setCardFlipped(true)}
                          onBlur={() => setCardFlipped(false)}
                          required
                          placeholder="123"
                          inputMode="numeric"
                        />
                      </div>
                    </div>

                    <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-xs text-muted-foreground flex items-start gap-2">
                      <ShieldCheck size={14} className="text-primary shrink-0 mt-0.5" />
                      <p>
                        Pagamento processado via <strong className="text-foreground">Asaas</strong> com segurança bancária. Não armazenamos dados do cartão.
                      </p>
                    </div>

                    <div className="flex items-start gap-3 pt-2">
                      <Checkbox
                        id="terms"
                        checked={acceptedTerms}
                        onCheckedChange={(c) => setAcceptedTerms(c as boolean)}
                      />
                      <Label htmlFor="terms" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                        Aceito os{" "}
                        <Link to="/terms" className="text-primary hover:underline" target="_blank">
                          Termos de Uso
                        </Link>{" "}
                        e entendo que, caso eu não cancele pelo Perfil até {trialEndDate}, o plano de R$ {plan.monthly.toLocaleString("pt-BR")}/mês será ativado automaticamente.
                      </Label>
                    </div>

                    <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading || !acceptedTerms}>
                      {loading ? (
                        <>
                          <Loader2 className="animate-spin mr-2" size={18} />
                          Ativando seu trial...
                        </>
                      ) : (
                        <>
                          <Sparkles size={16} className="mr-2" />
                          Ativar meus 7 dias grátis
                        </>
                      )}
                    </Button>
                    <p className="text-center text-xs text-muted-foreground inline-flex items-center gap-1.5 justify-center w-full">
                      <Lock size={11} /> R$ 0,00 hoje · Cancele quando quiser, em 1 clique
                    </p>
                  </form>
                </>
              )}
            </div>

            {/* Sidebar resumo */}
            <aside className="space-y-4">
              {/* Cartão animado destaque desktop, só na step 2 */}
              {step === 2 && (
                <div className="hidden lg:block">
                  <AnimatedCreditCard
                    cardNumber={cardNumber || "•••• •••• •••• ••••"}
                    cardHolder={cardHolder || "NOME NO CARTÃO"}
                    expiryDate={cardExpiry || "MM/AA"}
                    isFlipped={cardFlipped}
                  />
                </div>
              )}

              <div className="rounded-2xl border border-border bg-card p-5">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <CreditCard size={14} className="text-primary" /> Resumo do trial
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Plano</span>
                    <span className="font-semibold">{plan.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Hoje</span>
                    <span className="font-bold text-primary text-lg">R$ 0,00</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="text-muted-foreground text-xs">Após o 8º dia</span>
                    <span className="font-semibold text-sm">R$ {plan.monthly.toLocaleString("pt-BR")}/mês</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground pt-1 leading-relaxed">
                    Cancele quando quiser, em 1 clique pelo Perfil. Sem cobrança se cancelar antes do 8º dia.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-xs space-y-2">
                <div className="flex items-start gap-2">
                  <Calendar size={14} className="text-primary shrink-0 mt-0.5" />
                  <p>
                    <strong>7 dias completos</strong> com acesso total à plataforma.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <ShieldCheck size={14} className="text-primary shrink-0 mt-0.5" />
                  <p>
                    Avisamos por email <strong>2 dias antes</strong> do fim do trial.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Check size={14} className="text-primary shrink-0 mt-0.5" />
                  <p>1 conta por CPF/IP/dispositivo, para manter a qualidade do ambiente.</p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>

      <EmailVerificationDialog
        open={showEmailVerification}
        onOpenChange={setShowEmailVerification}
        email={email}
      />
    </>
  );
}

function StepDot({
  active,
  done,
  num,
  label,
  icon,
}: {
  active: boolean;
  done: boolean;
  num: number;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors border-2",
          done
            ? "bg-primary border-primary text-primary-foreground"
            : active
              ? "border-primary text-primary bg-primary/10"
              : "border-border text-muted-foreground bg-card",
        )}
      >
        {done ? <Check size={14} /> : icon}
      </div>
      <span
        className={cn(
          "text-xs font-medium hidden sm:inline",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
      </span>
    </div>
  );
}
