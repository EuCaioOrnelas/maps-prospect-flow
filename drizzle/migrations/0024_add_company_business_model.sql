ALTER TABLE public.company_profiles
  ADD COLUMN IF NOT EXISTS company_business_model TEXT;

COMMENT ON COLUMN public.company_profiles.company_business_model IS
  'Modelo de atuação comercial: distribuidor, industria, revenda, representante, servico, software, agencia ou outro.';