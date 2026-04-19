// Página combinada: cria conta + tokeniza cartão + agenda cobrança D+7.
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
  Check,
  Loader2,
  Lock,
  ShieldCheck,
  CreditCard,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { PasswordStrength, isPasswordStrong } from "@/components/ui/password-strength";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { generateFingerprint, getClientIP } from "@/lib/fingerprint";
import AnimatedCreditCard from "@/components/ui/animated-credit-card";

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
function fmtCpf(v: string) {
  return v
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
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
  const { user, refreshProfile } = useAuth();

  const planKey = useMemo(() => sessionStorage.getItem("trial_plan_chosen") || "growth", []);
  const plan = PLAN_INFO[planKey];

  // Account
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Customer billing
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [address, setAddress] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const [neighborhood, setNeighborhood] = useState("");

  // Card
  const [cardHolder, setCardHolder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardFlipped, setCardFlipped] = useState(false);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sessionStorage.getItem("trial_plan_chosen")) {
      navigate("/signup/escolher-plano", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  const trialEndDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (!acceptedTerms) {
      toast({ title: "Aceite os termos para continuar", variant: "destructive" });
      return;
    }
    if (!isPasswordStrong(password)) {
      toast({ title: "Senha muito fraca", description: "Use letras, números e símbolos.", variant: "destructive" });
      return;
    }

    const cleanCpf = cpf.replace(/\D/g, "");
    if (cleanCpf.length < 11) {
      toast({ title: "CPF inválido", variant: "destructive" });
      return;
    }
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
      // 1. Anti-fraud check (IP + fingerprint + CPF) — strict
      const [fp, ip] = await Promise.all([generateFingerprint(), getClientIP()]);
      const { data: fraud, error: fraudErr } = await supabase.rpc("check_signup_fraud_strict", {
        p_fingerprint: fp,
        p_ip: ip,
        p_cpf: cleanCpf,
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

      // 2. Create account (regular signup with terms)
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
          },
        },
      });
      if (signupErr) throw signupErr;
      const newUserId = signupData.user?.id;
      if (!newUserId) throw new Error("Conta criada, mas ID do usuário não retornado");

      // 3. Tokenize card + create scheduled subscription on Asaas
      const { data: trialRes, error: trialErr } = await supabase.functions.invoke("create-trial-with-card", {
        body: {
          userId: newUserId,
          planKey,
          customerData: {
            name,
            email,
            taxId: cleanCpf,
            phone: phone.replace(/\D/g, ""),
            postalCode: postalCode.replace(/\D/g, ""),
            address,
            addressNumber: addressNumber || "S/N",
            neighborhood,
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
        // Account was created but card failed — rollback signal: user can retry via email link
        console.error("[SignupWithCard] trial setup failed", trialErr || trialRes?.error);
        throw new Error(
          trialRes?.error || trialErr?.message || "Falha ao validar o cartão. Verifique os dados e tente novamente.",
        );
      }

      sessionStorage.removeItem("trial_plan_chosen");
      await refreshProfile();

      toast({
        title: "Conta criada com sucesso!",
        description: `Confirme seu email para ativar o trial. Cobrança automática em ${trialEndDate}.`,
      });

      navigate("/login?trial_setup=ok", { replace: true });
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
      <SEO title="Cadastro com compromisso — 7 dias grátis" description="Cartão como garantia de seriedade, não como cobrança. Teste o Wiize por 7 dias e decida se faz sentido." />
      <div className="min-h-screen bg-background overflow-x-hidden">
        <div className="absolute inset-0 bg-gradient-glow opacity-30 pointer-events-none" />
        <div className="container mx-auto max-w-5xl px-4 py-8 relative z-10">
          <Link
            to="/signup/escolher-plano"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 text-sm"
          >
            <ArrowLeft size={16} /> Trocar plano
          </Link>

          <div className="flex justify-center mb-6">
            <Logo size="lg" />
          </div>

          <div className="grid lg:grid-cols-[1fr_360px] gap-6">
            {/* Form */}
            <div className="glass rounded-2xl p-6 sm:p-8">
              <h1 className="font-display text-2xl font-bold mb-1">Crie sua conta</h1>
              <p className="text-sm text-muted-foreground mb-6">
                Plano: <strong className="text-foreground">{plan.name}</strong> • 7 dias grátis com cartão como garantia de compromisso
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
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
                  <div className="space-y-1.5">
                    <Label>Senha</Label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                    />
                    <PasswordStrength password={password} />
                  </div>
                </section>

                <section className="space-y-3">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Dados da empresa
                  </h2>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>CPF</Label>
                      <Input value={cpf} onChange={(e) => setCpf(fmtCpf(e.target.value))} required placeholder="000.000.000-00" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Telefone</Label>
                      <Input value={phone} onChange={(e) => setPhone(fmtPhone(e.target.value))} required placeholder="(11) 99999-9999" />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-[140px_1fr_120px] gap-3">
                    <div className="space-y-1.5">
                      <Label>CEP</Label>
                      <Input value={postalCode} onChange={(e) => setPostalCode(fmtCep(e.target.value))} required placeholder="00000-000" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Endereço</Label>
                      <Input value={address} onChange={(e) => setAddress(e.target.value)} required />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Número</Label>
                      <Input value={addressNumber} onChange={(e) => setAddressNumber(e.target.value)} required />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Bairro</Label>
                    <Input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} required />
                  </div>
                </section>

                <section className="space-y-3">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <Lock size={12} /> Cartão como garantia de compromisso (R$ 0,00 hoje)
                  </h2>
                  <div className="space-y-1.5">
                    <Label>Nome impresso no cartão</Label>
                    <Input
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                      required
                      placeholder="NOME COMO NO CARTÃO"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Número do cartão</Label>
                    <Input value={cardNumber} onChange={(e) => setCardNumber(fmtCard(e.target.value))} required placeholder="0000 0000 0000 0000" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Validade (MM/AA)</Label>
                      <Input value={cardExpiry} onChange={(e) => setCardExpiry(fmtExpiry(e.target.value))} required placeholder="12/30" />
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
                      />
                    </div>
                  </div>
                </section>

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
                    e entendo que o cartão é uma garantia de compromisso. Caso eu não cancele pelo
                    Perfil até {trialEndDate}, ativam o plano de R$ {plan.monthly}/mês no meu cartão.
                  </Label>
                </div>

                <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading || !acceptedTerms}>
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin mr-2" size={18} />
                      Criando conta...
                    </>
                  ) : (
                    "Começar 7 dias com compromisso"
                  )}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Já tem conta?{" "}
                  <Link to="/login" className="text-primary hover:underline">
                    Fazer login
                  </Link>
                </p>
              </form>
            </div>

            {/* Sidebar resumo */}
            <aside className="space-y-4">
              <div className="rounded-2xl border border-border bg-card p-5">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <CreditCard size={14} className="text-primary" /> Cartão como compromisso
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Hoje</span>
                    <span className="font-bold text-primary">R$ 0,00</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Se continuar (em {trialEndDate})</span>
                    <span className="font-bold">R$ {plan.monthly},00/mês</span>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-border">
                    <span className="text-muted-foreground">Se cancelar antes</span>
                    <span className="text-primary font-semibold">R$ 0,00</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-xs space-y-2">
                <div className="flex items-start gap-2">
                  <Calendar size={14} className="text-primary shrink-0 mt-0.5" />
                  <p>
                    <strong>7 dias completos</strong> com acesso total ao plano escolhido.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <ShieldCheck size={14} className="text-primary shrink-0 mt-0.5" />
                  <p>
                    O cartão filtra curiosos de empresas sérias. Cancele em 1 clique no{" "}
                    <strong>Perfil → Cancelar ativação automática</strong> e nada é cobrado.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <AlertCircle size={14} className="text-primary shrink-0 mt-0.5" />
                  <p>1 conta por CPF/IP/dispositivo — pra manter a qualidade do ambiente.</p>
                </div>
              </div>

              <div className="hidden lg:block">
                <AnimatedCreditCard
                  cardNumber={cardNumber || "•••• •••• •••• ••••"}
                  cardHolder={cardHolder || "NOME NO CARTÃO"}
                  expiryDate={cardExpiry || "MM/AA"}
                  isFlipped={cardFlipped}
                />
              </div>
            </aside>
          </div>
        </div>
      </div>
    </>
  );
}
