-- Tornar colunas antigas opcionais e adicionar novas para o onboarding "bilionário"
ALTER TABLE public.user_onboarding
  ALTER COLUMN user_profile DROP NOT NULL,
  ALTER COLUMN service_types DROP NOT NULL,
  ALTER COLUMN main_objective DROP NOT NULL,
  ALTER COLUMN team_size DROP NOT NULL;

ALTER TABLE public.user_onboarding
  ADD COLUMN IF NOT EXISTS role text,
  ADD COLUMN IF NOT EXISTS sales_team_size text,
  ADD COLUMN IF NOT EXISTS biggest_challenge text,
  ADD COLUMN IF NOT EXISTS sales_method text,
  ADD COLUMN IF NOT EXISTS monthly_revenue text,
  ADD COLUMN IF NOT EXISTS goal_90d text,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;