CREATE OR REPLACE FUNCTION public.track_ai_kb_usage_from_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  kb_id UUID;
  kb_ids UUID[];
BEGIN
  IF NEW.role <> 'ai' OR NEW.metadata IS NULL OR NEW.metadata->'kb_ids' IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT ARRAY(
    SELECT DISTINCT (jsonb_array_elements_text(NEW.metadata->'kb_ids'))::uuid
  ) INTO kb_ids;

  IF kb_ids IS NULL OR array_length(kb_ids, 1) IS NULL THEN
    RETURN NEW;
  END IF;

  FOREACH kb_id IN ARRAY kb_ids LOOP
    UPDATE public.knowledge_base
    SET total_uses = total_uses + 1,
        last_used_at = now()
    WHERE id = kb_id;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_track_ai_kb_usage_from_message ON public.support_messages;
CREATE TRIGGER trg_track_ai_kb_usage_from_message
AFTER INSERT ON public.support_messages
FOR EACH ROW EXECUTE FUNCTION public.track_ai_kb_usage_from_message();

WITH used_kb AS (
  SELECT DISTINCT
    m.id AS message_id,
    (jsonb_array_elements_text(m.metadata->'kb_ids'))::uuid AS kb_id,
    m.created_at
  FROM public.support_messages m
  WHERE m.role = 'ai'
    AND m.metadata ? 'kb_ids'
    AND jsonb_array_length(m.metadata->'kb_ids') > 0
), kb_counts AS (
  SELECT kb_id, COUNT(*)::integer AS usage_count, MAX(created_at) AS last_used_at
  FROM used_kb
  GROUP BY kb_id
)
UPDATE public.knowledge_base kb
SET total_uses = GREATEST(kb.total_uses, kc.usage_count),
    last_used_at = COALESCE(kb.last_used_at, kc.last_used_at)
FROM kb_counts kc
WHERE kb.id = kc.kb_id;