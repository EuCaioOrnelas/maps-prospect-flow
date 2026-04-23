// Shared helper to register a partner sale when a customer who came from a referral pays.
// Triggered from stripe-webhook (checkout completed / subscription renewed)
// and from admin-record-partner-sale (manual Asaas/PIX recording).
//
// Logic:
//   1. Look up the partner_lead row for this user (if any).
//   2. If found and not yet converted, insert into partner_sales (idempotent on stripe_invoice_id when provided).
//   3. The DB trigger trg_generate_commission_for_sale will create the commission row.
//   4. Mark the partner_lead as converted on first sale.

// deno-lint-ignore no-explicit-any
type SBClient = any;

export interface RegisterPartnerSaleInput {
  userId: string;
  email?: string | null;
  amountCents: number;
  plan?: string | null;
  billingPeriod?: 'monthly' | 'yearly' | null;
  paymentMethod: 'stripe' | 'asaas_pix' | 'manual';
  stripeInvoiceId?: string | null;
  stripeSubscriptionId?: string | null;
  asaasPaymentId?: string | null;
  paidAt?: string; // ISO; defaults to now
  isRecurring?: boolean;
}

export async function registerPartnerSale(
  supabase: SBClient,
  input: RegisterPartnerSaleInput
): Promise<{ ok: boolean; reason?: string; saleId?: string }> {
  try {
    if (!input.userId || !input.amountCents || input.amountCents <= 0) {
      return { ok: false, reason: 'invalid_input' };
    }

    // Find the partner_lead for this user (most recent active attribution)
    const { data: lead } = await supabase
      .from('partner_leads')
      .select('id, partner_id, click_id')
      .eq('user_id', input.userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!lead?.partner_id) {
      return { ok: false, reason: 'not_attributed' };
    }

    // Idempotency: avoid duplicating the same invoice
    if (input.stripeInvoiceId) {
      const { data: existing } = await supabase
        .from('partner_sales')
        .select('id')
        .eq('stripe_invoice_id', input.stripeInvoiceId)
        .maybeSingle();
      if (existing?.id) return { ok: true, reason: 'duplicate', saleId: existing.id };
    }
    if (input.asaasPaymentId) {
      const { data: existing } = await supabase
        .from('partner_sales')
        .select('id')
        .eq('asaas_payment_id', input.asaasPaymentId)
        .maybeSingle();
      if (existing?.id) return { ok: true, reason: 'duplicate', saleId: existing.id };
    }

    const { data: sale, error: saleErr } = await supabase
      .from('partner_sales')
      .insert({
        partner_id: lead.partner_id,
        partner_lead_id: lead.id,
        customer_user_id: input.userId,
        customer_email: input.email,
        plan: input.plan,
        billing_period: input.billingPeriod,
        amount_cents: input.amountCents,
        payment_method: input.paymentMethod,
        stripe_invoice_id: input.stripeInvoiceId,
        stripe_subscription_id: input.stripeSubscriptionId,
        asaas_payment_id: input.asaasPaymentId,
        is_recurring: input.isRecurring ?? false,
        paid_at: input.paidAt || new Date().toISOString(),
      })
      .select('id')
      .single();

    if (saleErr) {
      console.error('[registerPartnerSale] insert error:', saleErr);
      return { ok: false, reason: saleErr.message };
    }

    // Mark lead as converted on first sale
    await supabase
      .from('partner_leads')
      .update({
        first_paid_at: new Date().toISOString(),
        is_paid_customer: true,
      })
      .eq('id', lead.id)
      .is('first_paid_at', null);

    return { ok: true, saleId: sale.id };
  } catch (e) {
    console.error('[registerPartnerSale] exception:', e);
    return { ok: false, reason: e instanceof Error ? e.message : 'unknown' };
  }
}
