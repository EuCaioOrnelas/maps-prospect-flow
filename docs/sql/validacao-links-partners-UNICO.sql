-- =====================================================================
-- WIIZE PARTNERS — VALIDAÇÃO COMPLETA (RESULTADO ÚNICO)
-- 100% leitura. Copie e cole TUDO e execute: devolve UMA única tabela
-- com todos os blocos (o SQL Editor só mostra o resultado da última
-- query, por isso aqui tudo está unido em um só SELECT).
-- Colunas: bloco | item | detalhe | status
-- =====================================================================
WITH
tabelas AS (
  SELECT '01. TABELA' AS bloco, t.nome AS item,
         COALESCE(format('oid=%s', c.oid::text), 'ausente') AS detalhe,
         CASE WHEN c.oid IS NULL THEN 'FALTANDO' ELSE 'OK' END AS status
  FROM (VALUES ('partner_referral_links'),('partner_clicks'),('partner_leads'),
               ('partner_sales'),('partner_commissions'),('partners'),('partner_settings')) t(nome)
  LEFT JOIN pg_class c ON c.relname=t.nome AND c.relnamespace='public'::regnamespace AND c.relkind='r'
),
colunas AS (
  SELECT '02. COLUNA' AS bloco, x.tabela||'.'||x.coluna AS item,
         COALESCE(format_type(a.atttypid,a.atttypmod),'ausente') AS detalhe,
         CASE WHEN a.attname IS NULL THEN 'FALTANDO' ELSE 'OK' END AS status
  FROM (VALUES
    ('partner_referral_links','partner_id'),('partner_referral_links','slug'),
    ('partner_referral_links','label'),('partner_referral_links','utm_source'),
    ('partner_referral_links','utm_medium'),('partner_referral_links','utm_campaign'),
    ('partner_referral_links','expires_at'),('partner_referral_links','is_active'),
    ('partner_referral_links','total_clicks'),('partner_referral_links','total_leads'),
    ('partner_referral_links','total_paid_clients'),
    ('partner_clicks','referral_link_id'),('partner_clicks','partner_id'),
    ('partner_leads','referral_link_id'),('partner_leads','partner_id'),
    ('partner_leads','user_id'),('partner_sales','partner_id')
  ) x(tabela,coluna)
  LEFT JOIN pg_attribute a ON a.attrelid=to_regclass('public.'||x.tabela)
        AND a.attname=x.coluna AND a.attnum>0 AND NOT a.attisdropped
),
funcoes AS (
  SELECT '03. FUNCAO' AS bloco, f.nome AS item,
         CASE WHEN p.oid IS NULL THEN 'ausente'
              ELSE (CASE WHEN p.prosecdef THEN 'security definer' ELSE 'invoker' END)
                   ||' | '||COALESCE(array_to_string(p.proconfig,', '),'SEM search_path') END AS detalhe,
         CASE WHEN p.oid IS NULL THEN 'FALTANDO' ELSE 'OK' END AS status
  FROM (VALUES ('resolve_partner_referral_link'),('partner_create_referral_link'),
               ('partner_set_referral_link_status'),('recompute_partner_referral_link_stats'),
               ('trg_recompute_referral_link_stats'),('attribute_partner_lead'),
               ('recompute_partner_totals'),('generate_commission_for_sale'),
               ('calendar_events_check_overlap')) f(nome)
  LEFT JOIN LATERAL (
    SELECT * FROM pg_proc pp
    WHERE pp.proname=f.nome AND pp.pronamespace='public'::regnamespace LIMIT 1
  ) p ON true
),
triggers AS (
  SELECT '04. TRIGGER' AS bloco, t.nome AS item,
         t.tabela||' | '||CASE WHEN tg.tgname IS NULL THEN 'ausente'
              WHEN tg.tgenabled='D' THEN 'DESABILITADA' ELSE 'ativa' END AS detalhe,
         CASE WHEN tg.tgname IS NULL THEN 'FALTANDO'
              WHEN tg.tgenabled='D' THEN 'ATENCAO' ELSE 'OK' END AS status
  FROM (VALUES ('trg_partner_clicks_link_stats','partner_clicks'),
               ('trg_partner_leads_link_stats','partner_leads'),
               ('trg_calendar_events_no_overlap','calendar_events')) t(nome,tabela)
  LEFT JOIN pg_trigger tg ON tg.tgname=t.nome AND tg.tgrelid=to_regclass('public.'||t.tabela)
        AND NOT tg.tgisinternal
),
rls AS (
  SELECT '05. RLS' AS bloco, c.relname AS item,
         format('policies=%s | auth_select=%s | anon_select=%s',
           (SELECT count(*) FROM pg_policies pp WHERE pp.schemaname='public' AND pp.tablename=c.relname),
           has_table_privilege('authenticated','public.'||c.relname,'SELECT'),
           has_table_privilege('anon','public.'||c.relname,'SELECT')) AS detalhe,
         CASE WHEN c.relrowsecurity THEN 'OK' ELSE 'ATENCAO (RLS off)' END AS status
  FROM pg_class c
  WHERE c.relnamespace='public'::regnamespace AND c.relkind='r'
    AND c.relname IN ('partner_referral_links','partner_clicks','partner_leads','partner_sales','partner_commissions')
),
indices AS (
  SELECT '06. INDICE' AS bloco, indexname AS item, indexdef AS detalhe,
         CASE WHEN indexdef ILIKE '%UNIQUE%' AND indexdef ILIKE '%slug%' THEN 'OK (slug unico)' ELSE 'info' END AS status
  FROM pg_indexes WHERE schemaname='public'
    AND tablename IN ('partner_referral_links','partner_clicks','partner_leads')
),
dados AS (
  SELECT '07. DADOS' AS bloco,'links_total' AS item, count(*)::text AS detalhe,'info' AS status FROM public.partner_referral_links
  UNION ALL SELECT '07. DADOS','links_ativos',count(*)::text,'info' FROM public.partner_referral_links WHERE is_active
  UNION ALL SELECT '07. DADOS','links_expirados_ainda_ativos',count(*)::text,
    CASE WHEN count(*)>0 THEN 'ATENCAO' ELSE 'OK' END
    FROM public.partner_referral_links WHERE is_active AND expires_at IS NOT NULL AND expires_at<now()
  UNION ALL SELECT '07. DADOS','slugs_duplicados',count(*)::text,
    CASE WHEN count(*)>0 THEN 'FALHA' ELSE 'OK' END
    FROM (SELECT lower(slug) FROM public.partner_referral_links GROUP BY 1 HAVING count(*)>1) d
  UNION ALL SELECT '07. DADOS','links_sem_parceiro',count(*)::text,
    CASE WHEN count(*)>0 THEN 'FALHA' ELSE 'OK' END
    FROM public.partner_referral_links l LEFT JOIN public.partners p ON p.id=l.partner_id WHERE p.id IS NULL
  UNION ALL SELECT '07. DADOS','cliques_com_link_inexistente',count(*)::text,
    CASE WHEN count(*)>0 THEN 'FALHA' ELSE 'OK' END
    FROM public.partner_clicks c LEFT JOIN public.partner_referral_links l ON l.id=c.referral_link_id
    WHERE c.referral_link_id IS NOT NULL AND l.id IS NULL
  UNION ALL SELECT '07. DADOS','leads_com_link_inexistente',count(*)::text,
    CASE WHEN count(*)>0 THEN 'FALHA' ELSE 'OK' END
    FROM public.partner_leads pl LEFT JOIN public.partner_referral_links l ON l.id=pl.referral_link_id
    WHERE pl.referral_link_id IS NOT NULL AND l.id IS NULL
),
metricas AS (
  SELECT '08. METRICA' AS bloco, l.slug AS item,
         format('clicks %s/%s | leads %s/%s | clientes %s/%s',
                COALESCE(l.total_clicks,0),
                (SELECT count(*) FROM public.partner_clicks c WHERE c.referral_link_id=l.id),
                COALESCE(l.total_leads,0),
                (SELECT count(*) FROM public.partner_leads pl WHERE pl.referral_link_id=l.id),
                COALESCE(l.total_paid_clients,0),
                (SELECT count(*) FROM public.partner_leads pl WHERE pl.referral_link_id=l.id AND pl.is_paid)) AS detalhe,
         CASE WHEN COALESCE(l.total_clicks,0)=(SELECT count(*) FROM public.partner_clicks c WHERE c.referral_link_id=l.id)
               AND COALESCE(l.total_leads,0)=(SELECT count(*) FROM public.partner_leads pl WHERE pl.referral_link_id=l.id)
               AND COALESCE(l.total_paid_clients,0)=(SELECT count(*) FROM public.partner_leads pl WHERE pl.referral_link_id=l.id AND pl.is_paid)
              THEN 'OK' ELSE 'DIVERGENTE' END AS status
  FROM public.partner_referral_links l
),
grants AS (
  SELECT '09. RPC GRANT' AS bloco, r.rolname||' -> resolve_partner_referral_link' AS item,
         has_function_privilege(r.rolname,p.oid,'EXECUTE')::text AS detalhe,
         CASE WHEN has_function_privilege(r.rolname,p.oid,'EXECUTE') THEN 'OK' ELSE 'FALTANDO GRANT' END AS status
  FROM pg_proc p CROSS JOIN (VALUES ('anon'),('authenticated'),('service_role')) r(rolname)
  WHERE p.proname='resolve_partner_referral_link' AND p.pronamespace='public'::regnamespace
),
funil AS (
  SELECT '10. FUNIL' AS bloco, l.slug AS item,
         format('parceiro=%s | cliques=%s | leads=%s | clientes=%s | lead%%=%s | cliente%%=%s | ativo=%s',
                p.referral_code, COALESCE(l.total_clicks,0), COALESCE(l.total_leads,0), COALESCE(l.total_paid_clients,0),
                CASE WHEN COALESCE(l.total_clicks,0)>0 THEN round(100.0*COALESCE(l.total_leads,0)/l.total_clicks,1) ELSE 0 END,
                CASE WHEN COALESCE(l.total_leads,0)>0 THEN round(100.0*COALESCE(l.total_paid_clients,0)/l.total_leads,1) ELSE 0 END,
                l.is_active) AS detalhe,
         'info' AS status
  FROM public.partner_referral_links l
  JOIN public.partners p ON p.id=l.partner_id
  ORDER BY COALESCE(l.total_clicks,0) DESC
  LIMIT 50
)
SELECT * FROM (
SELECT * FROM tabelas
UNION ALL SELECT * FROM colunas
UNION ALL SELECT * FROM funcoes
UNION ALL SELECT * FROM triggers
UNION ALL SELECT * FROM rls
UNION ALL SELECT * FROM indices
UNION ALL SELECT * FROM dados
UNION ALL SELECT * FROM metricas
UNION ALL SELECT * FROM grants
UNION ALL SELECT * FROM funil
) z
ORDER BY bloco,
         CASE status WHEN 'FALTANDO' THEN 0 WHEN 'FALHA' THEN 1 WHEN 'DIVERGENTE' THEN 2
                     WHEN 'FALTANDO GRANT' THEN 3 WHEN 'ATENCAO' THEN 4 ELSE 5 END,
         item;

-- Se aparecer "FALTANDO GRANT":
--   GRANT EXECUTE ON FUNCTION public.resolve_partner_referral_link(text) TO anon, authenticated;
-- Se aparecer "DIVERGENTE" no bloco 08, rode o backfill:
-- DO $$ DECLARE r record; BEGIN
--   FOR r IN SELECT id FROM public.partner_referral_links LOOP
--     PERFORM public.recompute_partner_referral_link_stats(r.id);
--   END LOOP; END $$;
