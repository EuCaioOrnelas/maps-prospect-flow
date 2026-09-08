-- lovable-cron-fallback-reviewed: 288 runs/day; reconciliation backstop for WhatsApp sessions — primary reconnect is event-driven via webhook, this catches missed disconnect events (user requires the number to stay connected as much as possible)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE INDEX IF NOT EXISTS chat_conversations_owner_line_idx
  ON public.chat_conversations (owner_user_id, phone_number_id, waba_connection_id);

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'evolution-keepalive-5min';
SELECT cron.schedule(
  'evolution-keepalive-5min',
  '*/5 * * * *',
  $cron$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_functions_endpoint' LIMIT 1) || '/evolution-instance?keepalive=1',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
    ),
    body := '{}'::jsonb
  );
  $cron$
);