/**
 * Guarda única de rebaixamento de plano.
 *
 * Regra: nunca rebaixar automaticamente quem é admin (user_roles.role = 'admin'),
 * quem tem assinatura manual/atribuída pelo admin/custom com vigência futura ou
 * vitalícia. A decisão vive no banco (public.is_downgrade_protected) para não
 * duplicar regra entre cron, AuthContext e gates de rota.
 */
export async function isDowngradeProtected(
  supabase: any,
  userId: string,
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc("is_downgrade_protected", { _user_id: userId });
    if (error) {
      console.error("[downgrade-guard] rpc error", error.message);
      // Em caso de falha, protege (fail-safe: não rebaixa).
      return true;
    }
    return data === true;
  } catch (e) {
    console.error("[downgrade-guard] exception", String(e));
    return true;
  }
}

/** Registra o rebaixamento em security_audit_log com o motivo. */
export async function logDowngrade(
  supabase: any,
  params: {
    userId: string;
    reason: string;
    previousPlan?: string | null;
    newPlan?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    await supabase.rpc("log_plan_downgrade", {
      _user_id: params.userId,
      _reason: params.reason,
      _previous_plan: params.previousPlan ?? null,
      _new_plan: params.newPlan ?? "free",
      _metadata: params.metadata ?? {},
    });
  } catch (e) {
    console.error("[downgrade-guard] audit failed", String(e));
  }
}
