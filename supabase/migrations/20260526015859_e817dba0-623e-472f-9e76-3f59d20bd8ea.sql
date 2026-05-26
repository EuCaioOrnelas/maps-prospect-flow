
-- Ensure partner_settings reflect the agreed thresholds and commissions
UPDATE public.partner_settings
SET bronze_commission_percent = 10.00,
    silver_commission_percent = 15.00,
    gold_commission_percent   = 20.00,
    platinum_commission_percent = 25.00,
    silver_threshold_clients  = 100,
    gold_threshold_clients    = 250,
    platinum_threshold_clients = 500,
    updated_at = now()
WHERE id = 1;

-- Function to recompute a partner's level based on active paid clients
CREATE OR REPLACE FUNCTION public.recompute_partner_level(p_partner_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s RECORD;
  active_count int;
  new_level text;
  cur_level text;
BEGIN
  SELECT * INTO s FROM public.partner_settings WHERE id = 1;
  IF s IS NULL THEN RETURN; END IF;

  SELECT COUNT(*)::int INTO active_count
  FROM public.partner_leads
  WHERE partner_id = p_partner_id AND is_paid = true AND is_cancelled = false;

  IF active_count >= COALESCE(s.platinum_threshold_clients, 500) THEN
    new_level := 'platinum';
  ELSIF active_count >= COALESCE(s.gold_threshold_clients, 250) THEN
    new_level := 'gold';
  ELSIF active_count >= COALESCE(s.silver_threshold_clients, 100) THEN
    new_level := 'silver';
  ELSE
    new_level := 'bronze';
  END IF;

  SELECT level INTO cur_level FROM public.partners WHERE id = p_partner_id;
  -- Only upgrade (never downgrade) automatically
  IF cur_level IS DISTINCT FROM new_level
     AND array_position(ARRAY['bronze','silver','gold','platinum'], new_level)
       > array_position(ARRAY['bronze','silver','gold','platinum'], cur_level) THEN
    UPDATE public.partners SET level = new_level, updated_at = now() WHERE id = p_partner_id;
  END IF;
END;
$$;

-- Trigger to auto-recompute when a partner_lead changes paid/cancelled state
CREATE OR REPLACE FUNCTION public.trg_recompute_partner_level()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.recompute_partner_level(COALESCE(NEW.partner_id, OLD.partner_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS partner_leads_recompute_level ON public.partner_leads;
CREATE TRIGGER partner_leads_recompute_level
AFTER INSERT OR UPDATE OF is_paid, is_cancelled OR DELETE
ON public.partner_leads
FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_partner_level();

-- Recompute existing partners once
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.partners LOOP
    PERFORM public.recompute_partner_level(r.id);
  END LOOP;
END $$;
