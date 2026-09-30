import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type WiizePayChargeStatus =
  | "draft" | "awaiting_wiize_pay" | "sent" | "awaiting_payment" | "paid" | "cancelled" | "error";

export interface WiizePayCharge {
  id: string;
  deal_id: string;
  status: WiizePayChargeStatus;
  external_id: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface WiizePaySnapshot {
  deal: { title: string; type: "one_time" | "recurring"; amount_cents: number; installments_or_months: number; total_cents: number };
  customer: { company_name: string | null; contact_name: string | null; email: string | null; phone: string | null };
}

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("wiize-pay-charge", { body });
  if (error) {
    let msg = error.message;
    try { const ctx = await (error as any).context?.json?.(); if (ctx?.error) msg = ctx.error; } catch { /* noop */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export function useWiizePayCharges(leadId: string) {
  return useQuery({
    queryKey: ["wiize-pay-charges", leadId],
    queryFn: () => call<{ charges: WiizePayCharge[]; connected: boolean; api_configured: boolean; can_charge: boolean }>(
      { action: "list_for_lead", lead_id: leadId }),
    staleTime: 15_000,
    enabled: !!leadId,
  });
}

export const previewWiizePayCharge = (dealId: string) =>
  call<{ snapshot: WiizePaySnapshot; connected: boolean; api_configured: boolean }>({ action: "preview", deal_id: dealId });

export function useWiizePayChargeMutations(leadId: string) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["wiize-pay-charges", leadId] });
  const create = useMutation({
    mutationFn: (input: { deal_id: string; idempotency_key: string; payment_methods: string[]; due_date: string }) =>
      call<{ charge: WiizePayCharge; checkout_url?: string; ready_for_wiize_pay?: boolean }>({ action: "create", ...input }),
    onSuccess: invalidate,
  });
  const refresh = useMutation({
    mutationFn: (id: string) => call<{ charge: WiizePayCharge }>({ action: "status", id }),
    onSuccess: invalidate,
  });
  const cancel = useMutation({
    mutationFn: (id: string) => call<{ charge: WiizePayCharge }>({ action: "cancel", id }),
    onSuccess: invalidate,
  });
  return { create, refresh, cancel };
}

export const chargeStatusLabel: Record<WiizePayChargeStatus, string> = {
  draft: "Rascunho",
  awaiting_wiize_pay: "Aguardando Wiize Pay",
  sent: "Enviada",
  awaiting_payment: "Aguardando pagamento",
  paid: "Paga",
  cancelled: "Cancelada",
  error: "Erro",
};
