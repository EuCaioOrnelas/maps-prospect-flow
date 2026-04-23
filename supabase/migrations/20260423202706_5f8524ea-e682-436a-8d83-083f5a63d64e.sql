
-- Helper function to compute partner balance (pending / available / requested / paid)
CREATE OR REPLACE FUNCTION public.compute_partner_balance(p_partner_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pending bigint := 0;
  v_available bigint := 0;
  v_requested bigint := 0;
  v_paid bigint := 0;
BEGIN
  SELECT COALESCE(SUM(commission_amount_cents), 0) INTO v_pending
  FROM partner_commissions
  WHERE partner_id = p_partner_id AND status = 'pending';

  SELECT COALESCE(SUM(commission_amount_cents), 0) INTO v_available
  FROM partner_commissions
  WHERE partner_id = p_partner_id AND status = 'available';

  SELECT COALESCE(SUM(amount_cents), 0) INTO v_requested
  FROM partner_withdrawals
  WHERE partner_id = p_partner_id AND status IN ('pending', 'approved');

  SELECT COALESCE(SUM(amount_cents), 0) INTO v_paid
  FROM partner_payouts
  WHERE partner_id = p_partner_id;

  RETURN jsonb_build_object(
    'pending_cents', v_pending,
    'available_cents', GREATEST(0, v_available - v_requested),
    'requested_cents', v_requested,
    'paid_cents', v_paid
  );
END;
$$;

-- Allow authenticated users to call it (RLS on underlying tables already restricts data)
GRANT EXECUTE ON FUNCTION public.compute_partner_balance(uuid) TO authenticated;
