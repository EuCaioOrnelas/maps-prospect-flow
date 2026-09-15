-- Instalação/reparo completo das configurações de rastreamento.
-- Pode ser executada mais de uma vez com segurança.

CREATE TABLE IF NOT EXISTS public.tracking_settings (
  id boolean PRIMARY KEY DEFAULT true,
  gtm_id text,
  ga4_id text,
  google_ads_id text,
  google_ads_conversion_label text,
  meta_pixel_id text,
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CONSTRAINT tracking_settings_singleton CHECK (id)
);

-- Completa instalações antigas ou parciais.
ALTER TABLE public.tracking_settings
  ADD COLUMN IF NOT EXISTS gtm_id text,
  ADD COLUMN IF NOT EXISTS ga4_id text,
  ADD COLUMN IF NOT EXISTS google_ads_id text,
  ADD COLUMN IF NOT EXISTS google_ads_conversion_label text,
  ADD COLUMN IF NOT EXISTS meta_pixel_id text,
  ADD COLUMN IF NOT EXISTS enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_by uuid;

GRANT SELECT ON public.tracking_settings TO anon;
GRANT SELECT, UPDATE ON public.tracking_settings TO authenticated;
GRANT ALL ON public.tracking_settings TO service_role;

ALTER TABLE public.tracking_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tracking_settings_read" ON public.tracking_settings;
CREATE POLICY "tracking_settings_read"
ON public.tracking_settings
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "tracking_settings_admin_write" ON public.tracking_settings;
CREATE POLICY "tracking_settings_admin_write"
ON public.tracking_settings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

INSERT INTO public.tracking_settings (id)
VALUES (true)
ON CONFLICT (id) DO NOTHING;

NOTIFY pgrst, 'reload schema';

-- Verificação: deve retornar uma linha de configuração.
SELECT
  id,
  gtm_id,
  ga4_id,
  google_ads_id,
  google_ads_conversion_label,
  meta_pixel_id,
  enabled,
  updated_at
FROM public.tracking_settings;

-- Verificação: mostra somente os acessos desta tabela.
SELECT
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'tracking_settings'
ORDER BY grantee, privilege_type;
