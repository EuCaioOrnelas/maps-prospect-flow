
CREATE OR REPLACE FUNCTION public.seed_revenue_score_rules(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.revenue_score_rules (user_id, rule_key, points, cooldown_minutes, max_per_day) VALUES
    (p_user_id, 'INBOUND_MESSAGE', 12, 2, 30),
    (p_user_id, 'INBOUND_STREAK_3', 25, NULL, 5),
    (p_user_id, 'INBOUND_AFTER_24H_SILENCE', 30, NULL, NULL),
    (p_user_id, 'INBOUND_AFTER_7D_SILENCE', 60, NULL, NULL),
    (p_user_id, 'OUTBOUND_REPLY_RECEIVED_WITHIN_1H', 18, NULL, NULL),
    (p_user_id, 'INTENT_PRICE', 80, NULL, NULL),
    (p_user_id, 'INTENT_BUY_NOW', 140, NULL, NULL),
    (p_user_id, 'INTENT_AVAILABILITY', 70, NULL, NULL),
    (p_user_id, 'INTENT_PAYMENT', 90, NULL, NULL),
    (p_user_id, 'INTENT_PROPOSAL', 100, NULL, NULL),
    (p_user_id, 'INTENT_URGENT', 60, NULL, NULL),
    (p_user_id, 'INTENT_OBJECTION', -10, NULL, NULL),
    (p_user_id, 'INTENT_NEGATIVE_MODERATE', -80, NULL, NULL),
    (p_user_id, 'INTENT_NEGATIVE_HARD', -300, NULL, NULL),
    (p_user_id, 'LINK_CLICK', 35, NULL, NULL),
    (p_user_id, 'FORM_SUBMIT', 90, NULL, NULL),
    (p_user_id, 'CALL_REQUEST', 110, NULL, NULL),
    (p_user_id, 'SLA_FIRST_RESPONSE_UNDER_5MIN', 40, NULL, NULL),
    (p_user_id, 'SLA_FIRST_RESPONSE_5_TO_30MIN', 15, NULL, NULL),
    (p_user_id, 'SLA_FIRST_RESPONSE_OVER_30MIN', -40, NULL, NULL),
    (p_user_id, 'UNREPLIED_INBOUND_OVER_2H', -60, NULL, NULL),
    (p_user_id, 'UNREPLIED_INBOUND_OVER_24H', -140, NULL, NULL),
    (p_user_id, 'CONVERSATION_ACTIVE_3D', 55, NULL, 3),
    (p_user_id, 'CONVERSATION_ACTIVE_5D', 95, NULL, 3),
    (p_user_id, 'BACK_AND_FORTH_5_TURNS', 70, NULL, 5)
  ON CONFLICT (user_id, rule_key) DO NOTHING;
END;
$$;
