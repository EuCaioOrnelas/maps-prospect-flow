import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type WiizePayChargeStatus =
  | "draft" | "awaiting_wiize_pay" | "sent" | "awaiting_payment" | "paid" | "cancelled" | "error";

export type WiizePayBillingType = "one_time" | "installment" | "recurring";

export interface WiizePayCharge {
  id: string;
  deal_id: string;
  lead_id?: string;
  status: WiizePayChargeStatus;
  external_id: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  snapshot?: { deal?: { type?: WiizePayBillingType; installments_or_months?: number }; payment?: { methods?: string[]; due_date?: string } } | null;
}

export interface WiizePaySnapshot {
  deal: { title: string; type: WiizePayBillingType; amount_cents: number; installments_or_months: number; total_cents: number; start_date?: string; end_date?: string };
  customer: { company_name: string | null; contact_name: string | null; email: string | null; phone: string | null; document: string | null };
}

export interface WiizePayListMeta {
  connected: boolean;
  connected_at: string | null;
  api_configured: boolean;
  can_charge: boolean;
}

/** Lança Error com a mensagem amigável devolvida pela função (quando houver). */
async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("wiize-pay-charge", { body });
  if (error) {
    let msg = error.message;
    try {
      const ctx = await (error as any).context?.json?.();
      if (ctx?.message) msg = ctx.message; else if (ctx?.error) msg = ctx.error;
    } catch { /* noop */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.message || data.error);
  return data as T;
}

export function useWiizePayCharges(leadId: string) {
  return useQuery({
    queryKey: ["wiize-pay-charges", leadId],
    queryFn: () => call<{ charges: WiizePayCharge[] } & WiizePayListMeta>({ action: "list_for_lead", lead_id: leadId }),
    staleTime: 15_000,
    enabled: !!leadId,
  });
}

/** Todas as cobranças da conta (página Vendas e Receita). */
export function useAllWiizePayCharges() {
  return useQuery({
    queryKey: ["wiize-pay-charges", "all"],
    queryFn: () => call<{ charges: WiizePayCharge[] } & WiizePayListMeta>({ action: "list_all" }),
    staleTime: 15_000,
  });
}

export const previewWiizePayCharge = (dealId: string) =>
  call<{ snapshot: WiizePaySnapshot } & WiizePayListMeta>({ action: "preview", deal_id: dealId });

export const newWiizePayLink = (id: string) =>
  call<{ checkout_url: string; checkout_expires_at: string | null }>({ action: "link", id });

export function useWiizePayChargeMutations(_leadId?: string) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["wiize-pay-charges"] });
  const create = useMutation({
    mutationFn: (input: {
      deal_id: string; idempotency_key: string; payment_methods: string[]; due_date: string;
      billing_type: WiizePayBillingType; installments?: number; customer_document?: string;
    }) => call<{ charge: WiizePayCharge; checkout_url?: string; checkout_expires_at?: string | null }>({ action: "create", ...input }),
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

/** Venda criada depois da conexão → funciona pelo Wiize Pay. Antes → controle interno. */
export function isWiizePayEra(saleCreatedAt: string, meta?: Pick<WiizePayListMeta, "connected" | "connected_at"> | null) {
  if (!meta?.connected || !meta.connected_at) return false;
  return new Date(saleCreatedAt).getTime() >= new Date(meta.connected_at).getTime();
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

export const chargeStatusTone: Record<WiizePayChargeStatus, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  awaiting_wiize_pay: "bg-muted text-muted-foreground border-border",
  sent: "bg-primary/10 text-primary border-primary/30",
  awaiting_payment: "bg-primary/10 text-primary border-primary/30",
  paid: "bg-primary text-primary-foreground border-primary",
  cancelled: "bg-muted text-muted-foreground border-border",
  error: "bg-destructive/10 text-destructive border-destructive/30",
};
