CREATE OR REPLACE FUNCTION public.recalc_partner_level(p_partner_id uuid, p_reason text DEFAULT NULL)
RETURNS partner_level
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner partners%ROWTYPE;
  v_settings partner_settings%ROWTYPE;
  v_active INTEGER;
  v_new_level partner_level;
BEGIN
  SELECT * INTO v_partner FROM partners WHERE id = p_partner_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT * INTO v_settings FROM partner_settings WHERE id = 1;

  v_active := public.count_partner_active_clients(p_partner_id);

  IF v_active >= COALESCE(v_settings.gold_threshold_clients, 250) THEN
    v_new_level := 'gold';
  ELSIF v_active >= COALESCE(v_settings.silver_threshold_clients, 100) THEN
    v_new_level := 'silver';
  ELSE
    v_new_level := 'bronze';
  END IF;

  UPDATE partners
  SET level = v_new_level,
      total_paid_clients = v_active,
      updated_at = now()
  WHERE id = p_partner_id;

  IF v_new_level IS DISTINCT FROM v_partner.level THEN
    INSERT INTO partner_levels_history (partner_id, from_level, to_level, reason)
    VALUES (p_partner_id, v_partner.level, v_new_level, p_reason);
  END IF;

  RETURN v_new_level;
END;
$$;

UPDATE partners SET level = 'gold' WHERE level = 'platinum';