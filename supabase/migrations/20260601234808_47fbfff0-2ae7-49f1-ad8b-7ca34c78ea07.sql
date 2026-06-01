-- Phase 3: Opportunities multi-user support
-- 1) Add tracking columns to leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS created_by_user_id uuid,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_leads_archived_at ON public.leads(archived_at);
CREATE INDEX IF NOT EXISTS idx_leads_created_by_user_id ON public.leads(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_leads_responsible_user_id ON public.leads(responsible_user_id);

-- 2) Backfill created_by from user_id when null
UPDATE public.leads
   SET created_by_user_id = user_id
 WHERE created_by_user_id IS NULL
   AND user_id IS NOT NULL;

-- 3) Trigger to auto-set creator and default responsible on new leads
CREATE OR REPLACE FUNCTION public.set_lead_creator_and_responsible()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by_user_id IS NULL THEN
    NEW.created_by_user_id := COALESCE(NEW.user_id, auth.uid());
  END IF;

  -- For opportunities/prospecting captures, default the responsible to the creator
  IF NEW.responsible_user_id IS NULL
     AND COALESCE(NEW.origin, '') IN ('oportunidades', 'prospeccao') THEN
    NEW.responsible_user_id := COALESCE(NEW.created_by_user_id, NEW.user_id, auth.uid());
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_lead_creator_and_responsible ON public.leads;
CREATE TRIGGER trg_set_lead_creator_and_responsible
BEFORE INSERT ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.set_lead_creator_and_responsible();