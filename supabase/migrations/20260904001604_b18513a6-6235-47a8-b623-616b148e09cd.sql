-- lovable-cron-fallback-reviewed: 96 runs/day; backstop de conciliação de pagamentos PIX caso o webhook do provedor falhe — crédito não pode depender da aba aberta
select cron.unschedule(jobname) from cron.job where jobname in ('wiize-api-reconcile-every-5min','wiize-api-reconcile-every-15min','wiize-api-notifications-daily');

select cron.schedule(
  'wiize-api-reconcile-every-15min',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://wgokhkawjdxsmvfuhazb.supabase.co/functions/v1/wiize-api-cron',
    headers := '{"Content-Type":"application/json","x-cron-secret":"a1c86854525d6d70405f445e197beca925351daeaae4f722"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

select cron.schedule(
  'wiize-api-notifications-daily',
  '0 15 * * *',
  $$
  select net.http_post(
    url := 'https://wgokhkawjdxsmvfuhazb.supabase.co/functions/v1/wiize-api-cron',
    headers := '{"Content-Type":"application/json","x-cron-secret":"a1c86854525d6d70405f445e197beca925351daeaae4f722"}'::jsonb,
    body := '{"force_monthly":false}'::jsonb
  );
  $$
);