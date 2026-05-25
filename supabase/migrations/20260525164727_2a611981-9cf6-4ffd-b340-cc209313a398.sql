
-- Add public verification code to partners
ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS verification_code TEXT UNIQUE;

-- Generator: WZP-XXXXXXXX (8 alphanumeric, no ambiguous chars)
CREATE OR REPLACE FUNCTION public.generate_partner_verification_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  alphabet TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate TEXT;
  i INT;
  exists_already BOOLEAN;
BEGIN
  LOOP
    candidate := 'WZP-';
    FOR i IN 1..8 LOOP
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    SELECT EXISTS(SELECT 1 FROM public.partners WHERE verification_code = candidate) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  RETURN candidate;
END;
$$;

-- Auto-assign on insert if NULL
CREATE OR REPLACE FUNCTION public.assign_partner_verification_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.verification_code IS NULL OR NEW.verification_code = '' THEN
    NEW.verification_code := public.generate_partner_verification_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_partners_verification_code ON public.partners;
CREATE TRIGGER trg_partners_verification_code
BEFORE INSERT ON public.partners
FOR EACH ROW EXECUTE FUNCTION public.assign_partner_verification_code();

-- Backfill existing rows missing code
UPDATE public.partners
SET verification_code = public.generate_partner_verification_code()
WHERE verification_code IS NULL OR verification_code = '';

-- Public read RPC — safe fields only (no email/phone/commission/revenue)
CREATE OR REPLACE FUNCTION public.verify_partner_public(p_code TEXT)
RETURNS TABLE (
  full_name TEXT,
  company TEXT,
  level public.partner_level,
  status public.partner_status,
  partner_since TIMESTAMPTZ,
  country TEXT,
  verification_code TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.full_name,
    p.company,
    p.level,
    p.status,
    p.created_at AS partner_since,
    p.country,
    p.verification_code
  FROM public.partners p
  WHERE upper(trim(p.verification_code)) = upper(trim(p_code))
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.verify_partner_public(TEXT) TO anon, authenticated;
