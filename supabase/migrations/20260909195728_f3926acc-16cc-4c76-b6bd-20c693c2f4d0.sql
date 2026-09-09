select cron.unschedule('intel-engine-sweep-daily') where exists (select 1 from cron.job where jobname = 'intel-engine-sweep-daily');

select cron.schedule(
  'intel-engine-sweep-daily',
  '10 6 * * *',
  $$
  select net.http_post(
    url := 'https://wgokhkawjdxsmvfuhazb.supabase.co/functions/v1/intel-engine',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"action":"sweep_all","limit":3000,"per_account":300}'::jsonb
  );
  $$
);