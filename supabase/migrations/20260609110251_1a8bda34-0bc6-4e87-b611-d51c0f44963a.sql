CREATE OR REPLACE FUNCTION public.account_mark_member_login()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.account_members
     SET last_login_at = now(), updated_at = now()
   WHERE user_id = auth.uid();

  INSERT INTO public.user_events (user_id, event_name, event_data)
  VALUES (auth.uid(), 'login', jsonb_build_object('source', 'auth_context'));
END;
$$;

GRANT EXECUTE ON FUNCTION public.account_mark_member_login() TO authenticated;

CREATE OR REPLACE FUNCTION public.account_get_member_last_login(_user_id uuid)
RETURNS timestamptz
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller_owner uuid;
  v_target_owner uuid;
  v_last timestamptz;
BEGIN
  v_caller_owner := public.get_account_owner(auth.uid());
  v_target_owner := public.get_account_owner(_user_id);

  IF v_caller_owner IS NULL OR v_caller_owner <> v_target_owner THEN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'forbidden';
    END IF;
  END IF;

  SELECT GREATEST(
    COALESCE((SELECT am.last_login_at FROM public.account_members am WHERE am.user_id = _user_id ORDER BY am.last_login_at DESC NULLS LAST LIMIT 1), 'epoch'::timestamptz),
    COALESCE((SELECT MAX(ue.created_at) FROM public.user_events ue WHERE ue.user_id = _user_id AND ue.event_name IN ('login', 'signed_in')), 'epoch'::timestamptz)
  ) INTO v_last;

  IF v_last = 'epoch'::timestamptz THEN
    RETURN NULL;
  END IF;

  RETURN v_last;
END;
$$;

GRANT EXECUTE ON FUNCTION public.account_get_member_last_login(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.account_get_member_operational_stats(
  _user_id uuid, _from timestamptz, _to timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller_owner uuid;
  v_target_owner uuid;
  v_leads int := 0;
  v_sales_count int := 0;
  v_sales_value numeric := 0;
  v_numbers_connected int := 0;
  v_numbers_total int := 0;
  v_chat_sent int := 0;
  v_agent_sent int := 0;
  v_warming_sent int := 0;
BEGIN
  v_caller_owner := public.get_account_owner(auth.uid());
  v_target_owner := public.get_account_owner(_user_id);
  IF v_caller_owner IS NULL OR v_caller_owner <> v_target_owner THEN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'forbidden';
    END IF;
  END IF;

  SELECT COUNT(*) INTO v_leads
  FROM public.leads
  WHERE (responsible_user_id = _user_id OR user_id = _user_id OR created_by_user_id = _user_id)
    AND COALESCE(prospected_at, created_at) >= _from
    AND COALESCE(prospected_at, created_at) < _to;

  SELECT COUNT(*), COALESCE(SUM(CASE WHEN sale_type = 'recurring' THEN value * COALESCE(contract_months, 1) ELSE value END), 0)
    INTO v_sales_count, v_sales_value
  FROM public.lead_deals
  WHERE (responsible_user_id = _user_id OR user_id = _user_id)
    AND COALESCE(closed_at, created_at) >= _from
    AND COALESCE(closed_at, created_at) < _to;

  SELECT COUNT(*) FILTER (WHERE COALESCE(is_connected, false)), COUNT(*)
    INTO v_numbers_connected, v_numbers_total
  FROM public.whatsapp_numbers
  WHERE (responsible_user_id = _user_id OR user_id = _user_id);

  SELECT COUNT(*) INTO v_chat_sent
  FROM public.chat_messages
  WHERE user_id = _user_id
    AND direction IN ('outbound', 'out', 'sent')
    AND created_at >= _from AND created_at < _to;

  SELECT COUNT(*) INTO v_agent_sent
  FROM public.agent_message_logs aml
  LEFT JOIN public.ai_agents a ON a.id = aml.agent_id
  WHERE (aml.owner_user_id = _user_id OR a.user_id = _user_id)
    AND aml.direction IN ('sent', 'outbound', 'out')
    AND COALESCE(aml.processed_at, aml.created_at) >= _from
    AND COALESCE(aml.processed_at, aml.created_at) < _to;

  SELECT COALESCE(SUM(messages_sent), 0) INTO v_warming_sent
  FROM public.warming_interactions
  WHERE (user_id = _user_id OR owner_user_id = _user_id)
    AND created_at >= _from AND created_at < _to;

  RETURN jsonb_build_object(
    'leads', v_leads,
    'sales_count', v_sales_count,
    'sales_value', v_sales_value,
    'numbers_connected', v_numbers_connected,
    'numbers_total', v_numbers_total,
    'messages_chat', v_chat_sent,
    'messages_agents', v_agent_sent,
    'messages_warming', v_warming_sent,
    'messages_total', v_chat_sent + v_agent_sent + v_warming_sent
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.account_get_member_operational_stats(uuid, timestamptz, timestamptz) TO authenticated;

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
  )
  SELECT COUNT(*)::int,
         COUNT(DISTINCT s.user_id)::int,
         COALESCE(SUM(s.active_seconds), 0)::int,
         COALESCE(ROUND(AVG(NULLIF(s.active_seconds, 0))), 0)::int
    INTO v_total_users, v_active_users, v_total_seconds, v_avg_seconds
  FROM member_ids mi
  LEFT JOIN sessions s ON s.user_id = mi.user_id;

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