import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Input } from "@/components/ui/input";
import { Loader2, ShieldCheck, LogOut, KeyRound } from "lucide-react";
import { call2FA, type TwoFactorStatus } from "@/hooks/use2FA";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/Logo";

/**
 * Bloqueia o acesso enquanto a sessão atual não concluir o 2º fator.
 * Só aparece para quem ATIVOU o 2FA. A verificação real é server-side:
 * mesmo que esta tela fosse contornada no cliente, as policies RESTRICTIVE
 * (mfa_satisfied) impedem a leitura de conversas, conexões e credenciais.
 */
export function TwoFactorGate({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [checked, setChecked] = useState(false);
  const [needsChallenge, setNeedsChallenge] = useState(false);
  const [useRecovery, setUseRecovery] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!user?.id) { setChecked(true); setNeedsChallenge(false); return; }
    setChecked(false);
    (async () => {
      const { data } = await call2FA<TwoFactorStatus>("status");
      if (cancelled) return;
      setNeedsChallenge(!!data?.two_factor_enabled && !data.session_verified);
      setChecked(true);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const verify = async (value?: string) => {
    const v = (value ?? code).trim();
    setLoading(true);
    const { error } = await call2FA("challenge_verify", { code: v });
    setLoading(false);
    if (error) {
      toast({
        title: error === "locked" ? "Muitas tentativas" : "Código inválido",
        description: error === "locked"
          ? "Por segurança, aguarde 15 minutos antes de tentar novamente."
          : "Use o código atual do aplicativo autenticador ou um código de recuperação.",
        variant: "destructive",
      });
      setCode("");
      return;
    }
    setNeedsChallenge(false);
  };

  // Enquanto verificamos, não renderizamos o app (evita flash de conteúdo protegido)
  if (user && !checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!needsChallenge) return <>{children}</>;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-[420px] rounded-2xl border border-border/60 bg-card p-8 shadow-sm">
        <div className="mb-8 flex justify-center"><Logo size="lg" /></div>

        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-lg font-semibold">Verificação em duas etapas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {useRecovery
              ? "Digite um dos seus códigos de recuperação de uso único."
              : "Digite o código de 6 dígitos do seu aplicativo autenticador."}
          </p>
        </div>

        {useRecovery ? (
          <Input
            autoFocus
            placeholder="XXXX-XXXX"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && code.trim().length >= 6) verify(); }}
            className="h-12 text-center font-mono tracking-widest"
          />
        ) : (
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={code}
              onChange={(v) => {
                setCode(v);
                if (v.length === 6 && !loading) verify(v);
              }}
              autoFocus
            >
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <InputOTPSlot key={i} index={i} className="h-12 w-11 text-lg" />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>
        )}

        <Button
          className="mt-6 w-full gap-2"
          onClick={() => verify()}
          disabled={loading || code.trim().length < 6}
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Verificar e entrar
        </Button>

        <button
          type="button"
          onClick={() => { setUseRecovery((v) => !v); setCode(""); }}
          className="mt-4 flex w-full items-center justify-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <KeyRound className="h-4 w-4" />
          {useRecovery ? "Usar código do aplicativo" : "Usar código de recuperação"}
        </button>

        <Button variant="ghost" className="mt-2 w-full gap-2 text-muted-foreground" onClick={signOut}>
          <LogOut className="h-4 w-4" /> Sair da conta
        </Button>
      </div>
    </div>
  );
}
