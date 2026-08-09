SELECT cron.unschedule('calendar-reminders-every-5min')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'calendar-reminders-every-5min');

SELECT cron.schedule(
  'calendar-reminders-every-5min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_functions_endpoint' LIMIT 1) || '/calendar-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
    ),
    body := '{}'::jsonb
  );
  $$
);