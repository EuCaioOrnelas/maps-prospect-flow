CREATE OR REPLACE FUNCTION public.admin_get_user_operational_stats(
  _user_id uuid,
  _from timestamptz,
  _to timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    COUNT(*) FILTER (WHERE is_connected IS TRUE),
    COUNT(*)
  INTO v_numbers_connected, v_numbers_total
  FROM public.whatsapp_numbers
  WHERE (responsible_user_id = _user_id OR user_id = _user_id OR owner_user_id = _user_id);

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
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_user_operational_stats(uuid, timestamptz, timestamptz) TO authenticated;