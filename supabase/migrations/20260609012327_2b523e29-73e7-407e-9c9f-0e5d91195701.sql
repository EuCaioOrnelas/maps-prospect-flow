
ALTER TABLE public.lead_deals ADD COLUMN IF NOT EXISTS responsible_user_id uuid;

CREATE INDEX IF NOT EXISTS idx_lead_deals_responsible_user_id ON public.lead_deals(responsible_user_id);

-- Backfill from lead's current responsible (or creator)
UPDATE public.lead_deals d
SET responsible_user_id = COALESCE(l.responsible_user_id, d.user_id)
FROM public.leads l
WHERE d.lead_id = l.id AND d.responsible_user_id IS NULL;

-- Trigger: default responsible_user_id on insert from lead's current responsible
CREATE OR REPLACE FUNCTION public.set_lead_deal_responsible_default()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.responsible_user_id IS NULL THEN
    SELECT COALESCE(l.responsible_user_id, NEW.user_id)
      INTO NEW.responsible_user_id
    FROM public.leads l
    WHERE l.id = NEW.lead_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_lead_deal_responsible_default ON public.lead_deals;
CREATE TRIGGER trg_set_lead_deal_responsible_default
BEFORE INSERT ON public.lead_deals
FOR EACH ROW EXECUTE FUNCTION public.set_lead_deal_responsible_default();
