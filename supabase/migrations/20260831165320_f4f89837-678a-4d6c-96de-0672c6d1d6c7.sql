ALTER TABLE public.user_onboarding
  ADD COLUMN IF NOT EXISTS acquisition_source text,
  ADD COLUMN IF NOT EXISTS acquisition_source_other text;

CREATE INDEX IF NOT EXISTS idx_user_onboarding_acquisition_source
  ON public.user_onboarding (acquisition_source);