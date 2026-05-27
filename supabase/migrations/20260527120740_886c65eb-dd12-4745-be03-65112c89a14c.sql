-- 1. Drop nova tabela sales (vamos usar lead_deals)
DROP TABLE IF EXISTS public.sales CASCADE;
DROP FUNCTION IF EXISTS public.sales_set_updated_at() CASCADE;

-- 2. Estender lead_deals
ALTER TABLE public.lead_deals
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS sale_type text NOT NULL DEFAULT 'recurring',
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS start_date date NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS expiration_date date,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS receipt_url text,
  ADD COLUMN IF NOT EXISTS contract_url text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Constraints idempotentes
DO $$ BEGIN
  ALTER TABLE public.lead_deals ADD CONSTRAINT lead_deals_sale_type_check CHECK (sale_type IN ('one_time','recurring'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.lead_deals ADD CONSTRAINT lead_deals_status_check CHECK (status IN ('active','expired','cancelled','renewed'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Backfill start_date e expiration_date a partir de closed_at + contract_months
UPDATE public.lead_deals
SET start_date = closed_at::date
WHERE start_date IS NULL OR start_date = CURRENT_DATE;

UPDATE public.lead_deals
SET expiration_date = (closed_at::date + (contract_months || ' months')::interval)::date
WHERE expiration_date IS NULL AND contract_months IS NOT NULL AND contract_months > 0;

CREATE INDEX IF NOT EXISTS idx_lead_deals_status ON public.lead_deals(status);
CREATE INDEX IF NOT EXISTS idx_lead_deals_expiration ON public.lead_deals(expiration_date);
CREATE INDEX IF NOT EXISTS idx_lead_deals_user_id ON public.lead_deals(user_id);

-- 3. Trigger auto updated_at + auto expiration_date
CREATE OR REPLACE FUNCTION public.lead_deals_set_computed()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.sale_type = 'recurring' AND NEW.contract_months IS NOT NULL AND NEW.contract_months > 0 THEN
    NEW.expiration_date := (COALESCE(NEW.start_date, NEW.closed_at::date, CURRENT_DATE) + (NEW.contract_months || ' months')::interval)::date;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lead_deals_computed ON public.lead_deals;
CREATE TRIGGER trg_lead_deals_computed
BEFORE INSERT OR UPDATE ON public.lead_deals
FOR EACH ROW
EXECUTE FUNCTION public.lead_deals_set_computed();

-- 4. Bucket sales-attachments (já criado, mas idempotente)
INSERT INTO storage.buckets (id, name, public)
VALUES ('sales-attachments', 'sales-attachments', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users view own sales attachments" ON storage.objects;
CREATE POLICY "Users view own sales attachments" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'sales-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users upload own sales attachments" ON storage.objects;
CREATE POLICY "Users upload own sales attachments" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'sales-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users update own sales attachments" ON storage.objects;
CREATE POLICY "Users update own sales attachments" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'sales-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users delete own sales attachments" ON storage.objects;
CREATE POLICY "Users delete own sales attachments" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'sales-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);