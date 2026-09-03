import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Loader2, Lock, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ShaderBackground } from "@/components/ui/warmth-ripple";
import wiizeLogo from "@/assets/logo-icon-new.png";

type Mode = "login" | "signup";

export default function ApiLogin() {
  const [params, setParams] = useSearchParams();
  const initialMode: Mode = params.get("modo") === "cadastro" ? "signup" : "login";
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const isSignup = mode === "signup";

  const switchMode = (next: Mode) => {
    setMode(next);
    const p = new URLSearchParams(params);
    if (next === "signup") p.set("modo", "cadastro");
    else p.delete("modo");
    setParams(p, { replace: true });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    if (isSignup) {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/api/login`,
          data: {
            full_name: name.trim(),
            company_name: company.trim(),
            wiize_product: "wiize_api",
          },
        },
      });
      setLoading(false);
      if (error) {
        toast({
          title: "Não foi possível criar a conta",
          description: error.message,
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Conta criada",
        description: "Confirme seu e-mail para ativar o acesso ao Wiize API.",
      });
      switchMode("login");
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (error || !data.user) {
      toast({
        title: "Falha no login",
        description: error?.message || "Credenciais inválidas",
        variant: "destructive",
      });
      return;
    }
    navigate("/api/dashboard", { replace: true });
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
      <div className="flex w-full items-center justify-center px-5 py-12 lg:w-1/2">
        <div className="w-full max-w-[400px]">
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

          <h1 className="text-2xl font-semibold tracking-tight">
            {isSignup ? "Criar conta grátis" : "Entrar no Wiize API"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isSignup
              ? "Sem cartão de crédito. Gere sua API Key em minutos."
              : "Acesse seu workspace, API Keys, créditos e uso."}
          </p>

          {/* Toggle login / cadastro */}
          <div className="mt-6 grid grid-cols-2 gap-1 rounded-xl border border-border bg-muted/50 p-1">
            {(["login", "signup"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  mode === m
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "login" ? "Entrar" : "Cadastrar-se"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {isSignup && (
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

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="api-password">Senha</Label>
                {!isSignup && (
                  <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                    Esqueci minha senha
                  </Link>
                )}
              </div>
              <Input
                id="api-password"
                type="password"
                autoComplete={isSignup ? "new-password" : "current-password"}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              {isSignup && (
                <p className="text-xs text-muted-foreground">Mínimo de 8 caracteres.</p>
              )}
            </div>

            <Button type="submit" className="w-full gap-2" disabled={loading}>
              {loading && <Loader2 size={16} className="animate-spin" />}
              {isSignup ? "Criar conta grátis" : "Entrar"}
            </Button>
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
