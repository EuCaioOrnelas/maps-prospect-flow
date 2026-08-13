-- Agenda: processa lembretes de compromissos a cada 5 minutos.
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'calendar-reminders-every-5min';

SELECT cron.schedule(
  'calendar-reminders-every-5min',
  '*/5 * * * *',
  $cron$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_functions_endpoint' LIMIT 1) || '/calendar-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
    ),
    body := '{}'::jsonb
  );
  $cron$
);

-- CRM: processa avisos de renovação diariamente às 08:00 de Brasília
-- (11:00 UTC; Brasília permanece UTC-3 durante todo o ano).
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'crm-renewal-processor-daily';

SELECT cron.schedule(
  'crm-renewal-processor-daily',
  '0 11 * * *',
  $cron$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_functions_endpoint' LIMIT 1) || '/crm-renewal-processor',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
    ),
    body := '{}'::jsonb
  );
  $cron$
);