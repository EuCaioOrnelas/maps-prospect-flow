import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { Eye, EyeOff, ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { SEO } from "@/components/SEO";
import { useAutoScoreTracking } from "@/hooks/useAutoScoreTracking";
import { supabase } from "@/integrations/supabase/client";
import { Separator } from "@/components/ui/separator";
import googleLogo from "@/assets/icons/google-logo.png";

const getLoginErrorMessage = (error: Error): { title: string; description: string } => {
  const msg = error.message?.toLowerCase() || "";

  if (msg.includes("invalid login credentials") || msg.includes("invalid_credentials")) {
    return { title: "Credenciais incorretas", description: "Email ou senha incorretos. Verifique e tente novamente." };
  }
  if (msg.includes("email not confirmed") || msg.includes("email_not_confirmed")) {
    return { title: "Email não confirmado", description: "Você precisa confirmar seu email antes de fazer login. Verifique sua caixa de entrada e spam." };
  }
  if (msg.includes("over_email_send_rate_limit") || msg.includes("rate limit") || (msg.includes("after") && msg.includes("seconds"))) {
    return { title: "Muitas tentativas", description: "Aguarde 30 segundos antes de tentar novamente." };
  }
  if (msg.includes("network") || msg.includes("fetch") || msg.includes("failed to fetch")) {
    return { title: "Erro de conexão", description: "Verifique sua internet e tente novamente." };
  }
  if (msg.includes("user_banned") || msg.includes("blocked")) {
    return { title: "Conta bloqueada", description: "Sua conta foi bloqueada. Entre em contato com o suporte." };
  }

  console.error("[Login Error]", error.message);
  return { title: "Erro no login", description: "Algo deu errado. Tente novamente em alguns segundos." };
};

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signIn, user, isTrialExpired, profile, loading } = useAuth();
  useAutoScoreTracking("login");

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) {
      setIsGoogleLoading(false);
      toast({ title: "Erro ao entrar com Google", description: error.message, variant: "destructive" });
    }
  };

  useEffect(() => {
    // Wait for profile to load before redirecting
    if (user && !loading) {
      // If trial expired and user is on free plan, redirect to upgrade
      if (isTrialExpired && profile?.plan === 'free') {
        navigate("/upgrade?expired=true");
      } else {
        navigate("/dashboard");
      }
    }
  }, [user, loading, isTrialExpired, profile, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      setIsLoading(false);
      const { title, description } = getLoginErrorMessage(error);
      toast({ title, description, variant: "destructive" });
      return;
    }

    toast({
      title: "Login realizado!",
      description: "Redirecionando...",
    });
    // Redirect will be handled by useEffect based on trial status
    setIsLoading(false);
  };

  return (
    <>
      <SEO 
        title="Entrar na Plataforma"
        description="Faça login na Wiize e acesse sua plataforma de prospecção inteligente. Gerencie leads, campanhas WhatsApp e agentes de IA."
        url="https://wiize.com.br/login"
        keywords="login Wiize, entrar Wiize, acessar plataforma prospecção"
        noIndex
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
              Bem-vindo de volta
            </h1>
            <p className="text-muted-foreground text-center mb-6 sm:mb-8 text-sm sm:text-base">
              Entre na sua conta para continuar prospectando
            </p>

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
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
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 sm:h-12 bg-secondary border-border pr-12 text-sm sm:text-base"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <Link to="/forgot-password" className="text-xs sm:text-sm text-primary hover:underline">
                  Esqueceu sua senha?
                </Link>
              </div>

              <Button
                type="submit"
                variant="hero"
                size="lg"
                className="w-full h-11 sm:h-12 text-sm sm:text-base"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={18} />
                    Entrando...
                  </>
                ) : (
                  "Entrar"
                )}
              </Button>
            </form>

            <p className="text-center text-muted-foreground mt-4 sm:mt-6 text-xs sm:text-sm">
              Não tem uma conta?{" "}
              <Link to="/signup" className="text-primary hover:underline">
                Criar conta grátis
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;
