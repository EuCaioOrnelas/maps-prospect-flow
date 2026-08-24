-- =====================================================================
-- WIIZE PARTNERS — VALIDAÇÃO COMPLETA DO SISTEMA DE LINKS PERSONALIZADOS
-- Somente LEITURA (nenhum dado é alterado). Copie e cole inteiro no
-- SQL Editor do banco de produção e execute de uma vez.
-- Cada bloco devolve um resultado com STATUS = OK / FALTANDO / ATENCAO.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) TABELAS OBRIGATÓRIAS
-- ---------------------------------------------------------------------
SELECT '1. TABELAS' AS bloco,
       t.nome,
       CASE WHEN c.oid IS NULL THEN 'FALTANDO' ELSE 'OK' END AS status
FROM (VALUES
  ('partner_referral_links'),
  ('partner_clicks'),
  ('partner_leads'),
  ('partner_sales'),
  ('partner_commissions'),
  ('partners'),
  ('partner_settings')
) AS t(nome)
LEFT JOIN pg_class c
       ON c.relname = t.nome
      AND c.relnamespace = 'public'::regnamespace
      AND c.relkind = 'r'
ORDER BY status DESC, t.nome;

-- ---------------------------------------------------------------------
-- 2) COLUNAS CRÍTICAS (as que causaram os erros 42703 em produção)
-- ---------------------------------------------------------------------
SELECT '2. COLUNAS' AS bloco,
       x.tabela, x.coluna,
       CASE WHEN a.attname IS NULL THEN 'FALTANDO' ELSE 'OK' END AS status,
       COALESCE(format_type(a.atttypid, a.atttypmod), '-') AS tipo
FROM (VALUES
  ('partner_referral_links','partner_id'),
  ('partner_referral_links','slug'),
  ('partner_referral_links','label'),
  ('partner_referral_links','utm_source'),
  ('partner_referral_links','utm_medium'),
  ('partner_referral_links','utm_campaign'),
  ('partner_referral_links','expires_at'),
  ('partner_referral_links','is_active'),
  ('partner_referral_links','total_clicks'),
  ('partner_referral_links','total_leads'),
  ('partner_referral_links','total_paid_clients'),
  ('partner_clicks','referral_link_id'),
  ('partner_clicks','partner_id'),
  ('partner_leads','referral_link_id'),
  ('partner_leads','partner_id'),
  ('partner_leads','user_id'),
  ('partner_sales','partner_id')
) AS x(tabela, coluna)
LEFT JOIN pg_attribute a
       ON a.attrelid = to_regclass('public.' || x.tabela)
      AND a.attname = x.coluna
      AND a.attnum > 0 AND NOT a.attisdropped
ORDER BY status DESC, x.tabela, x.coluna;

-- ---------------------------------------------------------------------
-- 3) FUNÇÕES / RPCs DO SISTEMA DE LINKS
-- ---------------------------------------------------------------------
SELECT '3. FUNCOES' AS bloco,
       f.nome,
       CASE WHEN p.oid IS NULL THEN 'FALTANDO' ELSE 'OK' END AS status,
       CASE WHEN p.prosecdef THEN 'security definer' ELSE 'invoker' END AS modo,
       COALESCE(array_to_string(p.proconfig, ', '), 'SEM search_path') AS config
FROM (VALUES
  ('resolve_partner_referral_link'),
  ('partner_create_referral_link'),
  ('partner_set_referral_link_status'),
  ('recompute_partner_referral_link_stats'),
  ('trg_recompute_referral_link_stats'),
  ('attribute_partner_lead'),
  ('recompute_partner_totals'),
  ('generate_commission_for_sale')
) AS f(nome)
LEFT JOIN pg_proc p
       ON p.proname = f.nome
      AND p.pronamespace = 'public'::regnamespace
ORDER BY status DESC, f.nome;

