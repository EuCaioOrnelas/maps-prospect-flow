
-- 1) Backfill das regras para todos os usuários existentes
DO $$
DECLARE
  u RECORD;
BEGIN
  FOR u IN SELECT id FROM public.profiles LOOP
    PERFORM public.seed_revenue_score_rules(u.id);
  END LOOP;
END $$;

-- 2) Trigger para auto-seedar para novos usuários (idempotente)
CREATE OR REPLACE FUNCTION public.auto_seed_revenue_rules_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_revenue_score_rules(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_seed_revenue_rules ON public.profiles;
CREATE TRIGGER trg_auto_seed_revenue_rules
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.auto_seed_revenue_rules_on_signup();
