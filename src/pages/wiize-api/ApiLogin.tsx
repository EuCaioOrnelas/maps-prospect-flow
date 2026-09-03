import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Loader2, ShieldCheck, KeyRound, Terminal, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import wiizeLogo from "@/assets/logo-icon-new.png";

export default function ApiLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
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
        <title>Entrar no Wiize API — Workspace, API Keys e créditos</title>
        <meta
          name="description"
          content="Acesse seu workspace Wiize API para gerenciar API Keys, créditos e consumo da inteligência de prospecção."
        />
      </Helmet>

      {/* Painel de contexto */}
      <div className="relative hidden w-1/2 overflow-hidden border-r border-border bg-card lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,hsl(var(--primary)/0.10),transparent_55%)]" />
        <div className="relative z-10 flex h-full flex-col justify-between p-12">
          <div className="flex items-center gap-3">
            <img src={wiizeLogo} alt="Wiize" className="h-9 w-9 object-contain" />
            <div className="leading-tight">
              <div className="text-base font-bold tracking-tight">Wiize</div>
              <div className="-mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                API
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <h2 className="max-w-md text-3xl font-semibold leading-tight tracking-tight">
              Inteligência de prospecção para o seu sistema
            </h2>
            <ul className="space-y-4 text-sm text-muted-foreground">
              <li className="flex items-start gap-3">
                <Terminal size={16} className="mt-0.5 text-primary" strokeWidth={1.75} />
                Endpoints de análise, diagnóstico e abordagem comercial
              </li>
              <li className="flex items-start gap-3">
                <KeyRound size={16} className="mt-0.5 text-primary" strokeWidth={1.75} />
                Uma API Key por API, com ambientes separados
              </li>
              <li className="flex items-start gap-3">
                <ShieldCheck size={16} className="mt-0.5 text-primary" strokeWidth={1.75} />
                Autenticação em dois fatores do ecossistema Wiize
              </li>
            </ul>
          </div>

          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Wiize — Infraestrutura de inteligência comercial
          </p>
        </div>
      </div>

      {/* Formulário */}
      <div className="flex w-full items-center justify-center px-5 py-12 lg:w-1/2">
        <div className="w-full max-w-[400px]">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <img src={wiizeLogo} alt="Wiize" className="h-8 w-8 object-contain" />
            <span className="text-sm font-semibold">
              Wiize <span className="text-muted-foreground">API</span>
            </span>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight">Entrar no Wiize API</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acesse seu workspace, API Keys, créditos e uso.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-email">E-mail</Label>
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
                <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                  Esqueci minha senha
                </Link>
              </div>
              <Input
                id="api-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <Button type="submit" className="w-full gap-2" disabled={loading}>
              {loading && <Loader2 size={16} className="animate-spin" />}
              Entrar
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Não tenho uma conta{" "}
            <Link to="/signup" className="font-medium text-primary hover:underline">
              Criar conta
            </Link>
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
