CREATE OR REPLACE FUNCTION public.update_kb_success_rate()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.total_uses > 0 AND NEW.successful_uses > 0 THEN
    NEW.success_rate := ROUND((NEW.successful_uses::numeric / NEW.total_uses::numeric)::numeric, 3);
  ELSE
    NEW.success_rate := 0.5;
  END IF;
  RETURN NEW;
END;
$$;

UPDATE public.knowledge_base
SET success_rate = 0.5
WHERE total_uses > 0 AND successful_uses = 0;