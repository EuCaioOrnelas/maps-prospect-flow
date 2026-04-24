// Shared helper to register a partner sale when a customer who came from a referral pays.
// Triggered from stripe-webhook (checkout completed / subscription renewed)
// and from admin-record-partner-sale (manual Asaas/PIX recording).
//
// Logic:
//   1. Look up the partner_lead row for this user (if any).
//   2. If found and not yet converted, insert into partner_sales (idempotent on stripe_invoice_id when provided).
//   3. The DB trigger trg_generate_commission_for_sale will create the commission row.
//   4. Mark the partner_lead as converted on first sale.
//   5. If this is the FIRST sale for this customer, send partner_first_sale email.

import { sendPartnerEmail } from "./partner-email.ts";

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
      .select('id, partner_id, click_id, referral_link_id')
      .eq('user_id', input.userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!lead?.partner_id) {
      return { ok: false, reason: 'not_attributed' };
    }

    // Defensive anti-self-referral check (in case lead was created before fraud rules existed)
    const { data: fraudCheck } = await supabase.rpc('check_partner_self_referral', {
      p_partner_id: lead.partner_id,
      p_user_id: input.userId,
    });
    if (fraudCheck && (fraudCheck as any).blocked) {
      console.warn('[registerPartnerSale] self-referral blocked:', fraudCheck);
      await supabase.from('partner_fraud_attempts').insert({
        partner_id: lead.partner_id,
        user_id: input.userId,
        email: input.email ?? null,
        reason: (fraudCheck as any).reason,
        matched_field: (fraudCheck as any).matched_field,
        metadata: { source: 'registerPartnerSale', amount_cents: input.amountCents },
      });
      return { ok: false, reason: 'self_referral_blocked' };
    }

    // Idempotency: avoid duplicating the same invoice
    if (input.stripeInvoiceId) {
      const { data: existing } = await supabase
        .from('partner_sales')
        .select('id')
        .eq('external_reference', input.stripeInvoiceId)
        .maybeSingle();
      if (existing?.id) return { ok: true, reason: 'duplicate', saleId: existing.id };
    }
    if (input.asaasPaymentId) {
      const { data: existing } = await supabase
        .from('partner_sales')
        .select('id')
        .eq('external_reference', input.asaasPaymentId)
        .maybeSingle();
      if (existing?.id) return { ok: true, reason: 'duplicate', saleId: existing.id };
    }

    const { data: sale, error: saleErr } = await supabase
      .from('partner_sales')
      .insert({
        partner_id: lead.partner_id,
        partner_lead_id: lead.id,
        customer_user_id: input.userId,
        plan: input.plan,
        amount_cents: input.amountCents,
        payment_provider: input.paymentMethod === 'stripe' ? 'stripe' : input.paymentMethod === 'asaas_pix' ? 'asaas' : 'manual',
        payment_method: input.paymentMethod,
        external_reference: input.stripeInvoiceId || input.asaasPaymentId || input.stripeSubscriptionId || null,
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
    const { data: leadUpdate } = await supabase
      .from('partner_leads')
      .update({
        is_paid: true,
        paid_at: input.paidAt || new Date().toISOString(),
        current_plan: input.plan ?? null,
        last_activity_at: new Date().toISOString(),
      })
      .eq('id', lead.id)
      .eq('is_paid', false)
      .select('id')
      .maybeSingle();

    // First sale email (only fires when leadUpdate is non-null = first time converting)
    if (leadUpdate?.id) {
      const { data: commission } = await supabase
        .from('partner_commissions')
        .select('commission_amount_cents, commission_percent')
        .eq('partner_sale_id', sale.id)
        .maybeSingle();

      sendPartnerEmail(supabase, lead.partner_id, 'partner_first_sale', {
        amount_cents: input.amountCents,
        commission_cents: commission?.commission_amount_cents || 0,
        commission_percent: commission?.commission_percent || 0,
        release_days: 30,
      }).catch(() => {});
    }

    return { ok: true, saleId: sale.id };
  } catch (e) {
    console.error('[registerPartnerSale] exception:', e);
    return { ok: false, reason: e instanceof Error ? e.message : 'unknown' };
  }
}
