
-- 1. Links: validade e nome interno
ALTER TABLE public.partner_referral_links
  ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS internal_name text;

CREATE INDEX IF NOT EXISTS idx_partner_referral_links_expires
  ON public.partner_referral_links(expires_at)
  WHERE expires_at IS NOT NULL;

-- 2. Metas: vínculo opcional a um link específico
ALTER TABLE public.partner_goals
  ADD COLUMN IF NOT EXISTS referral_link_id uuid
    REFERENCES public.partner_referral_links(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_partner_goals_link
  ON public.partner_goals(referral_link_id)
  WHERE referral_link_id IS NOT NULL;

-- 3. Atualizar função de progresso para respeitar referral_link_id
CREATE OR REPLACE FUNCTION public.update_partner_goal_progress(p_partner_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_goal RECORD;
  v_value NUMERIC := 0;
BEGIN
  FOR v_goal IN
    SELECT * FROM partner_goals
    WHERE partner_id = p_partner_id
      AND status = 'active'
  LOOP
    v_value := 0;

    IF v_goal.goal_type = 'revenue' THEN
      IF v_goal.referral_link_id IS NOT NULL THEN
        SELECT COALESCE(SUM(ps.amount_cents), 0) / 100.0 INTO v_value
        FROM partner_sales ps
        JOIN partner_leads pl ON pl.id = ps.partner_lead_id
        WHERE ps.partner_id = p_partner_id
          AND pl.referral_link_id = v_goal.referral_link_id
          AND ps.paid_at >= v_goal.starts_at
          AND ps.paid_at <= v_goal.deadline_at
          AND ps.refunded_at IS NULL
          AND ps.chargeback_at IS NULL;
      ELSE
        SELECT COALESCE(SUM(amount_cents), 0) / 100.0 INTO v_value
        FROM partner_sales
        WHERE partner_id = p_partner_id
          AND paid_at >= v_goal.starts_at
          AND paid_at <= v_goal.deadline_at
          AND refunded_at IS NULL
          AND chargeback_at IS NULL;
      END IF;

    ELSIF v_goal.goal_type = 'paid_clients' THEN
      IF v_goal.referral_link_id IS NOT NULL THEN
        SELECT COUNT(DISTINCT ps.customer_user_id) INTO v_value
        FROM partner_sales ps
        JOIN partner_leads pl ON pl.id = ps.partner_lead_id
        WHERE ps.partner_id = p_partner_id
          AND pl.referral_link_id = v_goal.referral_link_id
          AND ps.paid_at >= v_goal.starts_at
          AND ps.paid_at <= v_goal.deadline_at
          AND ps.refunded_at IS NULL
          AND ps.chargeback_at IS NULL;
      ELSE
        SELECT COUNT(DISTINCT customer_user_id) INTO v_value
        FROM partner_sales
        WHERE partner_id = p_partner_id
          AND paid_at >= v_goal.starts_at
          AND paid_at <= v_goal.deadline_at
          AND refunded_at IS NULL
          AND chargeback_at IS NULL;
      END IF;

    ELSIF v_goal.goal_type = 'leads' THEN
      IF v_goal.referral_link_id IS NOT NULL THEN
        SELECT COUNT(*) INTO v_value
        FROM partner_leads
        WHERE partner_id = p_partner_id
          AND referral_link_id = v_goal.referral_link_id
          AND attributed_at >= v_goal.starts_at
          AND attributed_at <= v_goal.deadline_at;
      ELSE
        SELECT COUNT(*) INTO v_value
        FROM partner_leads
        WHERE partner_id = p_partner_id
          AND attributed_at >= v_goal.starts_at
          AND attributed_at <= v_goal.deadline_at;
      END IF;

    ELSIF v_goal.goal_type = 'mrr' THEN
      v_value := compute_partner_mrr(p_partner_id) / 100.0;
    END IF;

    UPDATE partner_goals
    SET achieved_value = v_value,
        status = CASE
          WHEN v_value >= v_goal.target_value THEN 'completed'::partner_goal_status
          WHEN now() > v_goal.deadline_at THEN 'expired'::partner_goal_status
          ELSE 'active'::partner_goal_status
        END,
        completed_at = CASE
          WHEN v_value >= v_goal.target_value AND completed_at IS NULL THEN now()
          ELSE completed_at
        END,
        updated_at = now()
    WHERE id = v_goal.id;
  END LOOP;
END;
$function$;

-- 4. Materiais: organização profissional
ALTER TABLE public.partner_materials
  ADD COLUMN IF NOT EXISTS subcategory text,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS meta jsonb DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_partner_materials_tags
  ON public.partner_materials USING GIN(tags);
