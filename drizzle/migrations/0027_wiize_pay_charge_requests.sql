CREATE TABLE IF NOT EXISTS public.wiize_pay_charge_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  created_by uuid NOT NULL,
  lead_id uuid NOT NULL,
  deal_id uuid NOT NULL,
  snapshot jsonb NOT NULL,
  checksum text NOT NULL,
  idempotency_key text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','awaiting_wiize_pay','sent','awaiting_payment','paid','cancelled','error')),
  external_id text,
  checkout_url_expires_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_user_id, idempotency_key)
);
GRANT SELECT ON public.wiize_pay_charge_requests TO authenticated;
GRANT ALL ON public.wiize_pay_charge_requests TO service_role;
ALTER TABLE public.wiize_pay_charge_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members view charge requests" ON public.wiize_pay_charge_requests;
CREATE POLICY "Members view charge requests" ON public.wiize_pay_charge_requests
  FOR SELECT TO authenticated USING (public.is_account_member(owner_user_id));
CREATE INDEX IF NOT EXISTS idx_wpcr_owner_deal ON public.wiize_pay_charge_requests(owner_user_id, deal_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wpcr_owner_lead ON public.wiize_pay_charge_requests(owner_user_id, lead_id);