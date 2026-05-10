create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('support-incident-detector-daily') where exists (select 1 from cron.job where jobname='support-incident-detector-daily');

select cron.schedule(
  'support-incident-detector-daily',
  '0 15 * * *',
  $$
  select net.http_post(
    url:='https://wgokhkawjdxsmvfuhazb.supabase.co/functions/v1/support-incident-detector',
    headers:='{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indnb2toa2F3amR4c212ZnVoYXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MTIyODgsImV4cCI6MjA4ODI4ODI4OH0.zB0PjQDsitFoRn21HDvI7v7uRrTOpd3LdqFTW6mlGYI"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);