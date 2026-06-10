ALTER TABLE public.partner_goals
  ADD COLUMN IF NOT EXISTS created_by_admin_id uuid,
  ADD COLUMN IF NOT EXISTS internal_notes text,
  ADD COLUMN IF NOT EXISTS referral_link_id uuid REFERENCES public.partner_referral_links(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_partner_goals_link
  ON public.partner_goals(referral_link_id)
  WHERE referral_link_id IS NOT NULL;

GRANT SELECT ON public.partner_goals TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.partner_goals TO authenticated;
GRANT ALL ON public.partner_goals TO service_role;

CREATE OR REPLACE FUNCTION public.admin_create_partner_goal(
  p_admin_id uuid,
  p_partner_id uuid,
  p_title text,
  p_description text,
  p_goal_type public.partner_goal_type,
  p_target_value numeric,
  p_prize_amount_cents bigint,
  p_deadline_at timestamptz,
  p_referral_link_id uuid DEFAULT NULL,
  p_internal_notes text DEFAULT NULL
)
RETURNS public.partner_goals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_goal public.partner_goals%ROWTYPE;
  v_link_partner_id uuid;
BEGIN
  IF p_admin_id IS NULL OR NOT public.has_role(p_admin_id, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Sem permissão para criar metas de parceiros';
  END IF;

  IF p_partner_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.partners WHERE id = p_partner_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Parceiro ativo não encontrado';
  END IF;

  IF length(trim(coalesce(p_title, ''))) = 0 THEN
    RAISE EXCEPTION 'Título da meta é obrigatório';
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
    deadline_at,
    internal_notes,
    referral_link_id,
    created_by_admin_id
  ) VALUES (
    p_partner_id,
    trim(p_title),
    nullif(p_description, ''),
    p_goal_type,
    p_target_value,
    p_prize_amount_cents,
    p_deadline_at,
    nullif(p_internal_notes, ''),
    p_referral_link_id,
    p_admin_id
  )
  RETURNING * INTO v_goal;

  PERFORM public.update_partner_goal_progress(p_partner_id);

  SELECT * INTO v_goal FROM public.partner_goals WHERE id = v_goal.id;
  RETURN v_goal;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_partner_goal(uuid, uuid, text, text, public.partner_goal_type, numeric, bigint, timestamptz, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_create_partner_goal(uuid, uuid, text, text, public.partner_goal_type, numeric, bigint, timestamptz, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_partner_goal(uuid, uuid, text, text, public.partner_goal_type, numeric, bigint, timestamptz, uuid, text) TO service_role;

DO $$ BEGIN PERFORM pg_notify('pgrst', 'reload schema'); END $$;