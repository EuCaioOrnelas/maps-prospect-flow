
CREATE OR REPLACE FUNCTION public.cancel_partner_commissions_for_customer(
  p_customer_user_id uuid,
  p_reason text DEFAULT 'subscription_cancelled',
  p_only_recurring boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int := 0;
BEGIN
  WITH targets AS (
    SELECT pc.id
    FROM partner_commissions pc
    JOIN partner_sales ps ON ps.id = pc.partner_sale_id
    WHERE ps.customer_user_id = p_customer_user_id
      AND pc.status IN ('pending','available')
      AND (NOT p_only_recurring OR ps.is_recurring = true)
  ),
  upd AS (
    UPDATE partner_commissions
    SET status = 'cancelled',
        cancelled_at = now(),
        cancellation_reason = p_reason,
        updated_at = now()
    WHERE id IN (SELECT id FROM targets)
    RETURNING id, partner_id, commission_amount_cents
  )
  SELECT count(*) INTO v_count FROM upd;

  -- Atualiza lifetime_commission_cents dos parceiros impactados
  UPDATE partners p
  SET lifetime_commission_cents = GREATEST(0, COALESCE((
    SELECT SUM(commission_amount_cents) FROM partner_commissions
    WHERE partner_id = p.id AND status IN ('pending','available','paid')
  ),0))
  WHERE id IN (
    SELECT DISTINCT pc.partner_id FROM partner_commissions pc
    JOIN partner_sales ps ON ps.id = pc.partner_sale_id
    WHERE ps.customer_user_id = p_customer_user_id
  );

  RETURN jsonb_build_object('cancelled', v_count, 'reason', p_reason);
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_partner_sale_refunded(
  p_external_reference text,
  p_kind text DEFAULT 'refund'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sale partner_sales%ROWTYPE;
  v_cancelled int := 0;
BEGIN
  SELECT * INTO v_sale FROM partner_sales WHERE external_reference = p_external_reference;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'sale_not_found');
  END IF;

  IF p_kind = 'chargeback' THEN
    UPDATE partner_sales SET chargeback_at = now() WHERE id = v_sale.id;
  ELSE
    UPDATE partner_sales SET refunded_at = now() WHERE id = v_sale.id;
  END IF;

  UPDATE partner_commissions
  SET status = 'cancelled',
      cancelled_at = now(),
      cancellation_reason = p_kind,
      updated_at = now()
  WHERE partner_sale_id = v_sale.id
    AND status IN ('pending','available');
  GET DIAGNOSTICS v_cancelled = ROW_COUNT;

  RETURN jsonb_build_object('ok', true, 'cancelled', v_cancelled, 'sale_id', v_sale.id);
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_partner_commissions_for_customer(uuid,text,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_partner_commissions_for_customer(uuid,text,boolean) TO service_role;

REVOKE ALL ON FUNCTION public.mark_partner_sale_refunded(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_partner_sale_refunded(text,text) TO service_role;
