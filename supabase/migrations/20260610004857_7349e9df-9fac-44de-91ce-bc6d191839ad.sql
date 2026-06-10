-- Allow partners to refresh progress for their own goals (and auto-expire overdue ones)
CREATE OR REPLACE FUNCTION public.refresh_my_partner_goals()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner_id uuid;
BEGIN
  SELECT id INTO v_partner_id
  FROM public.partners
  WHERE user_id = auth.uid()
  LIMIT 1;
  IF v_partner_id IS NULL THEN
    RETURN;
  END IF;
  PERFORM public.update_partner_goal_progress(v_partner_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_my_partner_goals() TO authenticated;