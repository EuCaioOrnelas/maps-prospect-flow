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

            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full h-11 sm:h-12 text-sm sm:text-base gap-3 border-border"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
            >
              {isGoogleLoading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11.96 11.96 0 0 0 1 12c0 1.94.46 3.77 1.18 5.07l3.66-2.98z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              )}
              Entrar com Google
            </Button>

            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">ou</span>
              <Separator className="flex-1" />
            </div>

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
