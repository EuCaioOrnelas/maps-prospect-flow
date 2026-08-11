ALTER TABLE public.crm_renewal_settings
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_phone text;

UPDATE public.crm_renewal_settings
SET notice_days_4_6_months = 15
WHERE notice_days_4_6_months IS NULL;

ALTER TABLE public.crm_renewal_settings
  ALTER COLUMN notice_days_4_6_months SET DEFAULT 15;