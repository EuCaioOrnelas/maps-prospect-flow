
-- KB performance tracking
ALTER TABLE public.knowledge_base
  ADD COLUMN IF NOT EXISTS total_uses INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS successful_uses INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS success_rate NUMERIC(4,3) NOT NULL DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;

-- ai_logs feedback
ALTER TABLE public.ai_logs
  ADD COLUMN IF NOT EXISTS was_helpful BOOLEAN;

-- per-ai-message feedback (for autolearning + KB success update)
ALTER TABLE public.support_messages
  ADD COLUMN IF NOT EXISTS was_helpful BOOLEAN;

-- Incidents (clusters of similar tickets)
CREATE TABLE IF NOT EXISTS public.support_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  status TEXT NOT NULL DEFAULT 'detected', -- detected | investigating | resolved | dismissed
  ticket_count INTEGER NOT NULL DEFAULT 0,
  affected_users INTEGER NOT NULL DEFAULT 0,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sample_ticket_ids UUID[] DEFAULT ARRAY[]::UUID[],
  signature TEXT, -- normalized hash/keywords used to dedupe
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_support_incidents_signature ON public.support_incidents(signature) WHERE signature IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_support_incidents_status_last_seen ON public.support_incidents(status, last_seen_at DESC);

ALTER TABLE public.support_incidents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage incidents" ON public.support_incidents;
CREATE POLICY "Admins can manage incidents" ON public.support_incidents
  FOR ALL TO authenticated
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

DROP TRIGGER IF EXISTS trg_support_incidents_updated_at ON public.support_incidents;
CREATE TRIGGER trg_support_incidents_updated_at
BEFORE UPDATE ON public.support_incidents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for dashboard queries
CREATE INDEX IF NOT EXISTS idx_support_tickets_phase_created ON public.support_tickets(phase, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_category_created ON public.support_tickets(category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets(user_id);

-- Function: update KB success_rate from successful_uses/total_uses
CREATE OR REPLACE FUNCTION public.update_kb_success_rate()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.total_uses > 0 THEN
    NEW.success_rate := ROUND((NEW.successful_uses::numeric / NEW.total_uses::numeric)::numeric, 3);
  ELSE
    NEW.success_rate := 0.5;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_kb_success_rate ON public.knowledge_base;
CREATE TRIGGER trg_kb_success_rate
BEFORE UPDATE OF total_uses, successful_uses ON public.knowledge_base
FOR EACH ROW EXECUTE FUNCTION public.update_kb_success_rate();

-- Function called when support_messages.was_helpful is set: update KB rows referenced via metadata.kb_ids
CREATE OR REPLACE FUNCTION public.apply_message_feedback_to_kb()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  kb_id UUID;
  kb_ids UUID[];
BEGIN
  IF NEW.was_helpful IS NULL OR (OLD IS NOT NULL AND OLD.was_helpful IS NOT DISTINCT FROM NEW.was_helpful) THEN
    RETURN NEW;
  END IF;
  IF NEW.role <> 'ai' OR NEW.metadata IS NULL OR NEW.metadata->'kb_ids' IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT ARRAY(SELECT (jsonb_array_elements_text(NEW.metadata->'kb_ids'))::uuid) INTO kb_ids;
  FOREACH kb_id IN ARRAY kb_ids LOOP
    UPDATE public.knowledge_base
    SET total_uses = total_uses + 1,
        successful_uses = successful_uses + (CASE WHEN NEW.was_helpful THEN 1 ELSE 0 END),
        last_used_at = now()
    WHERE id = kb_id;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_message_feedback_kb ON public.support_messages;
CREATE TRIGGER trg_message_feedback_kb
AFTER UPDATE OF was_helpful ON public.support_messages
FOR EACH ROW EXECUTE FUNCTION public.apply_message_feedback_to_kb();
