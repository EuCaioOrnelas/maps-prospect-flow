import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { withRequestTimeout } from "@/lib/requestTimeout";

export interface TwoFactorStatus {
  two_factor_enabled: boolean;
  enabled_at: string | null;
  session_verified: boolean;
  recovery_codes_left: number;
}

export async function call2FA<T = any>(action: string, payload: Record<string, unknown> = {}) {
  // Sem sessão ativa o invoke envia a chave anônima e a função responde 401.
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    return { data: null as T | null, error: "unauthorized" as string | null };
  }
  const invoke = (token: string) => supabase.functions.invoke("security-2fa", {
    body: { action, ...payload },
    headers: { Authorization: `Bearer ${token}` },
  });
  let { data, error } = await invoke(sessionData.session.access_token);
  if (error && (error as any).context?.status === 401) {
    // Token vencido (ex.: aba voltou do segundo plano): renova a sessão e tenta uma vez.
    const { data: refreshed } = await supabase.auth.refreshSession();
    if (!refreshed.session) return { data: null as T | null, error: "unauthorized" as string | null };
    ({ data, error } = await invoke(refreshed.session.access_token));
  }
  if (error) {
    // A edge function retorna erros de negócio no corpo; tenta extrair
    const ctx: any = (error as any).context;
    let parsed: any = null;
    try { parsed = await ctx?.json?.(); } catch { /* ignore */ }
    return { data: null as T | null, error: parsed?.error || error.message };
  }
  if ((data as any)?.error) return { data: null as T | null, error: (data as any).error as string };
  return { data: data as T, error: null as string | null };
}

export function use2FAStatus() {
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await withRequestTimeout(call2FA<TwoFactorStatus>("status"));
      if (result.error || !result.data) throw new Error("Não foi possível verificar a segurança da sua conta.");
      setStatus(result.data);
    } catch {
      setError("Não foi possível verificar a segurança da sua conta. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { status, loading, error, refresh };
}
