DO $$
DECLARE j record;
BEGIN
  FOR j IN SELECT jobname FROM cron.job WHERE jobname IN ('process-campaigns','resume-campaigns','start-scheduled-campaigns','resume-stuck-campaigns')
  LOOP PERFORM cron.unschedule(j.jobname); END LOOP;
END$$;