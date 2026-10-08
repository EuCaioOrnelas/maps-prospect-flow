CREATE TABLE IF NOT EXISTS public.wiize_pay_webhook_nonces (
  nonce text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.wiize_pay_webhook_nonces TO service_role;
ALTER TABLE public.wiize_pay_webhook_nonces ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_wpwn_created ON public.wiize_pay_webhook_nonces(created_at);

CREATE TABLE IF NOT EXISTS public.wiizepay_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  wiizepay_sale_id text NOT NULL,
  customer_id uuid,
  customer_name text,
  sale_type text NOT NULL,
  type_label text,
  total_amount numeric(14,2) NOT NULL DEFAULT 0,
  installment_amount numeric(14,2) NOT NULL DEFAULT 0,
  installments integer,
  recurrence_frequency text,
  starts_on date,
  expires_on date,
  status text NOT NULL,
  status_label text,
  paid_installments integer NOT NULL DEFAULT 0,
  amount_received numeric(14,2) NOT NULL DEFAULT 0,
  last_paid_at timestamptz,
  next_due_on date,
  payment_method text,
  description text,
  service_id text,
  service_name text,
  contract_id text,
  currency text NOT NULL DEFAULT 'BRL',
  cancelled_at timestamptz,
  last_event_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_user_id, wiizepay_sale_id)
);
GRANT SELECT ON public.wiizepay_sales TO authenticated;
GRANT ALL ON public.wiizepay_sales TO service_role;
ALTER TABLE public.wiizepay_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wiizepay_sales view" ON public.wiizepay_sales FOR SELECT TO authenticated USING (public.is_account_member(owner_user_id));
CREATE INDEX IF NOT EXISTS idx_wps_owner_status ON public.wiizepay_sales(owner_user_id, status);

CREATE TABLE IF NOT EXISTS public.wiizepay_revenue_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  wiizepay_sale_id text NOT NULL,
  paid_installments integer NOT NULL,
  amount numeric(14,2) NOT NULL,
  paid_at timestamptz NOT NULL,
  refunded boolean NOT NULL DEFAULT false,
  refunded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_user_id, wiizepay_sale_id, paid_installments)
);
GRANT SELECT ON public.wiizepay_revenue_entries TO authenticated;
GRANT ALL ON public.wiizepay_revenue_entries TO service_role;
ALTER TABLE public.wiizepay_revenue_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wiizepay_revenue view" ON public.wiizepay_revenue_entries FOR SELECT TO authenticated USING (public.is_account_member(owner_user_id));
CREATE INDEX IF NOT EXISTS idx_wpre_owner_paid ON public.wiizepay_revenue_entries(owner_user_id, paid_at);