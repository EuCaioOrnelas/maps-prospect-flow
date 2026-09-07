-- Wiize API: suporte a pagamentos com cartão via Stripe

-- 1) Colunas extras em recargas para Stripe
ALTER TABLE public.wiize_api_topups
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

DROP INDEX IF EXISTS wiize_api_topups_stripe_pi_uidx;
CREATE UNIQUE INDEX wiize_api_topups_stripe_pi_uidx
  ON public.wiize_api_topups (stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;

-- 2) Customer Stripe por conta da API
ALTER TABLE public.wiize_api_profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- 3) Métodos de pagamento salvos
CREATE TABLE IF NOT EXISTS public.wiize_api_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_payment_method_id TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT,
  brand TEXT,
  last4 TEXT,
  exp_month INTEGER,
  exp_year INTEGER,
  is_default BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT wiize_api_pm_status_valid CHECK (status IN ('active','removed'))
);

CREATE INDEX IF NOT EXISTS wiize_api_pm_user_idx ON public.wiize_api_payment_methods (user_id, created_at DESC);
DROP INDEX IF EXISTS wiize_api_pm_default_uidx;
CREATE UNIQUE INDEX wiize_api_pm_default_uidx
  ON public.wiize_api_payment_methods (user_id) WHERE is_default = true;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wiize_api_payment_methods TO authenticated;
GRANT ALL ON public.wiize_api_payment_methods TO service_role;

ALTER TABLE public.wiize_api_payment_methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner can manage own payment methods" ON public.wiize_api_payment_methods;
CREATE POLICY "Owner can manage own payment methods"
  ON public.wiize_api_payment_methods FOR ALL TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_wiize_api_payment_methods_updated_at ON public.wiize_api_payment_methods;
CREATE TRIGGER trg_wiize_api_payment_methods_updated_at
  BEFORE UPDATE ON public.wiize_api_payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Cartão padrão para recarga automática
ALTER TABLE public.wiize_api_wallets
  ADD COLUMN IF NOT EXISTS auto_topup_payment_method_id UUID REFERENCES public.wiize_api_payment_methods(id) ON DELETE SET NULL;
