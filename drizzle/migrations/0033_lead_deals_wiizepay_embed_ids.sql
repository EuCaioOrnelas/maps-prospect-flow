ALTER TABLE public.lead_deals
  ADD COLUMN IF NOT EXISTS wiize_pay_contract_id text,
  ADD COLUMN IF NOT EXISTS wiize_pay_service_id text,
  ADD COLUMN IF NOT EXISTS wiize_pay_charge_group_id text,
  ADD COLUMN IF NOT EXISTS wiize_pay_checkout_url text;