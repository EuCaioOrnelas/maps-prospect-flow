-- Corrige "Esse horário já está ocupado" ao editar/concluir tarefas.
-- Eventos de dia todo e concluídos/cancelados não ocupam horário.
CREATE OR REPLACE FUNCTION public.calendar_events_check_overlap()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IN ('cancelled','completed') OR COALESCE(NEW.all_day,false) THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE'
     AND NEW.starts_at = OLD.starts_at AND NEW.ends_at = OLD.ends_at
     AND NEW.assigned_user_id IS NOT DISTINCT FROM OLD.assigned_user_id
     AND NEW.all_day IS NOT DISTINCT FROM OLD.all_day THEN
    RETURN NEW;
  END IF;
  IF NEW.assigned_user_id IS NULL THEN RETURN NEW; END IF;
  IF EXISTS (
    SELECT 1 FROM public.calendar_events e
    WHERE e.assigned_user_id = NEW.assigned_user_id
      AND e.id <> NEW.id
      AND e.status NOT IN ('cancelled','completed')
      AND COALESCE(e.all_day,false) = false
      AND tstzrange(e.starts_at, e.ends_at, '[)') && tstzrange(NEW.starts_at, NEW.ends_at, '[)')
  ) THEN
    RAISE EXCEPTION 'conflicting key value violates exclusion constraint "calendar_events_no_overlap"' USING ERRCODE = '23P01';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_calendar_events_no_overlap ON public.calendar_events;
CREATE TRIGGER trg_calendar_events_no_overlap
BEFORE INSERT OR UPDATE OF starts_at, ends_at, assigned_user_id, status, all_day
ON public.calendar_events FOR EACH ROW EXECUTE FUNCTION public.calendar_events_check_overlap();

REVOKE ALL ON FUNCTION public.calendar_events_check_overlap() FROM PUBLIC, anon, authenticated;

-- Se a regra antiga (constraint) ainda existir, troca pela regra acima
ALTER TABLE public.calendar_events DROP CONSTRAINT IF EXISTS calendar_events_no_overlap;
