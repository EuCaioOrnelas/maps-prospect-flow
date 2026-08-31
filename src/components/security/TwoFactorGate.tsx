import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ShieldCheck, LogOut } from "lucide-react";
import { call2FA, type TwoFactorStatus } from "@/hooks/use2FA";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/Logo";

/**
 * Bloqueia o acesso enquanto a sessão atual não concluir o 2º fator.
 * Só aparece para usuários que ATIVARAM o 2FA — quem não ativou nunca vê esta tela.
 */
export function TwoFactorGate({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [checked, setChecked] = useState(false);
  const [needsChallenge, setNeedsChallenge] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!user?.id) { setChecked(true); setNeedsChallenge(false); return; }
    (async () => {
      const { data } = await call2FA<TwoFactorStatus>("status");
      if (cancelled) return;
      setNeedsChallenge(!!data?.two_factor_enabled && !data.session_verified);
      setChecked(true);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const verify = async () => {
    setLoading(true);
    const { error } = await call2FA("challenge_verify", { code: code.trim() });
    setLoading(false);
    if (error) {
      toast({
        title: error === "locked" ? "Muitas tentativas" : "Código inválido",
        description: error === "locked"
          ? "Aguarde 15 minutos e tente novamente."
          : "Use o código do app autenticador ou um código de recuperação.",
        variant: "destructive",
      });
      setCode("");
      return;
    }
    setNeedsChallenge(false);
  };

  if (!checked || !needsChallenge) return <>{children}</>;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-border/50 bg-card p-6">
        <div className="flex justify-center"><Logo size="lg" /></div>
        <div className="space-y-2 text-center">
          <ShieldCheck className="mx-auto h-8 w-8 text-primary" />
          <h1 className="text-lg font-semibold">Verificação em duas etapas</h1>
          <p className="text-sm text-muted-foreground">
            Digite o código do seu aplicativo autenticador para concluir o acesso.
          </p>
        </div>
        <Input
          autoFocus
          placeholder="000000 ou código de recuperação"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && code.trim().length >= 6) verify(); }}
          className="text-center tracking-widest"
        />
        <Button className="w-full gap-2" onClick={verify} disabled={loading || code.trim().length < 6}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Verificar
        </Button>
        <Button variant="ghost" className="w-full gap-2 text-muted-foreground" onClick={signOut}>
          <LogOut className="h-4 w-4" /> Sair
        </Button>
      </div>
    </div>
  );
}
