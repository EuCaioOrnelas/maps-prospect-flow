
-- 1) Add scheduling columns
ALTER TABLE public.wa_flow_executions
  ADD COLUMN IF NOT EXISTS wait_until timestamptz NULL,
  ADD COLUMN IF NOT EXISTS awaiting_input_until timestamptz NULL,
  ADD COLUMN IF NOT EXISTS awaiting_node_id text NULL;

CREATE INDEX IF NOT EXISTS idx_wa_flow_executions_wait_until
  ON public.wa_flow_executions(wait_until)
  WHERE wait_until IS NOT NULL AND status = 'active';

CREATE INDEX IF NOT EXISTS idx_wa_flow_executions_awaiting_input_until
  ON public.wa_flow_executions(awaiting_input_until)
  WHERE awaiting_input_until IS NOT NULL AND status = 'active';

-- 2) Cron job: every minute, ping the runner in scheduler mode
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  PERFORM cron.unschedule('wa-flow-scheduler');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'wa-flow-scheduler',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://wgokhkawjdxsmvfuhazb.supabase.co/functions/v1/wa-flow-runner',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indnb2toa2F3amR4c212ZnVoYXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MTIyODgsImV4cCI6MjA4ODI4ODI4OH0.zB0PjQDsitFoRn21HDvI7v7uRrTOpd3LdqFTW6mlGYI"}'::jsonb,
    body := '{"scheduler":true}'::jsonb
  );
  $$
);
