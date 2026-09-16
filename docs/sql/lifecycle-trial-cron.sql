-- Execução automática do fluxo de e-mails do Trial (1x por hora).
-- Idempotente: pode ser executado novamente.
-- A chave abaixo corresponde ao secret LIFECYCLE_CRON_KEY do projeto.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule('lifecycle-trial-worker-15min')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'lifecycle-trial-worker-15min');

SELECT cron.schedule(
  'lifecycle-trial-worker-15min',
  '*/15 * * * *',
  $CRON$
  SELECT net.http_post(
    url := 'https://wgokhkawjdxsmvfuhazb.supabase.co/functions/v1/lifecycle-worker',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', '70af1e39a8465d1a13364b3c17ad23302c9f263e5f205d3d'
    ),
    body := '{"source":"cron"}'::jsonb
  );
  $CRON$
);

SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'lifecycle-trial-worker-15min';
