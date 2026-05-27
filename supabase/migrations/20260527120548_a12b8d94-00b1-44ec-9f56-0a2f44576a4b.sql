-- 1. Tabela sales
CREATE TABLE IF NOT EXISTS public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,

  title text NOT NULL,
  description text,

  amount numeric(12,2) NOT NULL DEFAULT 0,
  sale_type text NOT NULL DEFAULT 'one_time' CHECK (sale_type IN ('one_time','recurring')),
  payment_method text,

  contract_months integer,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  expiration_date date,

  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','cancelled','renewed')),

  receipt_url text,
  contract_url text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_user_id ON public.sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_lead_id ON public.sales(lead_id);
CREATE INDEX IF NOT EXISTS idx_sales_status ON public.sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_expiration ON public.sales(expiration_date);

-- 2. Trigger updated_at
CREATE OR REPLACE FUNCTION public.sales_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  -- Auto-calcula expiration_date para vendas recorrentes
  IF NEW.sale_type = 'recurring' AND NEW.contract_months IS NOT NULL AND NEW.contract_months > 0 THEN
    NEW.expiration_date := NEW.start_date + (NEW.contract_months || ' months')::interval;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sales_updated_at ON public.sales;
CREATE TRIGGER trg_sales_updated_at
BEFORE INSERT OR UPDATE ON public.sales
FOR EACH ROW
EXECUTE FUNCTION public.sales_set_updated_at();

-- 3. GRANTs
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales TO authenticated;
GRANT ALL ON public.sales TO service_role;

-- 4. RLS
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own sales" ON public.sales;
CREATE POLICY "Users view own sales" ON public.sales
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own sales" ON public.sales;
CREATE POLICY "Users insert own sales" ON public.sales
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own sales" ON public.sales;
CREATE POLICY "Users update own sales" ON public.sales
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own sales" ON public.sales;
CREATE POLICY "Users delete own sales" ON public.sales
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 5. Storage bucket privado
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