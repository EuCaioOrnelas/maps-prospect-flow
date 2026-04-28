import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, ArrowLeft, Check, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { PasswordStrength, isPasswordStrong } from "@/components/ui/password-strength";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { EmailVerificationDialog } from "@/components/EmailVerificationDialog";
import { Separator } from "@/components/ui/separator";
import googleLogo from "@/assets/icons/google-logo.png";

const getSignupErrorMessage = (error: Error): { title: string; description: string } => {
  const msg = error.message?.toLowerCase() || "";

  if (msg.includes("user already registered") || msg.includes("already been registered")) {
    return {
      title: "Email já cadastrado",
      description: "Este email já possui uma conta. Tente fazer login ou use outro email.",
    };
  }

  if (msg.includes("over_email_send_rate_limit") || msg.includes("rate limit") || msg.includes("after") && msg.includes("seconds")) {
    return {
      title: "Conta já criada!",
      description: "Sua conta já foi criada com sucesso! Verifique seu email para confirmar o cadastro. Não esqueça de olhar na pasta de Spam/Lixo eletrônico.",
    };
  }

  if (msg.includes("invalid email") || msg.includes("invalid_email")) {
    return {
      title: "Email inválido",
      description: "O formato do email está incorreto. Verifique e tente novamente.",
    };
  }

  if (msg.includes("password") && (msg.includes("weak") || msg.includes("short") || msg.includes("least"))) {
    return {
      title: "Senha muito fraca",
      description: "A senha precisa ter pelo menos 8 caracteres com letras e números.",
    };
  }

  if (msg.includes("network") || msg.includes("fetch") || msg.includes("failed to fetch")) {
    return {
      title: "Erro de conexão",
      description: "Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.",
    };
  }

  if (msg.includes("timeout") || msg.includes("timed out")) {
    return {
      title: "Servidor demorou para responder",
      description: "O servidor está lento no momento. Tente novamente em alguns segundos.",
    };
  }

  if (msg.includes("signup_disabled") || msg.includes("signups not allowed")) {
    return {
      title: "Cadastro desativado",
      description: "O cadastro de novas contas está temporariamente desativado. Tente mais tarde.",
    };
  }

  // Fallback genérico com a mensagem técnica para debugging
  console.error("[Signup Error]", error.message);
  return {
    title: "Erro ao criar conta",
    description: "Algo deu errado. Aguarde alguns segundos e tente novamente. Se o problema persistir, entre em contato com o suporte.",
  };
};

