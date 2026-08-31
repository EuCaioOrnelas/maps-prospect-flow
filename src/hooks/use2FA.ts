import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TwoFactorStatus {
  two_factor_enabled: boolean;
  enabled_at: string | null;
  session_verified: boolean;
  recovery_codes_left: number;
}

export async function call2FA<T = any>(action: string, payload: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke("security-2fa", {
    body: { action, ...payload },
  });
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

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await call2FA<TwoFactorStatus>("status");
    setStatus(
      data ?? { two_factor_enabled: false, enabled_at: null, session_verified: true, recovery_codes_left: 0 },
    );
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { status, loading, refresh };
}
