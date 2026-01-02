import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { Eye, EyeOff, ArrowLeft, Check, Loader2, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { PasswordStrength, isPasswordStrong } from "@/components/ui/password-strength";
import { SEO } from "@/components/SEO";

const Signup = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signUp, user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isPasswordStrong(password)) {
      toast({
        title: "Senha muito fraca",
        description: "Sua senha precisa ser média ou forte. Adicione mais caracteres, números ou símbolos especiais.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    const { error } = await signUp(email, password, name);

    if (error) {
      setIsLoading(false);
      let errorMessage = "Erro ao criar conta. Tente novamente.";
      
      if (error.message.includes("User already registered")) {
        errorMessage = "Este email já está cadastrado. Faça login.";
      } else if (error.message.includes("Invalid email")) {
        errorMessage = "Email inválido. Verifique o formato.";
      }

      toast({
        title: "Erro no cadastro",
        description: errorMessage,
        variant: "destructive",
      });
      return;
    }

    // Show email verification message
    setEmailSent(true);
    setIsLoading(false);
  };

  const benefits = [
    "10 buscas estratégicas grátis",
    "Download ilimitado de leads",
    "Sem cartão de crédito",
  ];

  return (
    <>
      <SEO 
        title="Criar Conta Grátis"
        description="Crie sua conta grátis no WiizeProspect e ganhe 10 buscas estratégicas. Comece a prospectar novos clientes com inteligência artificial."
        keywords="criar conta, cadastro, prospecção grátis, leads grátis, vendas B2B"
      />
      <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6 lg:p-8">
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

            {emailSent ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                  <Mail size={32} className="text-primary" />
                </div>
                <h2 className="font-display text-xl sm:text-2xl font-bold mb-2">
                  Verifique seu email
                </h2>
                <p className="text-muted-foreground mb-4 text-sm sm:text-base">
                  Enviamos um link de confirmação para:
                </p>
                <p className="font-semibold text-foreground mb-6">{email}</p>
                <p className="text-muted-foreground text-xs sm:text-sm mb-4">
                  Clique no link do email para ativar sua conta e começar a prospectar.
                </p>
                <div className="bg-secondary/50 rounded-lg p-3 text-xs text-muted-foreground">
                  Não recebeu? Verifique a pasta de spam ou{" "}
                  <button 
                    onClick={() => setEmailSent(false)} 
                    className="text-primary hover:underline"
                  >
                    tente novamente
                  </button>
                </div>
              </div>
            ) : (
              <>
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
                        Criando conta...
                      </>
                    ) : (
                      "Criar conta grátis"
                    )}
                  </Button>
                </form>

                <p className="text-center text-muted-foreground mt-4 sm:mt-6 text-xs sm:text-sm">
                  Ao criar uma conta, você concorda com nossos{" "}
                  <Link to="/terms" className="text-primary hover:underline">
                    Termos de Uso
                  </Link>{" "}
                  e{" "}
                  <Link to="/privacy" className="text-primary hover:underline">
                    Política de Privacidade
                  </Link>
                </p>

                <p className="text-center text-muted-foreground mt-3 sm:mt-4 text-xs sm:text-sm">
                  Já tem uma conta?{" "}
                  <Link to="/login" className="text-primary hover:underline">
                    Fazer login
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Signup;
