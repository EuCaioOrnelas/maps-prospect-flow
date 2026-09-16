-- Evita envio duplicado: desliga o sistema antigo de e-mails de trial
-- (processador a cada 2h + automações antigas), mantendo apenas o novo
-- fluxo Lifecycle (lifecycle-trial-worker-hourly).
-- Seguro de rodar mais de uma vez.

do $$
begin
  if exists (select 1 from cron.job where jobname = 'trial-automation-processor-cron') then
    perform cron.unschedule('trial-automation-processor-cron');
  end if;
end $$;

update public.trial_automations
   set status = 'paused', updated_at = now()
 where status = 'active';

-- Conferência final
select jobname, schedule, active
  from cron.job
 where jobname in ('trial-automation-processor-cron', 'lifecycle-trial-worker-hourly');
