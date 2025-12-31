import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { Eye, EyeOff, ArrowLeft, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { PasswordStrength, isPasswordStrong } from "@/components/ui/password-strength";

const Signup = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signUp, user } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isPasswordStrong(password)) {
      toast({
        title: "Senha fraca",
        description: "A senha deve ter no mínimo 8 caracteres, letra maiúscula, minúscula e número.",
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

    toast({
      title: "Conta criada!",
      description: "Você ganhou 10 buscas grátis. Aproveite!",
    });
    navigate("/dashboard");
    setIsLoading(false);
  };

  const benefits = [
    "10 buscas estratégicas grátis",
    "Download ilimitado de leads",
    "Sem cartão de crédito",
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-glow opacity-30" />
      
      <div className="w-full max-w-md relative z-10">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft size={16} />
          Voltar para home
        </Link>

        <div className="glass rounded-2xl p-8">
          <div className="flex justify-center mb-8">
            <Logo size="lg" />
          </div>

          <h1 className="font-display text-2xl font-bold text-center mb-2">
            Crie sua conta grátis
          </h1>
          <p className="text-muted-foreground text-center mb-6">
            Comece a prospectar novos clientes agora
          </p>

          {/* Benefits */}
          <div className="bg-primary/10 rounded-xl p-4 mb-8">
            <ul className="space-y-2">
              {benefits.map((benefit, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <Check size={16} className="text-primary" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                type="text"
                placeholder="Seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-12 bg-secondary border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 bg-secondary border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Crie uma senha forte"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="h-12 bg-secondary border-border pr-12 text-foreground"
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
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Criando conta..." : "Criar conta grátis"}
            </Button>
          </form>

          <p className="text-center text-muted-foreground mt-6 text-sm">
            Ao criar uma conta, você concorda com nossos{" "}
            <a href="#" className="text-primary hover:underline">
              Termos de Uso
            </a>{" "}
            e{" "}
            <a href="#" className="text-primary hover:underline">
              Política de Privacidade
            </a>
          </p>

          <p className="text-center text-muted-foreground mt-4">
            Já tem uma conta?{" "}
            <Link to="/login" className="text-primary hover:underline">
              Fazer login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
