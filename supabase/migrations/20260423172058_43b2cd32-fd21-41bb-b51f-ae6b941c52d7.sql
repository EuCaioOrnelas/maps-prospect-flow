
-- ============================================================
-- 1) Estender profiles com flags de contratos customizados
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_custom_subscription boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS custom_searches_limit integer,
  ADD COLUMN IF NOT EXISTS custom_whatsapp_numbers_limit integer,
  ADD COLUMN IF NOT EXISTS custom_subscription_id uuid;

-- ============================================================
-- 2) Tabela principal de contratos customizados
-- ============================================================
CREATE TABLE IF NOT EXISTS public.custom_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  created_by_admin_id uuid NOT NULL,

  -- Plano e tipo
  plan text NOT NULL, -- 'free', 'start', 'growth', 'scale', 'custom', 'test', 'influencer'
  subscription_label text, -- ex: "Scale Influenciador", "Teste Interno"

  -- Limites customizados (sobrescrevem o plano base)
  searches_limit integer NOT NULL DEFAULT 1000,
  whatsapp_numbers_limit integer NOT NULL DEFAULT 1,

  -- Valor e cobrança
  monthly_value_cents integer NOT NULL DEFAULT 0, -- valor mensal informado direto (entra no MRR)
  total_value_cents integer NOT NULL DEFAULT 0,   -- valor total do contrato (LTV)
  payment_method text NOT NULL DEFAULT 'free',    -- 'free','pix','transfer','card','cash','other'
  payment_notes text,

  -- Período
  is_lifetime boolean NOT NULL DEFAULT false,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz, -- NULL quando is_lifetime=true
  contract_months integer, -- nº de meses do contrato (informativo)

  -- Status
  status text NOT NULL DEFAULT 'active', -- 'active','expired','canceled','renewed'
  canceled_at timestamptz,
  cancel_reason text,
  renewed_into_id uuid, -- aponta para o novo contrato em caso de renovação

  -- Contrato anexado
  contract_file_url text,
  contract_file_name text,

  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_custom_subs_user ON public.custom_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_subs_status ON public.custom_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_custom_subs_ends_at ON public.custom_subscriptions(ends_at) WHERE status = 'active';

-- ============================================================
-- 3) Histórico de pagamentos de contratos customizados
-- ============================================================
CREATE TABLE IF NOT EXISTS public.custom_subscription_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_subscription_id uuid NOT NULL REFERENCES public.custom_subscriptions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  recorded_by_admin_id uuid NOT NULL,

  amount_cents integer NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'pix',
  paid_at timestamptz NOT NULL DEFAULT now(),

  receipt_file_url text,
  receipt_file_name text,
  notes text,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_custom_payments_sub ON public.custom_subscription_payments(custom_subscription_id);
CREATE INDEX IF NOT EXISTS idx_custom_payments_user ON public.custom_subscription_payments(user_id);

-- ============================================================
-- 4) Log de renovações
-- ============================================================
CREATE TABLE IF NOT EXISTS public.custom_subscription_renewals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  renewed_by_admin_id uuid NOT NULL,
  previous_subscription_id uuid NOT NULL REFERENCES public.custom_subscriptions(id) ON DELETE CASCADE,
  new_subscription_id uuid NOT NULL REFERENCES public.custom_subscriptions(id) ON DELETE CASCADE,
  renewed_at timestamptz NOT NULL DEFAULT now(),
  notes text
);

CREATE INDEX IF NOT EXISTS idx_renewals_user ON public.custom_subscription_renewals(user_id);

-- ============================================================
-- 5) RLS
-- ============================================================
ALTER TABLE public.custom_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_subscription_renewals ENABLE ROW LEVEL SECURITY;

-- custom_subscriptions: admin total / user pode ler o próprio
DROP POLICY IF EXISTS "admins manage custom subs" ON public.custom_subscriptions;
CREATE POLICY "admins manage custom subs"
  ON public.custom_subscriptions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "users read own custom sub" ON public.custom_subscriptions;
CREATE POLICY "users read own custom sub"
  ON public.custom_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- custom_subscription_payments: admin total / user pode ler os próprios
DROP POLICY IF EXISTS "admins manage custom payments" ON public.custom_subscription_payments;
CREATE POLICY "admins manage custom payments"
  ON public.custom_subscription_payments FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "users read own custom payments" ON public.custom_subscription_payments;
CREATE POLICY "users read own custom payments"
  ON public.custom_subscription_payments FOR SELECT
  USING (auth.uid() = user_id);

-- custom_subscription_renewals: admin total
DROP POLICY IF EXISTS "admins manage renewals" ON public.custom_subscription_renewals;
CREATE POLICY "admins manage renewals"
  ON public.custom_subscription_renewals FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- 6) Triggers updated_at
-- ============================================================
DROP TRIGGER IF EXISTS update_custom_subs_updated_at ON public.custom_subscriptions;
CREATE TRIGGER update_custom_subs_updated_at
  BEFORE UPDATE ON public.custom_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 7) Storage bucket para anexos (privado)
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('custom-contracts', 'custom-contracts', false)
ON CONFLICT (id) DO NOTHING;

-- Apenas admin lê/escreve nesse bucket
DROP POLICY IF EXISTS "admins read custom contracts" ON storage.objects;
CREATE POLICY "admins read custom contracts"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'custom-contracts' AND public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "admins upload custom contracts" ON storage.objects;
CREATE POLICY "admins upload custom contracts"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'custom-contracts' AND public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "admins update custom contracts" ON storage.objects;
CREATE POLICY "admins update custom contracts"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'custom-contracts' AND public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "admins delete custom contracts" ON storage.objects;
CREATE POLICY "admins delete custom contracts"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'custom-contracts' AND public.has_role(auth.uid(), 'admin'::app_role));
