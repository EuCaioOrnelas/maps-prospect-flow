
ALTER TABLE public.checkout_leads
  ADD COLUMN IF NOT EXISTS asaas_conciliation_id text,
  ADD COLUMN IF NOT EXISTS asaas_authorization_id text,
  ADD COLUMN IF NOT EXISTS asaas_payment_id text;

CREATE INDEX IF NOT EXISTS idx_checkout_leads_asaas_conciliation
  ON public.checkout_leads (asaas_conciliation_id)
  WHERE asaas_conciliation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_checkout_leads_asaas_authorization
  ON public.checkout_leads (asaas_authorization_id)
  WHERE asaas_authorization_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uidx_checkout_leads_asaas_payment
  ON public.checkout_leads (asaas_payment_id)
  WHERE asaas_payment_id IS NOT NULL;
