/** Métricas das vendas recebidas por aviso da WiizePay. Valores chegam como texto NUMERIC; somamos em centavos. */
export interface WpSale {
  id: string;
  wiizepay_sale_id: string;
  customer_name: string | null;
  sale_type: "one_time" | "installment" | "recurring" | string;
  type_label: string | null;
  total_amount: number | string;
  installment_amount: number | string;
  installments: number | null;
  recurrence_frequency: string | null;
  status: string;
  status_label: string | null;
  amount_received: number | string;
  next_due_on: string | null;
  service_name: string | null;
  cancelled_at: string | null;
  expires_on: string | null;
}
export interface WpRevenue {
  amount: number | string;
  paid_at: string;
  refunded: boolean;
}

const cents = (v: number | string | null | undefined) => Math.round(Number(v ?? 0) * 100) || 0;

export const MONTHLY_FACTOR: Record<string, number> = {
  weekly: 4.33, biweekly: 2.17, monthly: 1, quarterly: 1 / 3, semiannual: 1 / 6, yearly: 1 / 12,
};
const MRR_STATUSES = ["active", "overdue_installment"];

export const monthlyCents = (s: WpSale) =>
  Math.round(cents(s.installment_amount || s.total_amount) * (MONTHLY_FACTOR[s.recurrence_frequency || "monthly"] ?? 1));

export function computeWpMetrics(sales: WpSale[], revenue: WpRevenue[], from: Date, to: Date) {
  const rec = sales.filter((s) => s.sale_type === "recurring");
  const mrr = rec.filter((s) => MRR_STATUSES.includes(s.status)).reduce((a, s) => a + monthlyCents(s), 0);
  const contractedMrr = rec.filter((s) => s.status === "awaiting_first_payment").reduce((a, s) => a + monthlyCents(s), 0);
  const received = revenue
    .filter((r) => !r.refunded && new Date(r.paid_at) >= from && new Date(r.paid_at) <= to)
    .reduce((a, r) => a + cents(r.amount), 0);
  const live = ["active", "awaiting_first_payment", "overdue_installment"];
  const toReceive = sales.filter((s) => live.includes(s.status)).reduce((a, s) => {
    if (s.sale_type === "installment") return a + Math.max(0, cents(s.total_amount) - cents(s.amount_received));
    if (s.sale_type === "recurring") return a + cents(s.installment_amount || s.total_amount);
    return a + Math.max(0, cents(s.total_amount) - cents(s.amount_received));
  }, 0);
  const delinquent = sales.filter((s) => s.status === "overdue_installment" || s.status === "expired");
  const delinquentCents = delinquent.reduce((a, s) =>
    a + (s.sale_type === "recurring" ? cents(s.installment_amount) : Math.max(0, cents(s.total_amount) - cents(s.amount_received))), 0);
  const churnMrr = rec
    .filter((s) => s.status === "cancelled" && s.cancelled_at && new Date(s.cancelled_at) >= from && new Date(s.cancelled_at) <= to)
    .reduce((a, s) => a + monthlyCents(s), 0);
  return {
    mrr: mrr / 100, contractedMrr: contractedMrr / 100, received: received / 100, toReceive: toReceive / 100,
    delinquentCount: delinquent.length, delinquent: delinquentCents / 100, churnMrr: churnMrr / 100,
  };
}
