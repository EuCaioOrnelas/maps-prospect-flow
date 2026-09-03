CREATE OR REPLACE FUNCTION public.wiize_api_rate_check(_bucket text, _limit integer, _window_seconds integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_win_start timestamptz;
  v_prev_start timestamptz;
  v_cur integer := 0;
  v_prev integer := 0;
  v_elapsed numeric;
  v_weighted numeric;
  v_remaining integer;
  v_reset bigint;
BEGIN
  IF _limit IS NULL OR _limit <= 0 THEN
    RETURN jsonb_build_object('allowed', true, 'limit', COALESCE(_limit, 0), 'remaining', 0, 'retry_after', 0, 'reset_at', 0);
  END IF;

  v_win_start := to_timestamp(floor(extract(epoch FROM v_now) / _window_seconds) * _window_seconds);
  v_prev_start := v_win_start - make_interval(secs => _window_seconds);
  v_elapsed := extract(epoch FROM v_now) - extract(epoch FROM v_win_start);
  v_reset := (extract(epoch FROM v_win_start)::bigint + _window_seconds);

  SELECT c.count INTO v_prev
    FROM public.wiize_api_rate_counters c
   WHERE c.bucket_key = _bucket AND c.window_start = v_prev_start;
  v_prev := COALESCE(v_prev, 0);

  INSERT INTO public.wiize_api_rate_counters AS t (bucket_key, window_start, count)
  VALUES (_bucket, v_win_start, 1)
  ON CONFLICT (bucket_key, window_start)
  DO UPDATE SET count = t.count + 1
  RETURNING t.count INTO v_cur;

  v_weighted := v_cur + (v_prev * ((_window_seconds - v_elapsed) / _window_seconds));
  v_remaining := GREATEST(0, _limit - ceil(v_weighted)::int);

  IF v_weighted > _limit THEN
    RETURN jsonb_build_object(
      'allowed', false, 'limit', _limit, 'remaining', 0,
      'retry_after', GREATEST(1, ceil(_window_seconds - v_elapsed)::int),
      'reset_at', v_reset
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', true, 'limit', _limit, 'remaining', v_remaining, 'retry_after', 0, 'reset_at', v_reset
  );
END;
$$;

REVOKE ALL ON FUNCTION public.wiize_api_rate_check(text, integer, integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wiize_api_rate_check(text, integer, integer) TO service_role;