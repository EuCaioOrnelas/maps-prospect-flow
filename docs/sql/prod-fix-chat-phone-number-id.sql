-- ============================================================
-- Corrige o erro "column chat_conversations.phone_number_id does not exist"
-- no banco de produção. Rode inteiro, de uma vez. Pode repetir sem problema.
-- ============================================================

-- 1) Coluna que liga cada conversa ao número de WhatsApp (sobrevive a reconexões)
ALTER TABLE public.chat_conversations
  ADD COLUMN IF NOT EXISTS phone_number_id text;

CREATE INDEX IF NOT EXISTS chat_conversations_phone_number_id_idx
  ON public.chat_conversations (phone_number_id);
CREATE INDEX IF NOT EXISTS chat_conversations_owner_phone_idx
  ON public.chat_conversations (owner_user_id, phone_number_id);

-- 2) Preenche as conversas que já existem a partir das conexões atuais
UPDATE public.chat_conversations c
SET phone_number_id = w.phone_number_id
FROM public.user_waba_connections w
WHERE c.waba_connection_id = w.id
  AND c.phone_number_id IS NULL;

-- 3) Ao reconectar um número, as conversas antigas voltam a ficar ligadas a ele
CREATE OR REPLACE FUNCTION public.relink_chat_conversations_on_waba_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.phone_number_id IS NULL THEN
    RETURN NEW;
  END IF;
  UPDATE public.chat_conversations
  SET waba_connection_id = NEW.id
  WHERE phone_number_id = NEW.phone_number_id
    AND (owner_user_id = COALESCE(NEW.owner_user_id, NEW.user_id) OR user_id = NEW.user_id)
    AND (waba_connection_id IS NULL OR waba_connection_id <> NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_relink_chat_conversations_on_waba_insert ON public.user_waba_connections;
CREATE TRIGGER trg_relink_chat_conversations_on_waba_insert
AFTER INSERT ON public.user_waba_connections
FOR EACH ROW EXECUTE FUNCTION public.relink_chat_conversations_on_waba_insert();

-- 4) Conferência
SELECT count(*) FILTER (WHERE phone_number_id IS NOT NULL) AS conversas_ligadas,
       count(*) AS total_conversas
FROM public.chat_conversations;
