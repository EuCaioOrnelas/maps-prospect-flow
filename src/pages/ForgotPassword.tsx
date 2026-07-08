import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { ArrowLeft, Mail, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/SEO";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return; // anti-duplo-clique
    setIsLoading(true);

    // Rate limit: 1 pedido / 15 min por e-mail
    const rlKey = (email || "").trim().toLowerCase();
    if (rlKey) {
      const { data: rl } = await supabase.rpc("check_rate_limit", {
        p_identifier: rlKey,
        p_endpoint: "forgot_password",
        p_max_requests: 1,
        p_window_seconds: 900,
      });
      if (rl && (rl as any).allowed === false) {
        const { formatRetryAfter } = await import("@/lib/rateLimitFormat");
        setIsLoading(false);
        toast({
          title: "Aguarde antes de solicitar novamente",
          description: `Você já pediu um link recentemente. Tente novamente em ${formatRetryAfter((rl as any).retry_after)}.`,
          variant: "destructive",
        });
        return;
      }
    }

    const redirectUrl = `${window.location.origin}/reset-password`;
    console.log("Reset password redirectTo:", redirectUrl);
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    setIsLoading(false);

    if (error) {
      console.error("Reset password error:", error.message, error.status);
      
      // Supabase retorna erro de rate limit ou outros erros específicos
      let errorMessage = "Não foi possível enviar o email. Tente novamente em alguns minutos.";
      
      if (error.message?.includes("rate") || error.message?.includes("limit") || error.status === 429) {
        errorMessage = "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
      } else if (error.message?.includes("not found") || error.message?.includes("not registered")) {
        errorMessage = "Email não encontrado. Verifique se o endereço está correto.";
      }
      
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
      return;
    }

    setEmailSent(true);
    toast({
      title: "Email enviado!",
      description: "Verifique sua caixa de entrada para redefinir sua senha.",
    });
  };

  return (
    <>
      <SEO 
        title="Recuperar Senha"
        description="Recupere sua senha do Wiize. Enviaremos um link para redefinir sua senha."
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

            {!emailSent ? (
              <>
                <h1 className="font-display text-xl sm:text-2xl font-bold text-center mb-2">
                  Esqueceu sua senha?
                </h1>
                <p className="text-muted-foreground text-center mb-6 sm:mb-8 text-sm sm:text-base">
                  Digite seu email e enviaremos um link para redefinir sua senha
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
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Mail size={18} className="mr-2" />
                        Enviar link de recuperação
                      </>
                    )}
                  </Button>
                </form>
              </>
            ) : (
              <div className="text-center">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 sm:mb-6">
                  <Mail size={28} className="text-primary sm:hidden" />
                  <Mail size={32} className="text-primary hidden sm:block" />
                </div>
                <h1 className="font-display text-xl sm:text-2xl font-bold mb-2">
                  Verifique seu email
                </h1>
                <p className="text-muted-foreground mb-4 sm:mb-6 text-sm sm:text-base">
                  Enviamos um link de recuperação para <strong className="break-all">{email}</strong>
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Não recebeu o email?{" "}
                  <button
                    onClick={() => setEmailSent(false)}
                    className="text-primary hover:underline"
                  >
                    Tentar novamente
                  </button>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ForgotPassword;
