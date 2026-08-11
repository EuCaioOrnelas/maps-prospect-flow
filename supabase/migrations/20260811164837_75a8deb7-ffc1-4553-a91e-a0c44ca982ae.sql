CREATE OR REPLACE FUNCTION public.purge_operational_logs()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cron int := 0;
  v_hb int := 0;
  v_net int := 0;
BEGIN
  DELETE FROM cron.job_run_details
  WHERE end_time < now() - interval '7 days'
     OR (end_time IS NULL AND start_time < now() - interval '7 days');
  GET DIAGNOSTICS v_cron = ROW_COUNT;

  DELETE FROM public.campaign_processor_heartbeats
  WHERE created_at < now() - interval '3 days';
  GET DIAGNOSTICS v_hb = ROW_COUNT;

  BEGIN
    DELETE FROM net._http_response WHERE created < now() - interval '1 day';
    GET DIAGNOSTICS v_net = ROW_COUNT;
  EXCEPTION WHEN OTHERS THEN
    v_net := -1;
  END;

  RETURN jsonb_build_object('cron_run_details', v_cron, 'heartbeats', v_hb, 'http_responses', v_net, 'ran_at', now());
END;
$$;

REVOKE ALL ON FUNCTION public.purge_operational_logs() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_operational_logs() TO service_role;

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'purge-operational-logs-daily';
SELECT cron.schedule('purge-operational-logs-daily', '10 4 * * *', $$SELECT public.purge_operational_logs();$$);

SELECT cron.unschedule(24);