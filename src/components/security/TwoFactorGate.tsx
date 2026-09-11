import { useEffect, useState } from "react";
import { Loader2, ShieldCheck, KeyRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { call2FA, use2FAStatus } from "@/hooks/use2FA";

/**
 * Exige o segundo fator a cada novo acesso: enquanto a sessão não estiver
 * verificada, nenhum conteúdo autenticado é liberado.
 */
export function TwoFactorGate({ children }: { children: React.ReactNode }) {
  const { status, loading, refresh } = use2FAStatus();
  const [code, setCode] = useState("");
  const [recovery, setRecovery] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const blocked = !!status?.two_factor_enabled && !status.session_verified;

  useEffect(() => {
    if (!blocked) {
      setCode("");
      setError(null);
    }
  }, [blocked]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error: err } = await call2FA("challenge_verify", recovery ? { recovery_code: code.trim() } : { code: code.trim() });
    setSubmitting(false);
    if (err) {
      setError(err);
      return;
    }
    setCode("");
    await refresh();
  };

  if (loading && !status) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!blocked) return <>{children}</>;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6 overflow-x-hidden">
      <div className="absolute inset-0 bg-gradient-glow opacity-30" />
      <div className="w-full max-w-md relative z-10">
        <div className="glass rounded-2xl p-6 sm:p-8">
          <div className="flex justify-center mb-6">
            <span className="inline-flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="h-6 w-6" />
            </span>
          </div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-center mb-2">
            Verificação em duas etapas
          </h1>
          <p className="text-muted-foreground text-center mb-6 text-sm">
            {recovery
              ? "Informe um dos seus códigos de recuperação."
              : "Digite o código de 6 dígitos do seu aplicativo autenticador."}
          </p>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mfa-code" className="text-xs">
                {recovery ? "Código de recuperação" : "Código"}
              </Label>
              <Input
                id="mfa-code"
                autoFocus
                autoComplete="one-time-code"
                inputMode={recovery ? "text" : "numeric"}
                maxLength={recovery ? 20 : 6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={recovery ? "XXXX-XXXX" : "000000"}
                className={recovery ? "" : "text-center text-lg tracking-[0.4em]"}
              />
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>

            <Button type="submit" className="w-full gap-2" disabled={submitting || code.trim().length < 6}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Verificar
            </Button>

            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => {
                  setRecovery((v) => !v);
                  setCode("");
                  setError(null);
                }}
              >
                <KeyRound className="h-3.5 w-3.5" />
                {recovery ? "Usar aplicativo" : "Usar código de recuperação"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => supabase.auth.signOut()}
              >
                Sair
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
