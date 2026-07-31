-- Recria as RPCs de Estatística Operacional do admin (idempotente).
-- Rodar no banco de PRODUÇÃO se a aba 'Operacional' der erro (função inexistente).

CREATE OR REPLACE FUNCTION public.admin_get_user_activity_sessions(_user_id uuid, _from timestamp with time zone, _to timestamp with time zone)
 RETURNS TABLE(day date, session_start timestamp with time zone, session_end timestamp with time zone, active_seconds integer, event_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH evts AS (
    SELECT created_at AS ts
    FROM public.user_events
    WHERE user_id = _user_id
      AND created_at >= _from AND created_at < _to
    ORDER BY created_at
  ),
  marked AS (
    SELECT
      ts,
      CASE
        WHEN LAG(ts) OVER (ORDER BY ts) IS NULL
          OR ts - LAG(ts) OVER (ORDER BY ts) > interval '15 minutes'
        THEN 1 ELSE 0
      END AS new_session
    FROM evts
  ),
  grouped AS (
    SELECT ts, SUM(new_session) OVER (ORDER BY ts) AS sess_id
    FROM marked
  )
  SELECT
    MIN(ts)::date AS day,
    MIN(ts) AS session_start,
    MAX(ts) AS session_end,
    GREATEST(EXTRACT(EPOCH FROM (MAX(ts) - MIN(ts)))::int, 0) AS active_seconds,
    COUNT(*)::int AS event_count
  FROM grouped
  GROUP BY sess_id
  ORDER BY session_start;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.admin_get_user_operational_stats(_user_id uuid, _from timestamp with time zone, _to timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_leads int := 0;
  v_sales_count int := 0;
  v_sales_value numeric := 0;
  v_numbers_connected int := 0;
  v_numbers_total int := 0;
  v_chat_sent int := 0;
  v_agent_sent int := 0;
  v_warming_sent int := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT COUNT(*) INTO v_leads
  FROM public.leads
  WHERE (responsible_user_id = _user_id OR user_id = _user_id OR created_by_user_id = _user_id)
    AND created_at >= _from AND created_at < _to;

  SELECT COUNT(*), COALESCE(SUM(
    CASE WHEN sale_type = 'recurring' THEN value * COALESCE(contract_months,1) ELSE value END
  ), 0)
  INTO v_sales_count, v_sales_value
  FROM public.lead_deals
  WHERE (responsible_user_id = _user_id OR user_id = _user_id)
    AND closed_at >= _from AND closed_at < _to;

  SELECT
    COUNT(*) FILTER (WHERE status IN ('connected','open','active','online')),
    COUNT(*)
  INTO v_numbers_connected, v_numbers_total
  FROM public.whatsapp_numbers
  WHERE (responsible_user_id = _user_id OR user_id = _user_id);

  SELECT COUNT(*) INTO v_chat_sent
  FROM public.chat_messages
  WHERE user_id = _user_id
    AND direction IN ('outbound','out','sent')
    AND created_at >= _from AND created_at < _to;

  SELECT COUNT(*) INTO v_agent_sent
  FROM public.agent_message_logs aml
  JOIN public.ai_agents a ON a.id = aml.agent_id
  WHERE (aml.owner_user_id = _user_id OR a.user_id = _user_id)
    AND aml.direction = 'sent'
    AND aml.processed_at >= _from AND aml.processed_at < _to;

  SELECT COALESCE(SUM(messages_sent), 0) INTO v_warming_sent
  FROM public.warming_interactions
  WHERE user_id = _user_id
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
$function$
;

GRANT EXECUTE ON FUNCTION public.admin_get_user_operational_stats(uuid, timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_user_activity_sessions(uuid, timestamptz, timestamptz) TO authenticated;
