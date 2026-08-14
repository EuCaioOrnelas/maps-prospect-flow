DO $$
DECLARE j record;
BEGIN
  FOR j IN SELECT jobname FROM cron.job
           WHERE jobname IN ('campaign-processor-cron','start-scheduled-campaigns-cron','wa-flow-scheduler')
  LOOP
    PERFORM cron.unschedule(j.jobname);
  END LOOP;
END $$;