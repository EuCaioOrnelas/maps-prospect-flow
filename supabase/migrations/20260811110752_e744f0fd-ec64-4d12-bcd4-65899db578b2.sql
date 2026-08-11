CREATE OR REPLACE FUNCTION public.enforce_sale_responsible_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
BEGIN
  IF NEW.responsible_user_id IS DISTINCT FROM OLD.responsible_user_id THEN
    -- chamadas de serviço (sem usuário autenticado) seguem liberadas
    IF v_uid IS NULL THEN
      RETURN NEW;
    END IF;

    SELECT COALESCE(p.account_role, 'owner') INTO v_role
    FROM public.profiles p
    WHERE p.id = v_uid;

    IF v_role IN ('owner', 'admin') THEN
      RETURN NEW;
    END IF;

    IF OLD.responsible_user_id IS NULL OR OLD.responsible_user_id = v_uid THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Somente o responsável atual, o dono da conta ou um admin podem alterar o responsável desta venda';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_sale_responsible_change ON public.lead_deals;
CREATE TRIGGER trg_enforce_sale_responsible_change
BEFORE UPDATE ON public.lead_deals
FOR EACH ROW
EXECUTE FUNCTION public.enforce_sale_responsible_change();