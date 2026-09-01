-- ============================================================================
-- AUDITORIA: cleanup-campaign-drafts — posso ativar Verify JWT?
-- 100% SOMENTE LEITURA. Copie e cole inteiro no SQL Editor de produção.
--
-- O que este script verifica:
--   1. Se existe cron job chamando a edge function cleanup-campaign-drafts
--   2. Se a chamada do cron envia o header Authorization (obrigatório com JWT ON)
--   3. Execuções recentes do job (sucesso/falha) no pg_cron
--   4. Se a tabela campaign_drafts existe e tem RLS/grants corretos
--   5. Veredito final: PODE ATIVAR / NÃO PODE ATIVAR
-- ============================================================================

WITH
job AS (
  SELECT jobid, jobname, command, schedule
  FROM cron.job
  WHERE command ILIKE '%cleanup-campaign-drafts%'
),
-- Analisa se o comando do cron inclui Authorization: Bearer
job_auth AS (
  SELECT
    jobname,
    schedule,
    CASE
      WHEN command ILIKE '%Authorization%' AND command ILIKE '%Bearer%' THEN 'COM Authorization'
      ELSE 'SEM Authorization'
    END AS auth_header,
    CASE
      WHEN command ILIKE '%service_role%' THEN 'usa service_role'
      WHEN command ILIKE '%anon%'         THEN 'usa anon key'
      ELSE 'chave nao identificada no comando'
    END AS key_hint
  FROM job
),
runs AS (
  SELECT
    count(*) FILTER (WHERE status = 'succeeded') AS ok,
    count(*) FILTER (WHERE status = 'failed')    AS falhas,
    max(end_time) FILTER (WHERE status = 'succeeded') AS ultimo_sucesso
  FROM cron.job_run_details r
  JOIN job j ON j.jobid = r.jobid
  WHERE r.start_time > now() - interval '7 days'
),
tbl AS (
  SELECT
    (SELECT count(*) FROM campaign_drafts) AS total_drafts,
    (SELECT relrowsecurity FROM pg_class WHERE relname = 'campaign_drafts' AND relnamespace = 'public'::regnamespace) AS rls_on
),
veredito AS (
  SELECT
    CASE
      WHEN NOT EXISTS (SELECT 1 FROM job)
        THEN 'SEM CRON: funcao so e chamada manualmente. Pode ativar JWT, mas so chamadas autenticadas (SDK do frontend ou service_role) vao funcionar.'
      WHEN EXISTS (SELECT 1 FROM job_auth WHERE auth_header = 'SEM Authorization')
        THEN 'NAO ATIVE AINDA: o cron chama SEM Authorization. Com JWT ON vai retornar 401 e a limpeza para de rodar. Corrija o cron primeiro.'
      WHEN EXISTS (SELECT 1 FROM runs WHERE falhas > 0 AND ok = 0)
        THEN 'ATENCAO: cron existe com Authorization, mas so ha falhas nos ultimos 7 dias. Verifique se a chave usada e valida antes de ativar.'
      ELSE 'PODE ATIVAR: o cron ja envia Authorization e ha execucoes com sucesso. Ativar Verify JWT nao vai quebrar nada.'
    END AS decisao
)
SELECT '1_cron_job' AS bloco, jobname AS item, schedule AS status,
       left(command, 120) AS detalhe
FROM job
UNION ALL
SELECT '2_cron_auth', jobname, auth_header, key_hint FROM job_auth
UNION ALL
SELECT '3_cron_execucoes_7d', 'sucessos', coalesce(ok::text, '0'),
       'ultimo sucesso: ' || coalesce(ultimo_sucesso::text, 'nunca') FROM runs
UNION ALL
SELECT '3_cron_execucoes_7d', 'falhas', coalesce(falhas::text, '0'), '' FROM runs
UNION ALL
SELECT '4_tabela', 'campaign_drafts',
       CASE WHEN tbl.rls_on THEN 'RLS ON' ELSE 'RLS OFF' END,
       'total de rascunhos: ' || tbl.total_drafts FROM tbl
UNION ALL
SELECT '5_veredito', 'cleanup-campaign-drafts', 'DECISAO', decisao FROM veredito
ORDER BY bloco, item;
