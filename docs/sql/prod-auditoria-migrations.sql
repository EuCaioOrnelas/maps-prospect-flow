-- =====================================================================
-- WIIZE • AUDITORIA DE MIGRATIONS (100% SOMENTE LEITURA)
-- Não altera nada. Rode tudo de uma vez e me mande o resultado.
-- =====================================================================

-- 1) Colunas de account_members (owner_user_id x account_owner_id)
SELECT '1_account_members_colunas' AS check,
       column_name, data_type, is_generated, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'account_members'
ORDER BY ordinal_position;

-- 2) Objetos que ainda referenciam "account_owner_id" (funções)
SELECT '2_funcoes_referenciando_account_owner_id' AS check,
       n.nspname AS schema, p.proname AS funcao
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
  AND pg_get_functiondef(p.oid) ILIKE '%account_owner_id%'
ORDER BY 3;

-- 3) Policies que referenciam "account_owner_id"
SELECT '3_policies_referenciando_account_owner_id' AS check,
       schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND (COALESCE(qual,'') ILIKE '%account_owner_id%'
       OR COALESCE(with_check,'') ILIKE '%account_owner_id%')
ORDER BY tablename, policyname;

-- 4) Tabelas públicas SEM RLS habilitado (risco de vazamento)
SELECT '4_tabelas_sem_rls' AS check, c.relname AS tabela
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity = false
ORDER BY 2;

-- 5) Tabelas com RLS ligado mas SEM nenhuma policy (ficam inacessíveis)
SELECT '5_rls_sem_policy' AS check, c.relname AS tabela
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity = true
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = c.relname
  )
ORDER BY 2;

-- 6) Tabelas públicas SEM GRANT para authenticated (quebram no app)
SELECT '6_sem_grant_authenticated' AS check, c.relname AS tabela
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
  AND NOT has_table_privilege('authenticated', c.oid, 'SELECT')
ORDER BY 2;

-- 7) Funções SECURITY DEFINER sem search_path fixo (risco de hijack)
SELECT '7_secdef_sem_search_path' AS check,
       n.nspname AS schema, p.proname AS funcao
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prosecdef
  AND (p.proconfig IS NULL
       OR NOT EXISTS (SELECT 1 FROM unnest(p.proconfig) cfg WHERE cfg LIKE 'search_path=%'))
ORDER BY 3;

-- 8) Triggers da agenda (checar se o de overlap existe e o antigo sumiu)
SELECT '8_triggers_calendar_events' AS check,
       tgname AS trigger, pg_get_triggerdef(t.oid) AS definicao
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'calendar_events' AND NOT t.tgisinternal
ORDER BY 1;

-- 9) Constraint de exclusão antiga da agenda (não deveria mais existir)
SELECT '9_constraint_overlap_agenda' AS check, conname, contype
FROM pg_constraint
WHERE conrelid = 'public.calendar_events'::regclass
  AND contype = 'x';

-- 10) Constraints inválidas (NOT VALID) — indício de migration parcial
SELECT '10_constraints_nao_validadas' AS check,
       conrelid::regclass AS tabela, conname, contype
FROM pg_constraint
WHERE connamespace = 'public'::regnamespace AND convalidated = false
ORDER BY 2;

-- 11) Índices inválidos / duplicados de criação interrompida
SELECT '11_indices_invalidos' AS check,
       c.relname AS indice, t.relname AS tabela
FROM pg_index i
JOIN pg_class c ON c.oid = i.indexrelid
JOIN pg_class t ON t.oid = i.indrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND (i.indisvalid = false OR i.indisready = false)
ORDER BY 2;

-- 12) FKs apontando para auth.users (proibido no padrão do projeto)
SELECT '12_fk_para_auth_users' AS check,
       conrelid::regclass AS tabela, conname
FROM pg_constraint
WHERE contype = 'f'
  AND connamespace = 'public'::regnamespace
  AND confrelid = 'auth.users'::regclass
ORDER BY 2;

-- 13) Colunas geradas (GENERATED ALWAYS) no schema público — resquício de fix antigo
SELECT '13_colunas_geradas' AS check,
       table_name, column_name, generation_expression
FROM information_schema.columns
WHERE table_schema = 'public' AND is_generated = 'ALWAYS'
ORDER BY 1, 2;

-- 14) Cron jobs ativos (SDR, follow-up, renovação, campanhas)
SELECT '14_cron_jobs' AS check, jobid, schedule, jobname, active
FROM cron.job
ORDER BY jobid;

-- 15) Últimas execuções de cron com falha (24h)
SELECT '15_cron_falhas_24h' AS check, jobid, status, return_message, start_time
FROM cron.job_run_details
WHERE status <> 'succeeded' AND start_time > now() - interval '24 hours'
ORDER BY start_time DESC
LIMIT 30;

-- 16) Views SECURITY DEFINER (bypass de RLS)
SELECT '16_views_security_definer' AS check, c.relname AS view
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'v'
  AND EXISTS (SELECT 1 FROM unnest(COALESCE(c.reloptions, '{}')) o WHERE o ILIKE 'security_%')
ORDER BY 2;

-- 17) Tabelas expostas ao anon (confira se são realmente públicas)
SELECT '17_tabelas_com_acesso_anon' AS check, c.relname AS tabela
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
  AND has_table_privilege('anon', c.oid, 'SELECT')
ORDER BY 2;

-- 18) Buckets de storage públicos (devem ser privados)
SELECT '18_buckets_publicos' AS check, id, name, public
FROM storage.buckets
ORDER BY 2;

-- 19) Resumo de contagem por tabela crítica (sanidade dos dados)
SELECT '19_sanidade' AS check,
       (SELECT count(*) FROM public.account_members) AS account_members,
       (SELECT count(*) FROM public.profiles)        AS profiles,
       (SELECT count(*) FROM public.user_roles)      AS user_roles,
       (SELECT count(*) FROM public.calendar_events) AS calendar_events;
