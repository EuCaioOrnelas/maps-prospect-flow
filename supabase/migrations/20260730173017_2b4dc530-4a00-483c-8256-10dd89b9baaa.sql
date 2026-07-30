CREATE OR REPLACE FUNCTION public.enforce_suggestion_daily_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count integer;
BEGIN
  SELECT count(*) INTO recent_count
  FROM public.suggestions s
  WHERE s.user_id = NEW.user_id
    AND s.created_at > (now() - interval '24 hours');

  IF recent_count > 0 THEN
    RAISE EXCEPTION 'SUGGESTION_RATE_LIMIT: limite de 1 sugestao por dia atingido'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_suggestions_daily_limit ON public.suggestions;

CREATE TRIGGER trg_suggestions_daily_limit
BEFORE INSERT ON public.suggestions
FOR EACH ROW
EXECUTE FUNCTION public.enforce_suggestion_daily_limit();

CREATE INDEX IF NOT EXISTS idx_suggestions_user_created
  ON public.suggestions (user_id, created_at DESC);