const Signup = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const isSubmittingRef = useRef(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signUp, user } = useAuth();

  const handleGoogleSignUp = async () => {
    setIsGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) {
      setIsGoogleLoading(false);
      toast({ title: "Erro ao criar conta com Google", description: error.message, variant: "destructive" });
    }
  };

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
      return;
    }
    // Novo fluxo: força usuário a escolher plano + cartão antes
    if (!sessionStorage.getItem("trial_plan_chosen")) {
      navigate("/signup/escolher-plano", { replace: true });
    } else {
      navigate("/signup/cartao-trial", { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Guard against double submission
    if (isSubmittingRef.current || isLoading) return;
    
    if (!acceptedTerms) {
      toast({
        title: "Termos não aceitos",
        description: "Você precisa aceitar os Termos de Uso e a Política de Reembolso para criar sua conta.",
        variant: "destructive",
      });
      return;
    }

    if (!isPasswordStrong(password)) {
      toast({
        title: "Senha muito fraca",
        description: "Sua senha precisa ser média ou forte. Adicione mais caracteres, números ou símbolos especiais.",
        variant: "destructive",
      });
      return;
    }

    isSubmittingRef.current = true;
    setIsLoading(true);

    const { error } = await signUp(email, password, name);

    if (error) {
      setIsLoading(false);
      isSubmittingRef.current = false;
      const { title, description } = getSignupErrorMessage(error);
      toast({ title, description, variant: "destructive" });
      return;
    }

    // Tracking is handled by AuthContext on SIGNED_IN event (after email verification)
    // This ensures it works even if verification happens on a different device

    // Show email verification dialog
    setShowEmailVerification(true);
    setIsLoading(false);
    // Note: don't reset isSubmittingRef here - prevent re-submission after success
  };

  const handleRetry = () => {
    setShowEmailVerification(false);
    setEmail("");
    setPassword("");
    setName("");
    setAcceptedTerms(false);
    isSubmittingRef.current = false;
  };

  const benefits = [
    "Até 120 oportunidades geradas",
    "Acesso total: CRM, IA, Fluxos, Campanhas",
    "7 dias grátis — sem cartão de crédito",
  ];

  return (
    <>
      <SEO 
        title="Cadastre-se Grátis"
        description="Crie sua conta grátis no Wiize e ganhe 10 buscas estratégicas. Prospecte leads com IA, faça disparos via WhatsApp e converta mais clientes. Sem cartão de crédito!"
        url="https://wiize.com.br/signup"
        keywords="cadastro Wiize, criar conta grátis, prospecção grátis, teste grátis prospecção"
      />
      <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-x-hidden">
        <div className="absolute inset-0 bg-gradient-glow opacity-30" />
        
        <div className="w-full max-w-md relative z-10">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 sm:mb-8 transition-colors text-sm sm:text-base">
            <ArrowLeft size={16} />
            <span>Voltar para home</span>
          </Link>

          <div className="glass rounded-2xl p-6 sm:p-8">
            <div className="flex justify-center mb-6 sm:mb-8">
              <Logo size="lg" />
            </div>

            <h1 className="font-display text-xl sm:text-2xl font-bold text-center mb-2">
              Crie sua conta grátis
            </h1>
            <p className="text-muted-foreground text-center mb-4 sm:mb-6 text-sm sm:text-base">
              Comece a prospectar novos clientes agora
            </p>

            {/* Benefits */}
            <div className="bg-primary/10 rounded-xl p-3 sm:p-4 mb-6 sm:mb-8">
              <ul className="space-y-2">
                {benefits.map((benefit, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs sm:text-sm">
                    <Check size={14} className="text-primary flex-shrink-0" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm sm:text-base">Nome</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="h-11 sm:h-12 bg-secondary border-border text-sm sm:text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm sm:text-base">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 sm:h-12 bg-secondary border-border text-sm sm:text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm sm:text-base">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Crie uma senha forte"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="h-11 sm:h-12 bg-secondary border-border pr-12 text-foreground text-sm sm:text-base"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                <PasswordStrength password={password} />
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="terms"
                  checked={acceptedTerms}
                  onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                  className="mt-0.5"
                />
                <Label htmlFor="terms" className="text-xs sm:text-sm text-muted-foreground leading-relaxed cursor-pointer">
                  Li e aceito os{" "}
                  <Link to="/terms" className="text-primary hover:underline" target="_blank">
                    Termos de Uso
                  </Link>
                  ,{" "}
                  <Link to="/privacy" className="text-primary hover:underline" target="_blank">
                    Política de Privacidade
                  </Link>{" "}
                  e{" "}
                  <Link to="/refund-policy" className="text-primary hover:underline" target="_blank">
                    Política de Reembolso
                  </Link>
                </Label>
              </div>

              <Button
                type="submit"
                variant="hero"
                size="lg"
                className="w-full h-11 sm:h-12 text-sm sm:text-base"
                disabled={isLoading || !acceptedTerms}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={18} />
                    Criando conta...
                  </>
                ) : (
                  "Criar conta grátis"
                )}
              </Button>
            </form>

            <p className="text-center text-muted-foreground mt-3 sm:mt-4 text-xs sm:text-sm">
              Já tem uma conta?{" "}
              <Link to="/login" className="text-primary hover:underline">
                Fazer login
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Email Verification Dialog */}
      <EmailVerificationDialog
        open={showEmailVerification}
        onOpenChange={setShowEmailVerification}
        email={email}
        onRetry={handleRetry}
      />
    </>
  );
};

export default Signup;
