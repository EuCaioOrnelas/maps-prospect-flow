CREATE OR REPLACE FUNCTION public.admin_create_partner_goal(
  p_admin_id uuid,
  p_partner_id uuid,
  p_title text,
  p_description text,
  p_goal_type public.partner_goal_type,
  p_target_value numeric,
  p_prize_amount_cents bigint,
  p_deadline_at timestamp with time zone,
  p_referral_link_id uuid DEFAULT NULL::uuid,
  p_internal_notes text DEFAULT NULL::text
)
RETURNS public.partner_goals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_goal public.partner_goals%ROWTYPE;
  v_partner_status public.partner_status;
  v_link_partner_id uuid;
BEGIN
  IF p_admin_id IS NULL OR NOT public.has_role(p_admin_id, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Sem permissão para criar metas de parceiros';
  END IF;

  SELECT status INTO v_partner_status
  FROM public.partners
  WHERE id = p_partner_id;

  IF v_partner_status IS NULL THEN
    RAISE EXCEPTION 'Parceiro não encontrado';
  END IF;

  IF v_partner_status = 'blocked'::public.partner_status THEN
    RAISE EXCEPTION 'Parceiro bloqueado não pode receber novas metas';
  END IF;

  IF length(trim(coalesce(p_title, ''))) = 0 THEN
    RAISE EXCEPTION 'Título da meta é obrigatório';
  END IF;

  IF p_goal_type IS NULL OR p_goal_type NOT IN (
    'revenue'::public.partner_goal_type,
    'paid_clients'::public.partner_goal_type,
    'leads'::public.partner_goal_type,
    'mrr'::public.partner_goal_type
  ) THEN
    RAISE EXCEPTION 'Tipo de meta inválido';
  END IF;

  IF p_target_value IS NULL OR p_target_value <= 0 THEN
    RAISE EXCEPTION 'Meta deve ser um número maior que zero';
  END IF;

  IF p_goal_type IN ('paid_clients'::public.partner_goal_type, 'leads'::public.partner_goal_type)
     AND p_target_value <> trunc(p_target_value) THEN
    RAISE EXCEPTION 'Metas de clientes ou leads precisam ser números inteiros';
  END IF;

  IF p_prize_amount_cents IS NULL OR p_prize_amount_cents < 0 THEN
    RAISE EXCEPTION 'Prêmio precisa ser maior ou igual a zero';
  END IF;

  IF p_deadline_at IS NULL OR p_deadline_at <= now() THEN
    RAISE EXCEPTION 'Prazo final precisa ser uma data futura';
  END IF;

  IF p_referral_link_id IS NOT NULL THEN
    SELECT partner_id INTO v_link_partner_id
    FROM public.partner_referral_links
    WHERE id = p_referral_link_id AND is_active = true;

    IF v_link_partner_id IS NULL OR v_link_partner_id <> p_partner_id THEN
      RAISE EXCEPTION 'Link de campanha inválido para este parceiro';
    END IF;

    IF p_goal_type = 'mrr'::public.partner_goal_type THEN
      RAISE EXCEPTION 'Metas de MRR não podem ser vinculadas a um único link';
    END IF;
  END IF;

  INSERT INTO public.partner_goals (
    partner_id,
    title,
    description,
    goal_type,
    target_value,
    prize_amount_cents,
    starts_at,
    deadline_at,
    status,
    prize_status,
    achieved_value,
    referral_link_id,
    created_by_admin_id,
    internal_notes
  ) VALUES (
    p_partner_id,
    trim(p_title),
    nullif(trim(coalesce(p_description, '')), ''),
    p_goal_type,
    p_target_value,
    p_prize_amount_cents,
    now(),
    p_deadline_at,
    'active'::public.partner_goal_status,
    'not_claimed'::public.partner_goal_prize_status,
    0,
    p_referral_link_id,
    p_admin_id,
    nullif(trim(coalesce(p_internal_notes, '')), '')
  )
  RETURNING * INTO v_goal;

  PERFORM public.update_partner_goal_progress(p_partner_id);

  SELECT * INTO v_goal
  FROM public.partner_goals
  WHERE id = v_goal.id;

  RETURN v_goal;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_partner_goal_progress(p_partner_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_goal public.partner_goals%ROWTYPE;
  v_value numeric := 0;
BEGIN
  IF p_partner_id IS NULL THEN
    RAISE EXCEPTION 'partner_id é obrigatório';
  END IF;

  FOR v_goal IN
    SELECT *
    FROM public.partner_goals
    WHERE partner_id = p_partner_id
      AND status = 'active'::public.partner_goal_status
    ORDER BY created_at ASC
  LOOP
    v_value := 0;

    IF v_goal.goal_type = 'revenue'::public.partner_goal_type THEN
      IF v_goal.referral_link_id IS NOT NULL THEN
        SELECT COALESCE(SUM(ps.amount_cents), 0) / 100.0 INTO v_value
        FROM public.partner_sales ps
        JOIN public.partner_leads pl ON pl.id = ps.partner_lead_id
        WHERE ps.partner_id = p_partner_id
          AND pl.referral_link_id = v_goal.referral_link_id
          AND ps.paid_at >= v_goal.starts_at
          AND ps.paid_at <= v_goal.deadline_at
          AND ps.refunded_at IS NULL
          AND ps.chargeback_at IS NULL;
      ELSE
        SELECT COALESCE(SUM(ps.amount_cents), 0) / 100.0 INTO v_value
        FROM public.partner_sales ps
        WHERE ps.partner_id = p_partner_id
          AND ps.paid_at >= v_goal.starts_at
          AND ps.paid_at <= v_goal.deadline_at
          AND ps.refunded_at IS NULL
          AND ps.chargeback_at IS NULL;
      END IF;

    ELSIF v_goal.goal_type = 'paid_clients'::public.partner_goal_type THEN
      IF v_goal.referral_link_id IS NOT NULL THEN
        SELECT COUNT(DISTINCT ps.customer_user_id)::numeric INTO v_value
        FROM public.partner_sales ps
        JOIN public.partner_leads pl ON pl.id = ps.partner_lead_id
        WHERE ps.partner_id = p_partner_id
          AND pl.referral_link_id = v_goal.referral_link_id
          AND ps.paid_at >= v_goal.starts_at
          AND ps.paid_at <= v_goal.deadline_at
          AND ps.refunded_at IS NULL
          AND ps.chargeback_at IS NULL;
      ELSE
        SELECT COUNT(DISTINCT ps.customer_user_id)::numeric INTO v_value
        FROM public.partner_sales ps
        WHERE ps.partner_id = p_partner_id
          AND ps.paid_at >= v_goal.starts_at
          AND ps.paid_at <= v_goal.deadline_at
          AND ps.refunded_at IS NULL
          AND ps.chargeback_at IS NULL;
      END IF;

    ELSIF v_goal.goal_type = 'leads'::public.partner_goal_type THEN
      IF v_goal.referral_link_id IS NOT NULL THEN
        SELECT COUNT(*)::numeric INTO v_value
        FROM public.partner_leads pl
        WHERE pl.partner_id = p_partner_id
          AND pl.referral_link_id = v_goal.referral_link_id
          AND pl.attributed_at >= v_goal.starts_at
          AND pl.attributed_at <= v_goal.deadline_at;
      ELSE
        SELECT COUNT(*)::numeric INTO v_value
        FROM public.partner_leads pl
        WHERE pl.partner_id = p_partner_id
          AND pl.attributed_at >= v_goal.starts_at
          AND pl.attributed_at <= v_goal.deadline_at;
      END IF;

    ELSIF v_goal.goal_type = 'mrr'::public.partner_goal_type THEN
      v_value := public.compute_partner_mrr(p_partner_id) / 100.0;
    END IF;

    UPDATE public.partner_goals
    SET achieved_value = COALESCE(v_value, 0),
        status = CASE
          WHEN COALESCE(v_value, 0) >= v_goal.target_value THEN 'completed'::public.partner_goal_status
          WHEN now() > v_goal.deadline_at THEN 'expired'::public.partner_goal_status
          ELSE 'active'::public.partner_goal_status
        END,
        completed_at = CASE
          WHEN COALESCE(v_value, 0) >= v_goal.target_value AND completed_at IS NULL THEN now()
          ELSE completed_at
        END,
        updated_at = now()
    WHERE id = v_goal.id;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_partner_goal(uuid, uuid, text, text, public.partner_goal_type, numeric, bigint, timestamptz, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_create_partner_goal(uuid, uuid, text, text, public.partner_goal_type, numeric, bigint, timestamptz, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_partner_goal(uuid, uuid, text, text, public.partner_goal_type, numeric, bigint, timestamptz, uuid, text) TO service_role;

REVOKE ALL ON FUNCTION public.update_partner_goal_progress(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_partner_goal_progress(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_partner_goal_progress(uuid) TO service_role;