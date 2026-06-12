
ALTER TABLE public.chat_conversations ADD COLUMN IF NOT EXISTS last_message_status text;

-- Backfill from latest message per conversation
UPDATE public.chat_conversations c
SET last_message_status = m.status
FROM (
  SELECT DISTINCT ON (conversation_id) conversation_id, status
  FROM public.chat_messages
  ORDER BY conversation_id, created_at DESC
) m
WHERE m.conversation_id = c.id;

-- Trigger to keep conversation.last_message_status in sync with the latest message
CREATE OR REPLACE FUNCTION public.sync_conv_last_message_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  latest_status text;
BEGIN
  SELECT status INTO latest_status
  FROM public.chat_messages
  WHERE conversation_id = NEW.conversation_id
  ORDER BY created_at DESC
  LIMIT 1;

  UPDATE public.chat_conversations
  SET last_message_status = latest_status
  WHERE id = NEW.conversation_id
    AND COALESCE(last_message_status, '') IS DISTINCT FROM COALESCE(latest_status, '');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_conv_last_message_status_ins ON public.chat_messages;
CREATE TRIGGER trg_sync_conv_last_message_status_ins
AFTER INSERT ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION public.sync_conv_last_message_status();

DROP TRIGGER IF EXISTS trg_sync_conv_last_message_status_upd ON public.chat_messages;
CREATE TRIGGER trg_sync_conv_last_message_status_upd
AFTER UPDATE OF status ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION public.sync_conv_last_message_status();
