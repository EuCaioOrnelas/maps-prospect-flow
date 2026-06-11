-- Cron: sweep periódico de leads sem resposta para aplicar penalidades progressivas
-- (Meta-only scoring). Roda a cada 30 minutos.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  PERFORM cron.unschedule('revenue-unreplied-sweep');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'revenue-unreplied-sweep',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://wgokhkawjdxsmvfuhazb.supabase.co/functions/v1/revenue-processor',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indnb2toa2F3amR4c212ZnVoYXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MTIyODgsImV4cCI6MjA4ODI4ODI4OH0.zB0PjQDsitFoRn21HDvI7v7uRrTOpd3LdqFTW6mlGYI"}'::jsonb,
    body := '{"action":"sweep_unreplied"}'::jsonb
  );
  $$
);