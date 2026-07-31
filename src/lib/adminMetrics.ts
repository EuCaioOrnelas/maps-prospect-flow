/**
 * Constantes e helpers compartilhados das métricas do Admin.
 */

/**
 * Reembolsos anteriores a esta data são ignorados em TODAS as métricas do admin
 * (histórico anterior a julho/2026 foi limpo das métricas de reembolso).
 */
export const REFUND_METRICS_SINCE = new Date("2026-07-01T00:00:00Z");

/** Início oficial das métricas de churn após a limpeza do histórico legado. */
export const CHURN_METRICS_SINCE = new Date("2026-06-01T00:00:00Z");

/**
 * Data em que o NOVO onboarding entrou no ar. Somente usuários que
 * responderam ou pularam o novo onboarding entram no cálculo de ativação.
 */
export const NEW_ONBOARDING_SINCE = new Date("2026-06-01T00:00:00Z");

/** Linhas sintéticas do backfill antigo (não representam onboarding real). */
const BACKFILL_ROLE = "Usuário ativo";

export type OnboardingRow = {
  user_id: string;
  skipped: boolean | null;
  completed_at: string | null;
  created_at: string;
  role: string | null;
};

/** Considera apenas quem realmente passou pelo novo onboarding (respondeu ou pulou). */
export function isNewOnboarding(row: OnboardingRow): boolean {
  if (row.role === BACKFILL_ROLE) return false;
  if (!row.completed_at && !row.skipped) return false;
  const ref = new Date(row.completed_at || row.created_at);
  return ref >= NEW_ONBOARDING_SINCE;
}

/** Um reembolso só conta nas métricas se ocorreu a partir do cutoff. */
export function isRefundCountable(date: string | Date): boolean {
  return new Date(date) >= REFUND_METRICS_SINCE;
}

/** month = "YYYY-MM" — true se o mês é >= mês do cutoff. */
export function isRefundMonthCountable(month: string): boolean {
  const cutoff = `${REFUND_METRICS_SINCE.getUTCFullYear()}-${String(
    REFUND_METRICS_SINCE.getUTCMonth() + 1
  ).padStart(2, "0")}`;
  return month >= cutoff;
}

export type TrialProfile = {
  plan: string | null;
  trial_start_at: string | null;
  trial_end_at?: string | null;
  trial_will_charge_at?: string | null;
  trial_card_last4?: string | null;
  trial_asaas_subscription_id?: string | null;
  trial_plan_chosen?: string | null;
};

/**
 * Trial REAL = o usuário cadastrou cartão e agendou a cobrança.
 * `trial_start_at` sozinho não vale: ele é preenchido em todo cadastro.
 */
export function startedRealTrial(p: TrialProfile): boolean {
  if (!p.trial_start_at) return false;
  return !!(p.trial_card_last4 || p.trial_asaas_subscription_id || p.trial_will_charge_at);
}

/**
 * Trial "de verdade" concluído: colocou cartão E já saiu do período de teste.
 */
export function hasCompletedTrial(p: TrialProfile): boolean {
  if (!startedRealTrial(p)) return false;
  const now = Date.now();
  const stillInTrial =
    (p.trial_end_at && new Date(p.trial_end_at).getTime() > now) ||
    (p.trial_will_charge_at && new Date(p.trial_will_charge_at).getTime() > now);
  if (stillInTrial) return false;
  return true;
}

/** Converteu = passou pelo trial (com cartão) e hoje tem plano pago. */
export function hasConvertedFromTrial(p: TrialProfile): boolean {
  return hasCompletedTrial(p) && !!p.plan && p.plan !== "free";
}

/**
 * Ativação real: qualquer uso concreto do produto.
 * Considera prospecção (leads), CRM (negociações), campanhas WhatsApp,
 * campanhas Meta Ads, conversas no chat, fluxos, agentes de IA e conexões WABA,
 * além dos contadores agregados do próprio perfil.
 */
export async function fetchActivatedUserIds(
  supabase: any,
  candidateIds?: string[]
): Promise<Set<string>> {
  const sources = [
    "leads",
    "lead_deals",
    "whatsapp_campaigns",
    "meta_campaigns",
    "chat_conversations",
    "wa_automation_flows",
    "ai_agents",
    "user_waba_connections",
  ];

  const activated = new Set<string>();
  const results = await Promise.all(
    sources.map(async (table) => {
      let q = supabase.from(table).select("user_id").not("user_id", "is", null).limit(50000);
      if (candidateIds && candidateIds.length > 0 && candidateIds.length <= 200) {
        q = q.in("user_id", candidateIds);
      }
      const { data } = await q;
      return (data as any[]) || [];
    })
  );
  results.flat().forEach((r: any) => {
    if (r?.user_id) activated.add(r.user_id);
  });
  return activated;
}

/** Contadores agregados no perfil (busca, mensagens, leads, fluxos, campanhas). */
export function hasProfileUsage(p: any): boolean {
  return (
    (p?.searches_used ?? 0) > 0 ||
    (p?.trial_messages_sent ?? 0) > 0 ||
    (p?.trial_leads_used ?? 0) > 0 ||
    (p?.trial_flows_used ?? 0) > 0 ||
    (p?.trial_campaigns_used ?? 0) > 0
  );
}

/**
 * Usuários que REALMENTE pagaram pelo menos uma vez.
 * Churn só pode considerar essa base — quem cancelou/não renovou ainda no
 * trial nunca foi receita, então não é churn.
 */
export async function fetchPayingUserIds(supabase: any): Promise<Set<string>> {
  const paying = new Set<string>();
  const [pix, custom, sales] = await Promise.all([
    supabase.from("pix_invoices").select("user_id").eq("status", "paid"),
    supabase.from("custom_subscription_payments").select("user_id").not("paid_at", "is", null),
    supabase.from("partner_sales").select("customer_user_id").not("customer_user_id", "is", null),
  ]);
  ((pix.data as any[]) || []).forEach((r) => r?.user_id && paying.add(r.user_id));
  ((custom.data as any[]) || []).forEach((r) => r?.user_id && paying.add(r.user_id));
  ((sales.data as any[]) || []).forEach((r) => r?.customer_user_id && paying.add(r.customer_user_id));
  return paying;
}


