
-- Quando searches_used ultrapassar searches_limit, debita do bonus_searches
CREATE OR REPLACE FUNCTION public.consume_bonus_searches()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  overflow integer;
BEGIN
  IF NEW.searches_used IS DISTINCT FROM OLD.searches_used
     AND NEW.searches_used > NEW.searches_limit
     AND COALESCE(NEW.bonus_searches, 0) > 0 THEN
    overflow := NEW.searches_used - NEW.searches_limit;
    IF overflow >= NEW.bonus_searches THEN
      -- consume all bonus, leave overflow remainder in searches_used
      NEW.searches_used := NEW.searches_limit + (overflow - NEW.bonus_searches);
      NEW.bonus_searches := 0;
    ELSE
      NEW.bonus_searches := NEW.bonus_searches - overflow;
      NEW.searches_used := NEW.searches_limit;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_consume_bonus_searches ON public.profiles;
CREATE TRIGGER trg_consume_bonus_searches
  BEFORE UPDATE OF searches_used ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.consume_bonus_searches();
