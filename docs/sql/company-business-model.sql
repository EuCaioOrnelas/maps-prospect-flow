-- Modelo de negócio da empresa que prospecta.
-- Usado pela IA para escrever a abordagem correta (distribuidor nunca fala como agência).
-- Seguro rodar mais de uma vez.

ALTER TABLE public.company_profiles
  ADD COLUMN IF NOT EXISTS company_business_model TEXT;

COMMENT ON COLUMN public.company_profiles.company_business_model IS
  'distribuidor | industria | revenda | representante | servico | software | agencia | outro';
