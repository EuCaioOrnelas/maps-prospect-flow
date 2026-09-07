import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Loader2, Lock, ArrowLeft, ArrowRight, Check, MapPin, CircleAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ShaderBackground } from "@/components/ui/warmth-ripple";
import { PasswordField, isStrongPassword } from "@/components/wiize-api/PasswordField";
import { maskCEP, maskCNPJ, maskCPF, maskPhone, onlyDigits, BR_STATES, isValidCNPJ, isValidCPF } from "@/lib/brMasks";
import { cn } from "@/lib/utils";
import wiizeLogo from "@/assets/logo-icon-new.png";
import { createWiizeApiAccess, resolveWiizeApiAccess, type WiizeApiProfileInput } from "@/lib/wiizeApiAuth";

type Mode = "login" | "signup";

/** Beta fechado: cadastro público desativado temporariamente. */
export const API_SIGNUP_ENABLED = false;

/** Evita spinner infinito quando o backend demora a responder. */
function withTimeout<T>(p: PromiseLike<T>, ms = 15000): Promise<T> {
  return Promise.race([
    Promise.resolve(p),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Tempo esgotado. Tente novamente em instantes.")), ms),
    ),
  ]);
}

/** Container que anima a altura conforme o conteúdo muda (evita "pulos" no toggle). */
function AutoHeight({ children, deps }: { children: React.ReactNode; deps: unknown[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setHeight(el.scrollHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return (
    <div
      style={{ height: height ? `${height}px` : undefined }}
      className="-mx-2 overflow-hidden px-2 transition-[height] duration-300 ease-out"
    >
      <div ref={ref}>{children}</div>
    </div>
  );
}


export default function ApiLogin() {
  const [params, setParams] = useSearchParams();
  const initialMode: Mode = params.get("modo") === "cadastro" ? "signup" : "login";
  const [mode, setMode] = useState<Mode>(initialMode);
  const [step, setStep] = useState<1 | 2>(1);

  // Passo 1
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Passo 2
  const [docType, setDocType] = useState<"cnpj" | "cpf">("cnpj");
  const [docNumber, setDocNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [cep, setCep] = useState("");
  const [street, setStreet] = useState("");
  const [streetNumber, setStreetNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [uf, setUf] = useState("");
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState("");
  const [cepOk, setCepOk] = useState(false);

  const [loading, setLoading] = useState(false);
  const [awaitingConfirm, setAwaitingConfirm] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const isSignup = mode === "signup";

  const switchMode = (next: Mode) => {
    setMode(next);
    setStep(1);
    setAwaitingConfirm(null);
    setAuthMessage(null);
    const p = new URLSearchParams(params);
    if (next === "signup") p.set("modo", "cadastro");
    else p.delete("modo");
    setParams(p, { replace: true });
  };

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(async ({ data }) => {
      const user = data.session?.user;
      if (!active || !user) return;
      const access = await resolveWiizeApiAccess(user);
      if (active && access.hasAccess) navigate("/api/dashboard", { replace: true });
    });
    return () => { active = false; };
  }, [navigate]);


  // ViaCEP — mesmo mecanismo do checkout
  useEffect(() => {
    const clean = onlyDigits(cep);
    if (clean.length !== 8) {
      setCepOk(false);
      setCepError("");
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setCepLoading(true);
      setCepError("");
      try {
        const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
        const data = await res.json();
        if (cancelled) return;
        if (data.erro) {
          setCepOk(false);
          setCepError("CEP não encontrado");
        } else {
          setCepOk(true);
          setStreet(data.logradouro || "");
          setNeighborhood(data.bairro || "");
          setCity(data.localidade || "");
          setUf(data.uf || "");
        }
      } catch {
        if (!cancelled) {
          setCepOk(false);
          setCepError("Erro ao validar CEP");
        }
      } finally {
        if (!cancelled) setCepLoading(false);
      }
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [cep]);

  const step1Valid =
    name.trim().length >= 3 &&
    company.trim().length >= 2 &&
    /\S+@\S+\.\S+/.test(email.trim()) &&
    isStrongPassword(password);

  const docValid = docType === "cnpj" ? isValidCNPJ(docNumber) : isValidCPF(docNumber);
  const step2Valid =
    docValid &&
    onlyDigits(phone).length >= 10 &&
    cepOk &&
    street.trim().length > 2 &&
    streetNumber.trim().length > 0 &&
    city.trim().length > 1 &&
    uf.length === 2;

  const doSignup = async () => {
    setLoading(true);
    setAuthMessage(null);
    try {
      const profile: WiizeApiProfileInput = {
        full_name: name.trim(),
        company_name: company.trim(),
        phone: onlyDigits(phone),
        doc_type: docType,
        doc_number: onlyDigits(docNumber),
        postal_code: onlyDigits(cep),
        street: street.trim(),
        street_number: streetNumber.trim(),
        complement: complement.trim(),
        neighborhood: neighborhood.trim(),
        city: city.trim(),
        state: uf,
      };
      const { data, error } = await withTimeout(
        supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/api/login`,
            data: {
              full_name: name.trim(),
              company_name: company.trim(),
              wiize_product: "wiize_api",
              api_doc_type: docType,
              api_doc_number: onlyDigits(docNumber),
              api_phone: onlyDigits(phone),
              api_postal_code: onlyDigits(cep),
              api_street: street.trim(),
              api_street_number: streetNumber.trim(),
              api_complement: complement.trim(),
              api_neighborhood: neighborhood.trim(),
              api_city: city.trim(),
              api_state: uf,
            },
          },
        }),
      );
      if (error) throw error;

      // Para evitar enumeração de usuários, o Auth retorna sucesso sem identidade
      // quando o e-mail já existe. Nesse caso, validamos a senha informada e
      // vinculamos o perfil da API à identidade já confirmada.
      const existingEmail = Array.isArray(data.user?.identities) && data.user.identities.length === 0;
      if (existingEmail) {
        const { data: loginData, error: loginError } = await withTimeout(
          supabase.auth.signInWithPassword({ email: email.trim(), password }),
          10000,
        );
        if (loginError || !loginData.user) {
          await supabase.auth.signOut({ scope: "local" });
          setAuthMessage("Este e-mail já está cadastrado. Entre com sua senha ou use “Esqueci minha senha”.");
          setMode("login");
          setStep(1);
          return;
        }
        const { error: profileError } = await createWiizeApiAccess(loginData.user.id, profile);
        if (profileError) throw profileError;
        if (!loginData.user.email_confirmed_at) {
          await supabase.auth.signOut({ scope: "local" });
          setAwaitingConfirm(email.trim());
          return;
        }
        navigate("/api/dashboard", { replace: true });
        return;
      }

      // Cadastro novo: sempre exige confirmação de e-mail antes de liberar o painel.
      if (data.session) {
        await createWiizeApiAccess(data.session.user.id, profile);
        await supabase.auth.signOut({ scope: "local" });
      }
      setAwaitingConfirm(email.trim());
    } catch (err: any) {
      toast({
        title: "Não foi possível criar a conta",
        description: err?.message || "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resendConfirmation = async () => {
    if (!awaitingConfirm) return;
    setResending(true);
    try {
      const { error } = await withTimeout(
        supabase.auth.resend({
          type: "signup",
          email: awaitingConfirm,
          options: { emailRedirectTo: `${window.location.origin}/api/login` },
        }),
      );
      if (error) throw error;
      toast({ title: "E-mail reenviado", description: "Confira sua caixa de entrada e o spam." });
    } catch (err: any) {
      toast({ title: "Falha ao reenviar", description: err?.message, variant: "destructive" });
    } finally {
      setResending(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (isSignup) {
      if (step === 1) {
        if (!step1Valid) return;
        setStep(2);
        return;
      }
      if (!step2Valid) return;
      await doSignup();
      return;
    }

    setLoading(true);
    setAuthMessage(null);
    try {
      const { data, error } = await withTimeout(
        supabase.auth.signInWithPassword({ email: email.trim(), password }),
      );
      if (error) throw error;
      const user = data.user;
      if (!user) throw new Error("Credenciais inválidas");

      // E-mail ainda não confirmado: bloqueia e oferece reenvio.
      if (!user.email_confirmed_at) {
        await supabase.auth.signOut({ scope: "local" });
        setAwaitingConfirm(email.trim());
        return;
      }

      const access = await resolveWiizeApiAccess(user);
      if (access.error) throw access.error;
      if (!access.hasAccess) {
        await supabase.auth.signOut({ scope: "local" });
        setAuthMessage("Este e-mail ainda não possui acesso à Wiize API. Crie sua conta grátis para continuar.");
        return;
      }

      navigate("/api/dashboard", { replace: true });
    } catch (err: any) {
      const msg = String(err?.message || "");
      if (/not confirmed/i.test(msg)) {
        setAwaitingConfirm(email.trim());
      } else {
        setAuthMessage(
          /invalid login credentials/i.test(msg)
            ? "E-mail ou senha inválidos. Verifique os dados e tente novamente."
            : msg || "Não foi possível entrar agora. Tente novamente em instantes.",
        );
      }
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="flex min-h-screen bg-background">
      <Helmet>
        <title>{isSignup ? "Criar conta no Wiize API" : "Entrar no Wiize API"}</title>
        <meta
          name="description"
          content="Acesse seu workspace Wiize API para gerenciar API Keys, créditos e consumo da inteligência de prospecção."
        />
        <meta name="robots" content="noindex" />
      </Helmet>

      {/* Painel esquerdo com plasma verde */}
      <div
        className="relative hidden w-1/2 overflow-hidden border-r border-primary/20 lg:block"
        style={{ backgroundColor: "hsl(var(--primary))" }}
      >
        <div className="absolute inset-0 opacity-50 mix-blend-screen">
          <ShaderBackground className="h-full w-full" />
        </div>
        <div
          className="absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse at 30% 20%, hsl(0 0% 100% / 0.22) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, hsl(0 0% 100% / 0.12) 0%, transparent 45%), linear-gradient(180deg, hsl(158 60% 30% / 0.20) 0%, hsl(158 65% 22% / 0.35) 100%)",
          }}
        />
      </div>

      {/* Formulário */}
      <div className="flex w-full items-center justify-center px-6 py-10 sm:px-10 sm:py-12 lg:w-1/2">
        <div className="w-full max-w-[430px]">
          <Link
            to="/api"
            className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft size={16} />
            Voltar para o site
          </Link>

          <div className="mb-6 flex items-center gap-3">
            <img src={wiizeLogo} alt="Wiize" className="h-9 w-9 object-contain" />
            <span className="text-lg font-bold tracking-tight">
              Wiize <span className="font-semibold text-muted-foreground">API</span>
            </span>
          </div>

          {awaitingConfirm ? (
            <div className="animate-fade-in">
              <h1 className="text-2xl font-semibold tracking-tight">Confirme seu e-mail</h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Enviamos um link de confirmação para{" "}
                <span className="font-medium text-foreground">{awaitingConfirm}</span>. Depois de
                confirmar, sua conta Wiize API é liberada e você já pode entrar.
              </p>
              <div className="mt-6 space-y-2">
                <Button className="w-full" variant="outline" onClick={resendConfirmation} disabled={resending}>
                  {resending && <Loader2 size={16} className="mr-2 animate-spin" />}
                  Reenviar e-mail de confirmação
                </Button>
                <Button
                  className="w-full"
                  onClick={() => {
                    setAwaitingConfirm(null);
                    switchMode("login");
                  }}
                >
                  Já confirmei, entrar
                </Button>
              </div>
            </div>
          ) : (
          <>
          <h1 className="text-2xl font-semibold tracking-tight">
            {isSignup ? "Criar conta grátis" : "Entrar no Wiize API"}
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            {isSignup
              ? step === 1
                ? "Sem cartão de crédito. Gere sua API Key em minutos."
                : "Dados de faturamento para acelerar sua primeira compra."
              : "Acesse seu workspace, API Keys, créditos e uso."}
          </p>

          {/* Toggle login / cadastro com indicador deslizante */}
          <div className="relative mt-6 grid grid-cols-2 gap-1 rounded-xl border border-border bg-muted/50 p-1">
            <div
              aria-hidden
              className="absolute inset-y-1 w-[calc(50%-0.25rem)] rounded-lg bg-background shadow-sm transition-transform duration-300 ease-out"
              style={{ transform: `translateX(${isSignup ? "calc(100% + 0.25rem)" : "0px"})`, left: "0.25rem" }}
            />
            {(["login", "signup"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={cn(
                  "relative z-10 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200",
                  mode === m ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m === "login" ? "Entrar" : "Cadastrar-se"}
              </button>
            ))}
          </div>

          {/* Indicador de etapas */}
          {isSignup && (
            <div className="mt-5 flex items-center gap-3">
              {[1, 2].map((s) => (
                <div key={s} className="flex flex-1 items-center gap-2">
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition-colors duration-300",
                      step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {step > s ? <Check size={13} strokeWidth={3} /> : s}
                  </span>
                  <span className={cn("text-xs transition-colors", step >= s ? "text-foreground" : "text-muted-foreground")}>
                    {s === 1 ? "Sua conta" : "Endereço"}
                  </span>
                  {s === 1 && (
                    <span className="h-px flex-1 bg-border">
                      <span
                        className="block h-px bg-primary transition-all duration-300"
                        style={{ width: step > 1 ? "100%" : "0%" }}
                      />
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          <form onSubmit={submit} className="mt-6 [&_button[role=combobox]]:focus:ring-0 [&_button[role=combobox]]:focus:ring-offset-0 [&_button[role=combobox]]:focus:border-foreground/25 [&_input]:transition-colors [&_input]:focus-visible:ring-0 [&_input]:focus-visible:ring-offset-0 [&_input]:focus-visible:border-foreground/30">
            <AutoHeight deps={[mode, step]}>
              <div key={`${mode}-${step}`} className="animate-fade-in space-y-4 pb-1">
                {isSignup && step === 1 && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="api-name">Nome completo</Label>
                      <Input
                        id="api-name"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Seu nome"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="api-company">Empresa</Label>
                      <Input
                        id="api-company"
                        required
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder="Nome da empresa"
                      />
                    </div>
                  </>
                )}

                {(!isSignup || step === 1) && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="api-email">E-mail corporativo</Label>
                      <Input
                        id="api-email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="voce@empresa.com.br"
                      />
                    </div>

                    <PasswordField
                      id="api-password"
                      value={password}
                      onChange={setPassword}
                      autoComplete={isSignup ? "new-password" : "current-password"}
                      showStrength={isSignup}
                      rightSlot={
                        !isSignup ? (
                          <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                            Esqueci minha senha
                          </Link>
                        ) : null
                      }
                    />
                  </>
                )}

                {isSignup && step === 2 && (
                  <>
                    <div className="grid grid-cols-[110px_1fr] gap-3">
                      <div className="space-y-2">
                        <Label>Documento</Label>
                        <Select value={docType} onValueChange={(v) => { setDocType(v as "cnpj" | "cpf"); setDocNumber(""); }}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-popover">
                            <SelectItem value="cnpj">CNPJ</SelectItem>
                            <SelectItem value="cpf">CPF</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="api-doc">{docType === "cnpj" ? "CNPJ da empresa" : "CPF"}</Label>
                        <Input
                          id="api-doc"
                          required
                          inputMode="numeric"
                          value={docNumber}
                          onChange={(e) => setDocNumber(docType === "cnpj" ? maskCNPJ(e.target.value) : maskCPF(e.target.value))}
                          placeholder={docType === "cnpj" ? "00.000.000/0000-00" : "000.000.000-00"}
                          className={cn(docNumber && !docValid && "border-destructive focus-visible:!border-destructive")}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="api-phone">Telefone</Label>
                      <Input
                        id="api-phone"
                        required
                        inputMode="numeric"
                        value={phone}
                        onChange={(e) => setPhone(maskPhone(e.target.value))}
                        placeholder="(11) 99999-9999"
                      />
                    </div>

                    <div className="grid grid-cols-[150px_1fr] gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="api-cep">CEP</Label>
                        <div className="relative">
                          <Input
                            id="api-cep"
                            required
                            inputMode="numeric"
                            value={cep}
                            onChange={(e) => setCep(maskCEP(e.target.value))}
                            placeholder="00000-000"
                            className={cn("pr-9", cepError && "border-destructive focus-visible:!border-destructive")}
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
                            {cepLoading ? (
                              <Loader2 size={14} className="animate-spin text-muted-foreground" />
                            ) : cepOk ? (
                              <Check size={14} className="text-primary" />
                            ) : (
                              <MapPin size={14} className="text-muted-foreground" />
                            )}
                          </span>
                        </div>
                        {cepError && <p className="text-[11px] text-destructive">{cepError}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="api-street">Endereço</Label>
                        <Input
                          id="api-street"
                          required
                          value={street}
                          onChange={(e) => setStreet(e.target.value)}
                          placeholder="Rua, avenida..."
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="api-number">Número</Label>
                        <Input
                          id="api-number"
                          required
                          value={streetNumber}
                          onChange={(e) => setStreetNumber(e.target.value)}
                          placeholder="123"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="api-complement">Complemento</Label>
                        <Input
                          id="api-complement"
                          value={complement}
                          onChange={(e) => setComplement(e.target.value)}
                          placeholder="Sala, andar (opcional)"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="api-neighborhood">Bairro</Label>
                      <Input
                        id="api-neighborhood"
                        value={neighborhood}
                        onChange={(e) => setNeighborhood(e.target.value)}
                        placeholder="Bairro"
                      />
                    </div>

                    <div className="grid grid-cols-[1fr_110px] gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="api-city">Cidade</Label>
                        <Input
                          id="api-city"
                          required
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="Cidade"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>UF</Label>
                        <Select value={uf} onValueChange={setUf}>
                          <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                          <SelectContent className="max-h-64 bg-popover">
                            {BR_STATES.map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <p className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
                      Usamos esses dados apenas para emissão fiscal e para agilizar suas compras de créditos
                      no PIX ou cartão, sem pedir tudo de novo.
                    </p>
                  </>
                )}
              </div>
            </AutoHeight>

            <div className="mt-5 space-y-2">
              <Button
                type="submit"
                className="w-full gap-2"
                disabled={loading || (isSignup && (step === 1 ? !step1Valid : !step2Valid))}
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {isSignup ? (step === 1 ? "Continuar" : "Criar conta grátis") : "Entrar"}
                {isSignup && step === 1 && !loading && <ArrowRight size={16} />}
              </Button>

              {isSignup && step === 2 && (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full gap-2 text-muted-foreground"
                  onClick={() => setStep(1)}
                  disabled={loading}
                >
                  <ArrowLeft size={16} /> Voltar
                </Button>
              )}

              {authMessage && (
                <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2.5 text-left text-xs leading-relaxed text-foreground">
                  <CircleAlert size={15} className="mt-0.5 shrink-0 text-destructive" />
                  <span>{authMessage}</span>
                </div>
              )}
            </div>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            {isSignup ? "Já tem uma conta? " : "Não tem uma conta? "}
            <button
              type="button"
              onClick={() => switchMode(isSignup ? "login" : "signup")}
              className="font-medium text-primary hover:underline"
            >
              {isSignup ? "Entrar" : "Criar conta grátis"}
            </button>
          </p>
          </>
          )}


          <div className="mt-8 flex items-start gap-2.5 rounded-lg border border-border bg-muted/40 px-3.5 py-3 text-xs leading-relaxed text-muted-foreground">
            <Lock size={14} className="mt-0.5 shrink-0 text-primary" strokeWidth={1.75} />
            Conexão criptografada. Nunca compartilhe sua senha ou API Keys. A Wiize jamais solicita
            essas informações por e-mail ou telefone.
          </div>
        </div>
      </div>
    </div>
  );
}