-- ---------------------------------------------------------------------
-- 4) TRIGGERS DE MÉTRICAS
-- ---------------------------------------------------------------------
SELECT '4. TRIGGERS' AS bloco,
       t.nome, t.tabela,
       CASE WHEN tg.tgname IS NULL THEN 'FALTANDO' ELSE 'OK' END AS status,
       CASE WHEN tg.tgenabled = 'D' THEN 'DESABILITADA' ELSE 'ativa' END AS estado
FROM (VALUES
  ('trg_partner_clicks_link_stats','partner_clicks'),
  ('trg_partner_leads_link_stats','partner_leads'),
  ('trg_calendar_events_no_overlap','calendar_events')
) AS t(nome, tabela)
LEFT JOIN pg_trigger tg
       ON tg.tgname = t.nome
      AND tg.tgrelid = to_regclass('public.' || t.tabela)
      AND NOT tg.tgisinternal
ORDER BY status DESC, t.nome;

-- ---------------------------------------------------------------------
-- 5) RLS + POLÍTICAS + GRANTS
-- ---------------------------------------------------------------------
SELECT '5. RLS' AS bloco,
       c.relname AS tabela,
       CASE WHEN c.relrowsecurity THEN 'OK (RLS on)' ELSE 'ATENCAO (RLS off)' END AS status,
       (SELECT count(*) FROM pg_policies pp
         WHERE pp.schemaname='public' AND pp.tablename=c.relname) AS politicas,
       has_table_privilege('authenticated','public.'||c.relname,'SELECT') AS auth_select,
       has_table_privilege('anon','public.'||c.relname,'SELECT') AS anon_select
FROM pg_class c
WHERE c.relnamespace='public'::regnamespace
  AND c.relkind='r'
  AND c.relname IN ('partner_referral_links','partner_clicks','partner_leads','partner_sales','partner_commissions')
ORDER BY c.relname;

-- ---------------------------------------------------------------------
-- 6) ÍNDICES / UNICIDADE DO SLUG
-- ---------------------------------------------------------------------
SELECT '6. INDICES' AS bloco, indexname, indexdef,
       CASE WHEN indexdef ILIKE '%UNIQUE%' AND indexdef ILIKE '%slug%'
            THEN 'OK (slug unico)' ELSE 'info' END AS status
FROM pg_indexes
WHERE schemaname='public' AND tablename IN ('partner_referral_links','partner_clicks','partner_leads');

-- ---------------------------------------------------------------------
-- 7) SANIDADE DOS DADOS — links órfãos, slugs duplicados, expirados
-- ---------------------------------------------------------------------
SELECT '7. DADOS' AS bloco, 'links_total' AS metrica, count(*)::text AS valor, 'info' AS status FROM public.partner_referral_links
UNION ALL
SELECT '7. DADOS','links_ativos', count(*)::text, 'info' FROM public.partner_referral_links WHERE is_active
UNION ALL
SELECT '7. DADOS','links_expirados_ainda_ativos', count(*)::text,
       CASE WHEN count(*)>0 THEN 'ATENCAO' ELSE 'OK' END
  FROM public.partner_referral_links WHERE is_active AND expires_at IS NOT NULL AND expires_at < now()
UNION ALL
SELECT '7. DADOS','slugs_duplicados', count(*)::text,
       CASE WHEN count(*)>0 THEN 'FALHA' ELSE 'OK' END
  FROM (SELECT lower(slug) FROM public.partner_referral_links GROUP BY 1 HAVING count(*)>1) d
UNION ALL
SELECT '7. DADOS','links_sem_parceiro', count(*)::text,
       CASE WHEN count(*)>0 THEN 'FALHA' ELSE 'OK' END
  FROM public.partner_referral_links l
  LEFT JOIN public.partners p ON p.id = l.partner_id
 WHERE p.id IS NULL
UNION ALL
SELECT '7. DADOS','cliques_com_link_inexistente', count(*)::text,
       CASE WHEN count(*)>0 THEN 'FALHA' ELSE 'OK' END
  FROM public.partner_clicks c
  LEFT JOIN public.partner_referral_links l ON l.id = c.referral_link_id
 WHERE c.referral_link_id IS NOT NULL AND l.id IS NULL
