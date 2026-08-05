CREATE OR REPLACE FUNCTION public.prevent_duplicate_active_sdr_numbers()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'active' AND EXISTS (
    SELECT 1
    FROM public.sdr_agents existing
    WHERE existing.owner_user_id = NEW.owner_user_id
      AND existing.status = 'active'
      AND existing.id <> NEW.id
      AND existing.whatsapp_number_ids && NEW.whatsapp_number_ids
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23505',
      MESSAGE = 'Um número de WhatsApp não pode estar vinculado a dois SDRs ativos da mesma conta.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_duplicate_active_sdr_numbers_trigger ON public.sdr_agents;
CREATE TRIGGER prevent_duplicate_active_sdr_numbers_trigger
BEFORE INSERT OR UPDATE OF owner_user_id, status, whatsapp_number_ids
ON public.sdr_agents
FOR EACH ROW
EXECUTE FUNCTION public.prevent_duplicate_active_sdr_numbers();