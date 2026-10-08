import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type WiizePayChargeStatus =
  | "draft" | "awaiting_wiize_pay" | "sent" | "awaiting_payment" | "overdue" | "paid" | "refunded" | "cancelled" | "error";

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

/** Último status de conexão conhecido: a tela de venda já abre no modo certo, sem esperar a rede. */
const META_KEY = "wiize-pay-meta-v1";
function readMeta(): WiizePayListMeta | undefined {
  try { const raw = localStorage.getItem(META_KEY); return raw ? JSON.parse(raw) : undefined; } catch { return undefined; }
}
function saveMeta<T extends WiizePayListMeta>(r: T): T {
  try {
    localStorage.setItem(META_KEY, JSON.stringify({ connected: r.connected, connected_at: r.connected_at, api_configured: r.api_configured, can_charge: r.can_charge }));
  } catch { /* noop */ }
  return r;
}
/** Situações que ainda podem mudar: a tela confere de novo a cada 20s. */
export const PENDING: WiizePayChargeStatus[] = ["sent", "awaiting_payment", "overdue"];
const placeholder = () => { const m = readMeta(); return m ? { charges: [] as WiizePayCharge[], ...m } : undefined; };

export function useWiizePayCharges(leadId: string) {
  return useQuery({
    queryKey: ["wiize-pay-charges", leadId],
    queryFn: () => call<{ charges: WiizePayCharge[] } & WiizePayListMeta>({ action: "list_for_lead", lead_id: leadId }).then(saveMeta),
    staleTime: 60_000,
    placeholderData: placeholder,
    refetchInterval: (q) => (q.state.data?.charges ?? []).some((c) => PENDING.includes(c.status)) ? 20_000 : false,
    enabled: !!leadId,
  });
}

/** Todas as cobranças da conta (página Vendas e Receita). */
export function useAllWiizePayCharges() {
  return useQuery({
    queryKey: ["wiize-pay-charges", "all"],
    queryFn: () => call<{ charges: WiizePayCharge[] } & WiizePayListMeta>({ action: "list_all" }).then(saveMeta),
    staleTime: 60_000,
    placeholderData: placeholder,
    refetchInterval: (q) => (q.state.data?.charges ?? []).some((c) => PENDING.includes(c.status)) ? 20_000 : false,
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
  awaiting_wiize_pay: "Aguardando WiizePay",
  sent: "Cobrança criada",
  awaiting_payment: "Pagamento pendente",
  overdue: "Vencida",
  paid: "Paga",
  refunded: "Estornada",
  cancelled: "Cancelada",
  error: "Erro",
};

export const chargeStatusTone: Record<WiizePayChargeStatus, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  awaiting_wiize_pay: "bg-muted text-muted-foreground border-border",
  sent: "bg-muted text-foreground border-border",
  awaiting_payment: "bg-muted text-foreground border-border",
  overdue: "bg-destructive/10 text-destructive border-destructive/30",
  paid: "bg-primary/10 text-primary border-primary/30",
  refunded: "bg-muted text-muted-foreground border-border",
  cancelled: "bg-muted text-muted-foreground border-border",
  error: "bg-destructive/10 text-destructive border-destructive/30",
};

/** Janelas embutidas da WiizePay: o passe é gerado no servidor (uso único, 2 min). */
export const WIIZEPAY_ORIGIN = "https://wiizepay.com";
export type WiizePayEmbedKind = "contract" | "service" | "charge";
export const createWiizePayEmbedTicket = (input: { kind: WiizePayEmbedKind; lead_id?: string; theme: "light" | "dark"; customer_document?: string }) =>
  call<{ url: string; origin: string }>({ action: "embed_ticket", ...input });
export const attachWiizePayEmbed = (input: { deal_id: string; contract_id?: string; service_id?: string; charge_group_id?: string; checkout_url?: string }) =>
  call<{ ok: boolean }>({ action: "embed_attach", ...input });

/** Listas curtas da WiizePay (sem páginas): até 100 serviços ativos e até 50 contratos. */
export type WiizePayEmbedResource = "services" | "contracts";
export interface WiizePayEmbedItem {
  id: string;
  name?: string | null;
  title?: string | null;
  amount_cents?: number | null;
  type?: string | null;
  status?: string | null;
  installments?: number | null;
  starts_on?: string | null;
  ends_on?: string | null;
  accepted_methods?: string[] | null;
}
export async function listWiizePayEmbed(input: { resource: WiizePayEmbedResource; lead_id?: string }): Promise<WiizePayEmbedItem[]> {
  const r = await call<{ items: WiizePayEmbedItem[] }>({ action: "embed_list", ...input });
  return Array.isArray(r?.items) ? r.items : [];
}
