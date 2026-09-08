-- ============================================================
-- CRONS: evolution-keepalive-5min  +  wa-flow-runner-tick-1min
-- Projeto: lqfqnqfeuneorxocybru
-- ============================================================
-- COPIE E COLE INTEIRO no SQL Editor do seu banco.
--
-- ATENÇÃO (1 substituição obrigatória):
--   Troque <SUA_SERVICE_ROLE_KEY> pela service_role key do projeto
--   (Project Settings > API > service_role). O keepalive só aceita
--   service role — com a anon key ele responde 401.
-- ============================================================

-- 1) Extensões (não falha se já existirem)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2) Remove jobs anteriores com segurança
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'evolution-keepalive-5min') THEN
    PERFORM cron.unschedule('evolution-keepalive-5min');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'wa-flow-runner-tick-1min') THEN
    PERFORM cron.unschedule('wa-flow-runner-tick-1min');
  END IF;
END $$;

-- 3) Keepalive dos Números de Atendimento (Evolution)
--    A cada 5 min: religa sessões caídas, reaplica webhook,
--    envia e-mail de reconexão e apaga histórico após 30 dias.
SELECT cron.schedule(
  'evolution-keepalive-5min',
  '*/5 * * * *',
  $CRON$
  SELECT net.http_post(
    url := 'https://lqfqnqfeuneorxocybru.supabase.co/functions/v1/evolution-instance?keepalive=1',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <SUA_SERVICE_ROLE_KEY>'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $CRON$
);

-- 4) Tick dos fluxos de WhatsApp
--    A cada 1 min: processa esperas vencidas e reengajamento por inatividade.
SELECT cron.schedule(
  'wa-flow-runner-tick-1min',
  '* * * * *',
  $CRON$
  SELECT net.http_post(
    url := 'https://lqfqnqfeuneorxocybru.supabase.co/functions/v1/wa-flow-runner',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxZnFucWZldW5lb3J4b2N5YnJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxMTMyMjQsImV4cCI6MjA4NDY4OTIyNH0.ccxmuoqz-hlanRfqdvQZXN5tdt5d_8j5F6DVCjZAeB8',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxZnFucWZldW5lb3J4b2N5YnJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxMTMyMjQsImV4cCI6MjA4NDY4OTIyNH0.ccxmuoqz-hlanRfqdvQZXN5tdt5d_8j5F6DVCjZAeB8'
    ),
    body := '{"mode":"tick"}'::jsonb
  ) AS request_id;
  $CRON$
);

-- 5) Confirma
SELECT jobid, jobname, schedule, active
FROM cron.job
WHERE jobname IN ('evolution-keepalive-5min', 'wa-flow-runner-tick-1min');

-- 6) (opcional) Ver as últimas execuções
-- SELECT j.jobname, d.status, d.return_message, d.start_time
-- FROM cron.job_run_details d
-- JOIN cron.job j ON j.jobid = d.jobid
-- WHERE j.jobname IN ('evolution-keepalive-5min','wa-flow-runner-tick-1min')
-- ORDER BY d.start_time DESC LIMIT 20;