UNION ALL
SELECT '7. DADOS','leads_com_link_inexistente', count(*)::text,
       CASE WHEN count(*)>0 THEN 'FALHA' ELSE 'OK' END
  FROM public.partner_leads pl
  LEFT JOIN public.partner_referral_links l ON l.id = pl.referral_link_id
 WHERE pl.referral_link_id IS NOT NULL AND l.id IS NULL;

-- ---------------------------------------------------------------------
-- 8) CONFERÊNCIA DAS MÉTRICAS (contadores x realidade)
--    Qualquer linha com status DIVERGENTE precisa de backfill (bloco 11).
-- ---------------------------------------------------------------------
WITH reais AS (
  SELECT l.id, l.slug,
         l.total_clicks, l.total_leads, l.total_paid_clients,
         (SELECT count(*) FROM public.partner_clicks c WHERE c.referral_link_id = l.id) AS clicks_reais,
         (SELECT count(*) FROM public.partner_leads pl WHERE pl.referral_link_id = l.id) AS leads_reais,
         (SELECT count(*) FROM public.partner_leads pl
           WHERE pl.referral_link_id = l.id AND pl.is_paid) AS clientes_reais
  FROM public.partner_referral_links l
)
SELECT '8. METRICAS' AS bloco, slug,
       total_clicks, clicks_reais,
       total_leads, leads_reais,
       total_paid_clients, clientes_reais,
       CASE WHEN COALESCE(total_clicks,0)=clicks_reais
             AND COALESCE(total_leads,0)=leads_reais
             AND COALESCE(total_paid_clients,0)=clientes_reais
            THEN 'OK' ELSE 'DIVERGENTE' END AS status
FROM reais
ORDER BY status DESC, slug;

-- ---------------------------------------------------------------------
-- 9) TESTE FUNCIONAL DA RPC DE RESOLUÇÃO (/r/:slug)
--    Executa a função em um link ativo real. Retorno vazio = problema.
-- ---------------------------------------------------------------------
SELECT '9. RPC RESOLVE' AS bloco, l.slug,
       to_jsonb(r.*) AS retorno,
       CASE WHEN r IS NULL THEN 'FALHA' ELSE 'OK' END AS status
FROM (
  SELECT * FROM public.partner_referral_links
  WHERE is_active ORDER BY created_at DESC LIMIT 5
) l
LEFT JOIN LATERAL public.resolve_partner_referral_link(l.slug) r ON true;

-- ---------------------------------------------------------------------
-- 10) FUNIL POR LINK (visão de negócio)
-- ---------------------------------------------------------------------
SELECT '10. FUNIL' AS bloco,
       p.referral_code AS parceiro,
       l.slug,
       l.label,
       l.utm_source, l.utm_campaign,
       COALESCE(l.total_clicks,0)    AS cliques,
       COALESCE(l.total_leads,0)     AS leads,
       COALESCE(l.total_paid_clients,0) AS clientes,
       CASE WHEN COALESCE(l.total_clicks,0) > 0
            THEN round(100.0 * COALESCE(l.total_leads,0) / l.total_clicks, 1)
            ELSE 0 END AS taxa_lead_pct,
       CASE WHEN COALESCE(l.total_leads,0) > 0
            THEN round(100.0 * COALESCE(l.total_paid_clients,0) / l.total_leads, 1)
            ELSE 0 END AS taxa_cliente_pct,
       l.is_active, l.expires_at
FROM public.partner_referral_links l
JOIN public.partners p ON p.id = l.partner_id
ORDER BY cliques DESC NULLS LAST
LIMIT 50;

-- ---------------------------------------------------------------------
-- 11) BACKFILL OPCIONAL — rode SOMENTE se o bloco 8 mostrar DIVERGENTE
-- ---------------------------------------------------------------------
-- DO $$
-- DECLARE r record;
-- BEGIN
--   FOR r IN SELECT id FROM public.partner_referral_links LOOP
--     PERFORM public.recompute_partner_referral_link_stats(r.id);
--   END LOOP;
-- END $$;
