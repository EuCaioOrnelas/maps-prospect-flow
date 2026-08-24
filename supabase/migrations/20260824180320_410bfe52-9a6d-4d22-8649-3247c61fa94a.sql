-- 1) AGENDA: substitui a exclusion constraint por checagem só quando o horário muda
ALTER TABLE public.calendar_events DROP CONSTRAINT IF EXISTS calendar_events_no_overlap;

CREATE OR REPLACE FUNCTION public.calendar_events_check_overlap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Cancelados nunca ocupam agenda
  IF NEW.status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  -- Em UPDATE, só valida se o horário/responsável realmente mudou
  IF TG_OP = 'UPDATE'
     AND NEW.starts_at = OLD.starts_at
     AND NEW.ends_at = OLD.ends_at
     AND NEW.assigned_user_id = OLD.assigned_user_id THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.calendar_events e
    WHERE e.assigned_user_id = NEW.assigned_user_id
      AND e.id <> NEW.id
      AND e.status <> 'cancelled'
      AND tstzrange(e.starts_at, e.ends_at, '[)') && tstzrange(NEW.starts_at, NEW.ends_at, '[)')
  ) THEN
    RAISE EXCEPTION 'conflicting key value violates exclusion constraint "calendar_events_no_overlap"'
      USING ERRCODE = '23P01';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_calendar_events_no_overlap ON public.calendar_events;
CREATE TRIGGER trg_calendar_events_no_overlap
BEFORE INSERT OR UPDATE OF starts_at, ends_at, assigned_user_id, status
ON public.calendar_events
FOR EACH ROW EXECUTE FUNCTION public.calendar_events_check_overlap();

-- 2) PARCEIROS: métricas dos links personalizados sempre atualizadas
CREATE OR REPLACE FUNCTION public.trg_recompute_referral_link_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP <> 'INSERT' AND OLD.referral_link_id IS NOT NULL THEN
    PERFORM public.recompute_partner_referral_link_stats(OLD.referral_link_id);
  END IF;
  IF TG_OP <> 'DELETE' AND NEW.referral_link_id IS NOT NULL THEN
    PERFORM public.recompute_partner_referral_link_stats(NEW.referral_link_id);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_partner_leads_link_stats ON public.partner_leads;
CREATE TRIGGER trg_partner_leads_link_stats
AFTER INSERT OR DELETE OR UPDATE OF is_paid, is_cancelled, referral_link_id
ON public.partner_leads
FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_referral_link_stats();

DROP TRIGGER IF EXISTS trg_partner_clicks_link_stats ON public.partner_clicks;
CREATE TRIGGER trg_partner_clicks_link_stats
AFTER INSERT OR DELETE ON public.partner_clicks
FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_referral_link_stats();

-- backfill das métricas existentes
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.partner_referral_links LOOP
    PERFORM public.recompute_partner_referral_link_stats(r.id);
  END LOOP;
END $$;