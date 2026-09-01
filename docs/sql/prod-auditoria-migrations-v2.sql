-- ============================================================
-- WIIZE · AUDITORIA (SOMENTE LEITURA) — v2
-- Escopo: prod-fix-account-members-owner.sql (+ v2)
--         prod-fix-agenda-e-partners-links.sql
-- 1 ÚNICO SELECT -> o editor mostra TODAS as linhas de uma vez.
-- Colunas: bloco | item | status | detalhe
-- ============================================================

WITH
-- 1) Coluna account_owner_id em account_members
col AS (
  SELECT
    '1_coluna' AS bloco,
    'account_members.account_owner_id' AS item,
    CASE
      WHEN a.attname IS NULL THEN 'FALTANDO'
      WHEN a.attgenerated <> '' THEN 'OK (GENERATED)'
      ELSE 'OK (coluna real)'
    END AS status,
    COALESCE(format_type(a.atttypid, a.atttypmod), 'coluna inexistente')
      || COALESCE(' | expr=' || pg_get_expr(d.adbin, d.adrelid), '') AS detalhe
  FROM (SELECT 1) x
  LEFT JOIN pg_attribute a
    ON a.attrelid = 'public.account_members'::regclass
   AND a.attname = 'account_owner_id'
   AND a.attnum > 0 AND NOT a.attisdropped
  LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
),

-- 2) Função accessible_owner_ids
fn AS (
  SELECT
    '2_funcao' AS bloco,
    'public.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' AS item,
    CASE
      WHEN p.prosrc ILIKE '%array_agg%' THEN 'ATENCAO (usa array_agg)'
      WHEN p.prosrc ILIKE '%ARRAY(%'    THEN 'OK (ARRAY constructor)'
      ELSE 'OK'
    END AS status,
    CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'INVOKER' END
      || ' | search_path=' || COALESCE(array_to_string(p.proconfig, ','), 'NAO FIXADO') AS detalhe
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'accessible_owner_ids'
),
fn_missing AS (
  SELECT '2_funcao','accessible_owner_ids','FALTANDO','funcao nao existe'
  WHERE NOT EXISTS (SELECT 1 FROM fn)
),

-- 3) Quem ainda referencia account_owner_id (funcoes)
refs_fn AS (
  SELECT
    '3_refs_funcoes' AS bloco,
    p.proname AS item,
    'REFERENCIA account_owner_id' AS status,
    'nao pode dropar a coluna' AS detalhe
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prokind = 'f'
    AND p.prosrc ILIKE '%account_owner_id%'
),

-- 4) Quem ainda referencia account_owner_id (policies)
refs_pol AS (
  SELECT
    '4_refs_policies' AS bloco,
    pol.schemaname || '.' || pol.tablename || ' :: ' || pol.policyname AS item,
    'REFERENCIA account_owner_id' AS status,
    COALESCE(pol.qual, '') || ' ' || COALESCE(pol.with_check, '') AS detalhe
  FROM pg_policies pol
  WHERE COALESCE(pol.qual, '') || COALESCE(pol.with_check, '') ILIKE '%account_owner_id%'
),

-- 5) Agenda: constraint GiST antiga deve ter sido removida
gist AS (
  SELECT
    '5_agenda_gist' AS bloco,
    'calendar_events_no_overlap' AS item,
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_constraint c
      WHERE c.conrelid = to_regclass('public.calendar_events')
        AND c.conname = 'calendar_events_no_overlap'
    ) THEN 'AINDA EXISTE (deveria ter sido removida)'
      ELSE 'OK (removida)' END AS status,
    'exclusion constraint 23P01' AS detalhe
),

-- 6) Agenda: trigger substituto
trg AS (
  SELECT
    '6_agenda_trigger' AS bloco,
    t.tgname AS item,
    CASE WHEN t.tgenabled = 'D' THEN 'DESABILITADO' ELSE 'OK (ativo)' END AS status,
    pg_get_triggerdef(t.oid) AS detalhe
  FROM pg_trigger t
  WHERE t.tgrelid = to_regclass('public.calendar_events')
    AND NOT t.tgisinternal
),
trg_missing AS (
  SELECT '6_agenda_trigger','(nenhum)','ATENCAO','calendar_events sem triggers proprios'
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    WHERE t.tgrelid = to_regclass('public.calendar_events') AND NOT t.tgisinternal
  )
),

-- 7) Partners links: tabelas/colunas esperadas
partners AS (
  SELECT
    '7_partners' AS bloco,
    v.obj AS item,
    CASE WHEN v.ok THEN 'OK' ELSE 'FALTANDO' END AS status,
    v.kind AS detalhe
  FROM (
    VALUES
      ('public.partner_links', to_regclass('public.partner_links') IS NOT NULL, 'tabela'),
      ('partner_links.slug', EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema='public' AND table_name='partner_links' AND column_name='slug'), 'coluna'),
      ('partner_links.clicks', EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema='public' AND table_name='partner_links' AND column_name='clicks'), 'coluna'),
      ('partners.referral_code', EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema='public' AND table_name='partners' AND column_name='referral_code'), 'coluna'),
      ('partners.first_month_boost', EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema='public' AND table_name='partners' AND column_name='first_month_boost'), 'coluna')
  ) AS v(obj, ok, kind)
),

-- 8) Objetos invalidos deixados por migration interrompida
bad_idx AS (
  SELECT
    '8_objetos_invalidos' AS bloco,
    n.nspname || '.' || c.relname AS item,
    'INDICE INVALIDO' AS status,
    'recriar com REINDEX' AS detalhe
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_index i ON i.indexrelid = c.oid
  WHERE n.nspname = 'public' AND NOT i.indisvalid
),
bad_con AS (
  SELECT
    '8_objetos_invalidos' AS bloco,
    conrelid::regclass::text || ' :: ' || conname AS item,
    'CONSTRAINT NAO VALIDADA' AS status,
    'rodar VALIDATE CONSTRAINT' AS detalhe
  FROM pg_constraint
  WHERE NOT convalidated
    AND connamespace = 'public'::regnamespace
),

-- 9) Sanidade final (linhas)
sanidade AS (
  SELECT '9_sanidade' AS bloco, t.item, 'CONTAGEM' AS status, t.n::text AS detalhe
  FROM (
    SELECT 'account_members' AS item, (SELECT count(*) FROM public.account_members) AS n
    UNION ALL SELECT 'calendar_events', (SELECT count(*) FROM public.calendar_events)
    UNION ALL SELECT 'user_roles', (SELECT count(*) FROM public.user_roles)
    UNION ALL SELECT 'profiles', (SELECT count(*) FROM public.profiles)
  ) t
)

SELECT * FROM col
UNION ALL SELECT * FROM fn
UNION ALL SELECT * FROM fn_missing
UNION ALL SELECT * FROM refs_fn
UNION ALL SELECT * FROM refs_pol
UNION ALL SELECT * FROM gist
UNION ALL SELECT * FROM trg
UNION ALL SELECT * FROM trg_missing
UNION ALL SELECT * FROM partners
UNION ALL SELECT * FROM bad_idx
UNION ALL SELECT * FROM bad_con
UNION ALL SELECT * FROM sanidade
ORDER BY 1, 2;
