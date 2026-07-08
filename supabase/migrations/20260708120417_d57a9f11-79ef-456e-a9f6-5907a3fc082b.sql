
-- 1) Improve check_rate_limit to return accurate retry_after (seconds until window frees up)
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier text,
  p_endpoint text,
  p_max_requests integer DEFAULT 60,
  p_window_seconds integer DEFAULT 60
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_window_start timestamptz;
  v_current_count integer;
  v_record_id uuid;
  v_oldest timestamptz;
  v_retry integer;
BEGIN
  v_window_start := now() - (p_window_seconds || ' seconds')::interval;

  SELECT id, request_count, window_start
    INTO v_record_id, v_current_count, v_oldest
  FROM public.rate_limits
  WHERE identifier = p_identifier
    AND endpoint = p_endpoint
    AND window_start > v_window_start
  ORDER BY window_start ASC
  LIMIT 1;

  IF v_current_count IS NOT NULL AND v_current_count >= p_max_requests THEN
    v_retry := GREATEST(
      1,
      CEIL(EXTRACT(EPOCH FROM (v_oldest + (p_window_seconds || ' seconds')::interval - now())))::int
    );
    RETURN jsonb_build_object(
      'allowed', false,
      'current_count', v_current_count,
      'max_requests', p_max_requests,
      'retry_after', v_retry
    );
  END IF;

  IF v_record_id IS NOT NULL THEN
    UPDATE public.rate_limits
       SET request_count = request_count + 1
     WHERE id = v_record_id;
    v_current_count := COALESCE(v_current_count, 0) + 1;
  ELSE
    INSERT INTO public.rate_limits (identifier, endpoint, window_start)
    VALUES (p_identifier, p_endpoint, now());
    v_current_count := 1;
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'current_count', v_current_count,
    'max_requests', p_max_requests,
    'remaining', p_max_requests - v_current_count
  );
END;
$function$;

-- 2) reset_rate_limit — clears counters for a given (identifier, endpoint)
CREATE OR REPLACE FUNCTION public.reset_rate_limit(
  p_identifier text,
  p_endpoint text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.rate_limits
   WHERE identifier = p_identifier
     AND endpoint = p_endpoint;
END;
$$;

REVOKE ALL ON FUNCTION public.reset_rate_limit(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reset_rate_limit(text, text) TO anon, authenticated, service_role;

-- 3) Trigger: rate limit on flow publication (status → active)
-- Max 3 activations per minute per user (auth.uid())
CREATE OR REPLACE FUNCTION public.wa_flow_publish_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_res jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'active'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'active') THEN
    v_res := public.check_rate_limit(
      p_identifier => v_uid::text,
      p_endpoint => 'wa_flow_publish',
      p_max_requests => 3,
      p_window_seconds => 60
    );
    IF (v_res->>'allowed')::boolean = false THEN
      RAISE EXCEPTION 'RATE_LIMIT_WA_FLOW_PUBLISH:%', COALESCE(v_res->>'retry_after','60')
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wa_flow_publish_rate_limit ON public.wa_automation_flows;
CREATE TRIGGER trg_wa_flow_publish_rate_limit
BEFORE INSERT OR UPDATE OF status ON public.wa_automation_flows
FOR EACH ROW
EXECUTE FUNCTION public.wa_flow_publish_rate_limit();
