import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, ShieldCheck, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import wiizeLogo from "@/assets/logo-icon-new.png";
import loginBg from "@/assets/partner-login-bg.jpg";

export default function PartnerLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error || !data.user) {
      setLoading(false);
      toast({ title: "Falha no login", description: error?.message || "Credenciais inválidas", variant: "destructive" });
      return;
    }
    const { data: partner } = await supabase.from("partners").select("id").eq("user_id", data.user.id).maybeSingle();
    if (!partner) {
      await supabase.auth.signOut();
      setLoading(false);
      toast({ title: "Acesso negado", description: "Esta conta não é um parceiro Wiize.", variant: "destructive" });
      return;
    }
    navigate("/partners", { replace: true });
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left side - Branding with soft background image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#31AA62]">
        {/* Soft decorative background */}
        <img
          src={loginBg}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover opacity-25 mix-blend-soft-light pointer-events-none select-none"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary-foreground)/0.18),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,hsl(var(--primary-foreground)/0.12),transparent_55%)]" />

        <div className="relative z-10 flex flex-col justify-between p-12 text-primary-foreground w-full">
          <div />

          <div className="space-y-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-foreground/10 backdrop-blur-sm text-xs font-medium mb-6">
                <Sparkles size={12} /> Programa exclusivo de parceiros
              </div>
              <h1 className="text-4xl xl:text-5xl font-bold leading-tight tracking-tight">
                Indique. Ganhe.<br />Cresça com a Wiize.
              </h1>
              <p className="mt-4 text-base opacity-90 max-w-md leading-relaxed">
                Acompanhe seus leads, comissões recorrentes e saques em tempo real. Tudo num só lugar.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 max-w-sm">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-primary-foreground/5 backdrop-blur-sm border border-primary-foreground/10">
                <div className="h-8 w-8 rounded-md bg-primary-foreground/15 flex items-center justify-center shrink-0">
                  <TrendingUp size={16} />
                </div>
                <div>
                  <div className="text-sm font-semibold">Comissões recorrentes</div>
                  <div className="text-xs opacity-80">Ganhe enquanto seus indicados forem clientes</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-primary-foreground/5 backdrop-blur-sm border border-primary-foreground/10">
                <div className="h-8 w-8 rounded-md bg-primary-foreground/15 flex items-center justify-center shrink-0">
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <div className="text-sm font-semibold">Saques transparentes</div>
                  <div className="text-xs opacity-80">Acompanhe cada centavo do seu saldo</div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-xs opacity-70">
            © {new Date().getFullYear()} Wiize · Programa de Parceiros
          </div>
        </div>
      </div>

      {/* Right side - clean form, no background image */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-background">
        <div className="w-full max-w-md">
          <Card className="border-border/60 shadow-xl shadow-primary/5">
            <CardContent className="p-8">
              <div className="flex flex-col items-center mb-7">
                <Link to="/" className="flex items-center gap-1 mb-4">
                  <img src={wiizeLogo} alt="Wiize" className="h-16 w-16 object-contain" />
                  <div className="flex flex-col leading-tight">
                    <span className="text-2xl font-bold tracking-tight">Wiize</span>
                    <span className="text-xs text-muted-foreground -mt-0.5">Partners</span>
                  </div>
                </Link>
                <h2 className="text-2xl font-bold tracking-tight">Entrar no portal</h2>
                <p className="text-sm text-muted-foreground mt-1.5 text-center">
                  Acesse seu painel de parceiro Wiize.
                </p>
              </div>

              <form onSubmit={submit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
                <Button type="submit" className="w-full h-11 font-semibold bg-[#31AA62] hover:bg-[#2a9555] text-white" disabled={loading}>
                  {loading ? (
                    <><Loader2 className="animate-spin mr-2" size={16} />Entrando...</>
                  ) : (
                    "Acessar portal"
                  )}
                </Button>
              </form>

              <div className="mt-6 pt-6 border-t border-border/60 text-center space-y-2">
                <p className="text-xs text-muted-foreground">
                  Esqueceu a senha? Entre em contato com o administrador.
                </p>
                <p className="text-xs text-muted-foreground">
                  Quer ser parceiro?{" "}
                  <Link to="/parceiros" className="text-primary font-medium hover:underline">
                    Candidate-se aqui
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
