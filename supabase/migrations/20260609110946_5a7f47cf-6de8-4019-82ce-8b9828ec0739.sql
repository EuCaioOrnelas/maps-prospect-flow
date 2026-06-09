CREATE OR REPLACE FUNCTION public.account_get_members_usage_summary(_from timestamptz, _to timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_owner uuid;
  v_total_users int := 0;
  v_active_users int := 0;
  v_total_seconds int := 0;
  v_avg_seconds int := 0;
  v_last_login timestamptz;
BEGIN
  v_owner := public.get_account_owner(auth.uid());
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  WITH member_ids AS (
    SELECT v_owner AS user_id
    UNION
    SELECT am.user_id
    FROM public.account_members am
    WHERE am.owner_user_id = v_owner
      AND am.status = 'active'
  ),
  evts AS (
    SELECT ue.user_id, ue.created_at AS ts
    FROM public.user_events ue
    JOIN member_ids mi ON mi.user_id = ue.user_id
    WHERE ue.created_at >= _from AND ue.created_at < _to
  ),
  marked AS (
    SELECT user_id, ts,
      CASE WHEN LAG(ts) OVER (PARTITION BY user_id ORDER BY ts) IS NULL
             OR ts - LAG(ts) OVER (PARTITION BY user_id ORDER BY ts) > interval '15 minutes'
           THEN 1 ELSE 0 END AS new_session
    FROM evts
  ),
  grouped AS (
    SELECT user_id, ts, SUM(new_session) OVER (PARTITION BY user_id ORDER BY ts) AS sess_id
    FROM marked
  ),
  sessions AS (
    SELECT user_id, sess_id, MIN(ts) AS started_at, MAX(ts) AS ended_at,
           GREATEST(EXTRACT(EPOCH FROM (MAX(ts) - MIN(ts)))::int, 0) AS active_seconds
    FROM grouped
    GROUP BY user_id, sess_id
  ),
  member_totals AS (
    SELECT
      (SELECT COUNT(*) FROM member_ids)::int AS total_users,
      (SELECT COUNT(DISTINCT user_id) FROM sessions)::int AS active_users,
      COALESCE((SELECT SUM(active_seconds) FROM sessions), 0)::int AS total_seconds,
      COALESCE((SELECT ROUND(AVG(NULLIF(active_seconds, 0))) FROM sessions), 0)::int AS avg_seconds
  )
  SELECT total_users, active_users, total_seconds, avg_seconds
    INTO v_total_users, v_active_users, v_total_seconds, v_avg_seconds
  FROM member_totals;

  WITH member_ids AS (
    SELECT v_owner AS user_id
    UNION
    SELECT am.user_id
    FROM public.account_members am
    WHERE am.owner_user_id = v_owner
  ), logins AS (
    SELECT am.last_login_at AS ts
    FROM public.account_members am
    JOIN member_ids mi ON mi.user_id = am.user_id
    WHERE am.last_login_at IS NOT NULL
    UNION ALL
    SELECT ue.created_at AS ts
    FROM public.user_events ue
    JOIN member_ids mi ON mi.user_id = ue.user_id
    WHERE ue.event_name IN ('login', 'signed_in')
  )
  SELECT MAX(ts) INTO v_last_login FROM logins;

  RETURN jsonb_build_object(
    'total_users', v_total_users,
    'active_users', v_active_users,
    'total_seconds', v_total_seconds,
    'avg_session_seconds', v_avg_seconds,
    'last_login_at', v_last_login
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.account_get_members_usage_summary(timestamptz, timestamptz) TO authenticated;