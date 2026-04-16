
-- Suporte a upgrade de planos: saldo bônus + identificadores Asaas
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bonus_searches integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS asaas_subscription_id text,
  ADD COLUMN IF NOT EXISTS asaas_customer_id text,
  ADD COLUMN IF NOT EXISTS billing_period text;

-- Tabela de log dos upgrades (auditoria + rollback)
CREATE TABLE IF NOT EXISTS public.subscription_upgrades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_plan text NOT NULL,
  to_plan text NOT NULL,
  from_billing_period text,
  to_billing_period text NOT NULL,
  remaining_searches_carried integer NOT NULL DEFAULT 0,
  proration_credit_cents integer NOT NULL DEFAULT 0,
  old_subscription_id text,
  new_subscription_id text,
  provider text NOT NULL DEFAULT 'asaas',
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE public.subscription_upgrades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own upgrades"
  ON public.subscription_upgrades FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all upgrades"
  ON public.subscription_upgrades FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_subscription_upgrades_user ON public.subscription_upgrades(user_id, created_at DESC);
