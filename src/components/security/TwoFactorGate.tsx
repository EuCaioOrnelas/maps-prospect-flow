import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { call2FA, use2FAStatus } from "@/hooks/use2FA";
import { TwoFactorChallengeCard } from "@/components/security/TwoFactorChallengeCard";

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
        <TwoFactorChallengeCard
          code={code}
          recovery={recovery}
          submitting={submitting}
          error={error}
          onCodeChange={(value) => { setCode(value); setError(null); }}
          onRecoveryChange={(value) => { setRecovery(value); setError(null); }}
          onSubmit={submit}
          onExit={() => { void supabase.auth.signOut(); }}
          exitLabel="Sair"
        />
      </div>
    </div>
  );
}
