export type StripeInvoicePayment = {
  paid?: boolean;
  amount_paid?: number | null;
  amount_remaining?: number | null;
  created?: number;
  status_transitions?: { paid_at?: number | null } | null;
};

/**
 * Churn exige dinheiro efetivamente recebido antes do cancelamento.
 * A data do trial não exclui quem pagou antecipadamente; a invoice paga é a prova.
 */
export function hasRealPaymentBeforeCancellation(
  invoices: StripeInvoicePayment[],
  canceledAtUnix: number,
): boolean {
  if (!Number.isFinite(canceledAtUnix)) return false;

  return invoices.some((invoice) => {
    const paidAt = invoice.status_transitions?.paid_at || invoice.created;
    return invoice.paid === true &&
      Number(invoice.amount_paid) > 0 &&
      Number(invoice.amount_remaining || 0) === 0 &&
      Number.isFinite(paidAt) &&
      Number(paidAt) <= canceledAtUnix;
  });
}
