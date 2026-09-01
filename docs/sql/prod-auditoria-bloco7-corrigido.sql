-- ============================================================
-- WIIZE · Correção do BLOCO 7 da auditoria (SOMENTE LEITURA)
-- Os nomes usados antes estavam errados (partner_links / partners.first_month_boost).
-- Os nomes reais são partner_referral_links e partner_settings.first_month_boost_*
-- ============================================================
SELECT
  '7_partners' AS bloco,
  v.obj        AS item,
  CASE WHEN v.ok THEN 'OK' ELSE 'FALTANDO' END AS status,
  v.kind       AS detalhe
FROM (VALUES
  ('public.partner_referral_links', to_regclass('public.partner_referral_links') IS NOT NULL, 'tabela'),
  ('partner_referral_links.slug', EXISTS (SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name='partner_referral_links' AND column_name='slug'), 'coluna'),
  ('partner_referral_links.total_clicks', EXISTS (SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name='partner_referral_links' AND column_name='total_clicks'), 'coluna'),
  ('partner_referral_links.total_leads', EXISTS (SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name='partner_referral_links' AND column_name='total_leads'), 'coluna'),
  ('partner_referral_links.total_paid_clients', EXISTS (SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name='partner_referral_links' AND column_name='total_paid_clients'), 'coluna'),
  ('partners.referral_code', EXISTS (SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name='partners' AND column_name='referral_code'), 'coluna'),
  ('partner_settings.first_month_boost_enabled', EXISTS (SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name='partner_settings' AND column_name='first_month_boost_enabled'), 'coluna'),
  ('partner_settings.first_month_boost_percent', EXISTS (SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name='partner_settings' AND column_name='first_month_boost_percent'), 'coluna'),
  ('partner_settings.first_month_boost_until', EXISTS (SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name='partner_settings' AND column_name='first_month_boost_until'), 'coluna'),
  ('partner_clicks', to_regclass('public.partner_clicks') IS NOT NULL, 'tabela'),
  ('partner_leads', to_regclass('public.partner_leads') IS NOT NULL, 'tabela')
) AS v(obj, ok, kind)
ORDER BY 2;
