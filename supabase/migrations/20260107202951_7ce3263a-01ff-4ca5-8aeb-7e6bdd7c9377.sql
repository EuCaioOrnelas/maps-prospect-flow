-- Add pinning support to conversations
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS conversations_user_pinned_at_last_message_idx
ON public.conversations (user_id, pinned_at DESC, last_message_at DESC);

-- Add interactive payload storage for bot buttons/lists
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS interactive JSONB NULL;

-- Enforce max 5 pinned conversations per user
CREATE OR REPLACE FUNCTION public.enforce_max_pinned_conversations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pinned_count integer;
BEGIN
  -- Only validate when pinning (transition from null -> not null)
  IF (NEW.pinned_at IS NOT NULL) AND (TG_OP = 'INSERT' OR OLD.pinned_at IS NULL) THEN
    SELECT COUNT(*) INTO pinned_count
    FROM public.conversations
    WHERE user_id = NEW.user_id
      AND pinned_at IS NOT NULL
      AND id <> NEW.id;

    IF pinned_count >= 5 THEN
      RAISE EXCEPTION 'Limite de 5 conversas fixadas atingido';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_max_pinned_conversations ON public.conversations;
CREATE TRIGGER trg_enforce_max_pinned_conversations
BEFORE INSERT OR UPDATE OF pinned_at
ON public.conversations
FOR EACH ROW
EXECUTE FUNCTION public.enforce_max_pinned_conversations();
