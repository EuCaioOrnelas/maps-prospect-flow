-- CPF/CNPJ do cliente (exigido pelo Wiize Pay para criar o cliente lá)
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS document text;
-- Como a venda é cobrada: 'internal' (controle interno) ou 'wiize_pay'
ALTER TABLE public.lead_deals ADD COLUMN IF NOT EXISTS billing_provider text NOT NULL DEFAULT 'internal';
ALTER TABLE public.lead_deals ADD COLUMN IF NOT EXISTS billing_type text;
ALTER TABLE public.lead_deals ADD COLUMN IF NOT EXISTS installments integer;
ALTER TABLE public.lead_deals ADD COLUMN IF NOT EXISTS wiize_pay_charge_id uuid;
DO $$ BEGIN
  ALTER TABLE public.lead_deals ADD CONSTRAINT lead_deals_billing_provider_chk CHECK (billing_provider IN ('internal','wiize_pay'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_wpcr_owner_deal ON public.wiize_pay_charge_requests(owner_user_id, deal_id, created_at DESC);