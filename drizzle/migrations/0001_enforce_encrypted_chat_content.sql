CREATE OR REPLACE FUNCTION public.enforce_encrypted_chat_message_content()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR NEW.content IS DISTINCT FROM OLD.content)
     AND NEW.content IS NOT NULL
     AND NEW.content NOT LIKE 'enc:v1:%' THEN
    RAISE EXCEPTION 'chat message content must be encrypted';
  END IF;
  IF (TG_OP = 'INSERT' OR NEW.media_caption IS DISTINCT FROM OLD.media_caption)
     AND NEW.media_caption IS NOT NULL
     AND NEW.media_caption NOT LIKE 'enc:v1:%' THEN
    RAISE EXCEPTION 'chat media caption must be encrypted';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_encrypted_chat_preview()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR NEW.last_message_text IS DISTINCT FROM OLD.last_message_text)
     AND NEW.last_message_text IS NOT NULL
     AND NEW.last_message_text NOT LIKE 'enc:v1:%' THEN
    RAISE EXCEPTION 'chat conversation preview must be encrypted';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_encrypted_chat_message_content_trigger
BEFORE INSERT OR UPDATE OF content, media_caption ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION public.enforce_encrypted_chat_message_content();

CREATE TRIGGER enforce_encrypted_chat_preview_trigger
BEFORE INSERT OR UPDATE OF last_message_text ON public.chat_conversations
FOR EACH ROW EXECUTE FUNCTION public.enforce_encrypted_chat_preview();

REVOKE EXECUTE ON FUNCTION public.enforce_encrypted_chat_message_content() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enforce_encrypted_chat_preview() FROM PUBLIC;