import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { ArrowLeft, Eye, EyeOff, Loader2, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/SEO";
import { PasswordStrength, isPasswordStrong } from "@/components/ui/password-strength";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifyingLink, setIsVerifyingLink] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    const rejectLink = () => {
      if (!mounted) return;
      toast({
        title: "Link inválido",
        description: "O link de recuperação expirou ou é inválido.",
        variant: "destructive",
      });
      navigate("/login");
    };

    const verifyRecoveryLink = async () => {
      const query = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const urlError = hash.get("error_description") || query.get("error_description");

      if (urlError) {
        toast({
          title: "Link inválido",
          description: urlError,
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      const code = query.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          rejectLink();
          return;
        }
        window.history.replaceState({}, document.title, "/reset-password");
      } else {
        const accessToken = hash.get("access_token");
        const refreshToken = hash.get("refresh_token");
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) {
            rejectLink();
            return;
          }
          window.history.replaceState({}, document.title, "/reset-password");
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        rejectLink();
        return;
      }

      if (mounted) {
        setIsVerifyingLink(false);
      }
    };

    verifyRecoveryLink();

    return () => {
      mounted = false;
    };
  }, [navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem.",
        variant: "destructive",
      });
      return;
    }

    if (!isPasswordStrong(password)) {
      toast({
        title: "Senha muito fraca",
        description: "Sua senha precisa atender pelo menos 4 critérios de segurança.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    setIsLoading(false);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível redefinir a senha. Tente novamente.",
        variant: "destructive",
      });
      return;
    }

    setIsSuccess(true);
    toast({
      title: "Senha redefinida!",
      description: "Sua senha foi alterada com sucesso.",
    });

    setTimeout(() => {
      navigate("/dashboard");
    }, 2000);
  };

  return (
    <>
      <SEO 
        title="Redefinir Senha"
        description="Redefina sua senha do Wiize."
        noIndex
      />
      <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="absolute inset-0 bg-gradient-glow opacity-30" />
        
        <div className="w-full max-w-md relative z-10">
          <Link to="/login" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 sm:mb-8 transition-colors text-sm sm:text-base">
            <ArrowLeft size={16} />
            <span>Voltar para login</span>
          </Link>

          <div className="glass rounded-2xl p-6 sm:p-8">
            <div className="flex justify-center mb-6 sm:mb-8">
              <Logo size="lg" />
            </div>

            {isVerifyingLink ? (
              <div className="flex flex-col items-center gap-4 py-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Validando link de recuperação...</p>
              </div>
            ) : !isSuccess ? (
              <>
                <h1 className="font-display text-xl sm:text-2xl font-bold text-center mb-2">
                  Redefinir senha
                </h1>
                <p className="text-muted-foreground text-center mb-6 sm:mb-8 text-sm sm:text-base">
                  Digite sua nova senha abaixo
                </p>

                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm sm:text-base">Nova senha</Label>
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
                    <PasswordStrength password={password} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm sm:text-base">Confirmar senha</Label>
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="h-11 sm:h-12 bg-secondary border-border text-sm sm:text-base"
                    />
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
                        Redefinindo...
                      </>
                    ) : (
                      "Redefinir senha"
                    )}
                  </Button>
                </form>
              </>
            ) : (
              <div className="text-center">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 sm:mb-6">
                  <Check size={28} className="text-primary sm:hidden" />
                  <Check size={32} className="text-primary hidden sm:block" />
                </div>
                <h1 className="font-display text-xl sm:text-2xl font-bold mb-2">
                  Senha redefinida!
                </h1>
                <p className="text-muted-foreground text-sm sm:text-base">
                  Redirecionando para o dashboard...
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ResetPassword;
