-- Sync lead.contact_name -> chat_conversations.contact_name when CRM lead is updated
CREATE OR REPLACE FUNCTION public.sync_lead_name_to_chat()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_digits text;
  v_last8 text;
BEGIN
  IF NEW.contact_name IS NULL OR NEW.contact_name = '' THEN
    RETURN NEW;
  END IF;
  IF (TG_OP = 'UPDATE' AND OLD.contact_name IS NOT DISTINCT FROM NEW.contact_name) THEN
    RETURN NEW;
  END IF;
  v_digits := regexp_replace(coalesce(NEW.phone,''), '\D', '', 'g');
  IF length(v_digits) < 8 THEN RETURN NEW; END IF;
  v_last8 := right(v_digits, 8);
  UPDATE public.chat_conversations
     SET contact_name = NEW.contact_name
   WHERE owner_user_id = NEW.user_id
     AND right(regexp_replace(coalesce(contact_phone,''), '\D', '', 'g'), 8) = v_last8
     AND (contact_name IS NULL OR contact_name = '' OR contact_name <> NEW.contact_name);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_lead_name_to_chat ON public.leads;
CREATE TRIGGER trg_sync_lead_name_to_chat
AFTER INSERT OR UPDATE OF contact_name ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.sync_lead_name_to_chat();