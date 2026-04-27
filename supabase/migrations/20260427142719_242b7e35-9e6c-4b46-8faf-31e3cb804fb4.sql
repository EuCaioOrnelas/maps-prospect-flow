-- Add activated_at to track WHEN a flow was last set to 'active'.
-- Used to filter eligible users by triggering events that happened AFTER activation,
-- so editing/saving an active flow does NOT re-open enrollment for everyone.
ALTER TABLE public.email_flows
  ADD COLUMN IF NOT EXISTS activated_at timestamptz;

-- Backfill existing rows so behavior is preserved (use updated_at as best-known proxy).
UPDATE public.email_flows
SET activated_at = COALESCE(activated_at, updated_at, created_at)
WHERE activated_at IS NULL;

-- Trigger: set activated_at when status transitions INTO 'active'.
CREATE OR REPLACE FUNCTION public.email_flows_set_activated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'active'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'active') THEN
    NEW.activated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_email_flows_set_activated_at ON public.email_flows;
CREATE TRIGGER trg_email_flows_set_activated_at
BEFORE INSERT OR UPDATE OF status ON public.email_flows
FOR EACH ROW
EXECUTE FUNCTION public.email_flows_set_activated_at();