-- ============================================================
-- CRON: cleanup-campaign-drafts  (v2 — corrige erro 2BP01)
-- Deleta rascunhos de campanha abandonados (>30 min)
-- ============================================================
-- MUDANÇA vs v1:
--   * NÃO roda CREATE EXTENSION (elas já existem; o script
--     pós-criação do Supabase causava o erro 2BP01).
--   * unschedule protegido (não quebra se o job não existir).
-- ============================================================

-- 1) Verifica se as extensões já estão instaladas (só leitura)
DO $$
DECLARE
  v_cron boolean;
  v_net  boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') INTO v_cron;
  SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net')  INTO v_net;

  IF NOT v_cron THEN
    RAISE EXCEPTION 'pg_cron NAO instalado. Habilite pelo painel do Supabase (Database > Extensions) antes de rodar este script.';
  END IF;
  IF NOT v_net THEN
    RAISE EXCEPTION 'pg_net NAO instalado. Habilite pelo painel do Supabase (Database > Extensions) antes de rodar este script.';
  END IF;

  RAISE NOTICE 'Extensoes OK: pg_cron e pg_net presentes.';
END $$;

-- 2) Remove cron anterior de forma segura (não falha se não existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-campaign-drafts-hourly') THEN
    PERFORM cron.unschedule('cleanup-campaign-drafts-hourly');
    RAISE NOTICE 'Job anterior removido.';
  ELSE
    RAISE NOTICE 'Nenhum job anterior encontrado (ok).';
  END IF;
END $$;

-- 3) Agenda a execução a cada 1 hora
SELECT cron.schedule(
  'cleanup-campaign-drafts-hourly',
  '0 * * * *',
  $CRON$
  SELECT net.http_post(
    url := 'https://lqfqnqfeuneorxocybru.supabase.co/functions/v1/cleanup-campaign-drafts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxZnFucWZldW5lb3J4b2N5YnJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxMTMyMjQsImV4cCI6MjA4NDY4OTIyNH0.ccxmuoqz-hlanRfqdvQZXN5tdt5d_8j5F6DVCjZAeB8'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $CRON$
);

-- 4) Confirma o agendamento
SELECT jobid, jobname, schedule, active
FROM cron.job
WHERE jobname = 'cleanup-campaign-drafts-hourly';
