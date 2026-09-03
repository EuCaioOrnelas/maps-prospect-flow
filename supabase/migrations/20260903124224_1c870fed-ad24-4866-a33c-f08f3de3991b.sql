-- 1) New enum with official names
CREATE TYPE public.partner_level_new AS ENUM ('select','signature','prime');

ALTER TABLE public.partners ALTER COLUMN level DROP DEFAULT;

ALTER TABLE public.partners
  ALTER COLUMN level TYPE public.partner_level_new
  USING (CASE level::text
    WHEN 'bronze' THEN 'select'
    WHEN 'silver' THEN 'signature'
    WHEN 'gold' THEN 'prime'
    WHEN 'platinum' THEN 'prime'
    ELSE 'select' END)::public.partner_level_new;

ALTER TABLE public.partner_levels_history
  ALTER COLUMN from_level TYPE public.partner_level_new
  USING (CASE from_level::text
    WHEN 'bronze' THEN 'select'
    WHEN 'silver' THEN 'signature'
    WHEN 'gold' THEN 'prime'
    WHEN 'platinum' THEN 'prime'
    ELSE NULL END)::public.partner_level_new;

ALTER TABLE public.partner_levels_history
  ALTER COLUMN to_level TYPE public.partner_level_new
  USING (CASE to_level::text
    WHEN 'bronze' THEN 'select'
    WHEN 'silver' THEN 'signature'
    WHEN 'gold' THEN 'prime'
    WHEN 'platinum' THEN 'prime'
    ELSE NULL END)::public.partner_level_new;

ALTER TABLE public.partner_commissions
  ALTER COLUMN partner_level TYPE public.partner_level_new
  USING (CASE partner_level::text
    WHEN 'bronze' THEN 'select'
    WHEN 'silver' THEN 'signature'
    WHEN 'gold' THEN 'prime'
    WHEN 'platinum' THEN 'prime'
    ELSE NULL END)::public.partner_level_new;

DROP FUNCTION IF EXISTS public.verify_partner_public(text);
DROP FUNCTION IF EXISTS public.recalc_partner_level(uuid, text);
DROP TYPE public.partner_level;
ALTER TYPE public.partner_level_new RENAME TO partner_level;

ALTER TABLE public.partners
  ALTER COLUMN level SET DEFAULT 'select'::public.partner_level;

-- 2) Settings columns
ALTER TABLE public.partner_settings RENAME COLUMN bronze_commission_percent TO select_commission_percent;
ALTER TABLE public.partner_settings RENAME COLUMN silver_commission_percent TO signature_commission_percent;
ALTER TABLE public.partner_settings RENAME COLUMN gold_commission_percent TO prime_commission_percent;
ALTER TABLE public.partner_settings RENAME COLUMN silver_threshold_clients TO signature_threshold_clients;
ALTER TABLE public.partner_settings RENAME COLUMN gold_threshold_clients TO prime_threshold_clients;
ALTER TABLE public.partner_settings DROP COLUMN IF EXISTS platinum_commission_percent;
ALTER TABLE public.partner_settings DROP COLUMN IF EXISTS platinum_threshold_clients;

ALTER TABLE public.partner_settings ALTER COLUMN select_commission_percent SET DEFAULT 10.00;
ALTER TABLE public.partner_settings ALTER COLUMN signature_commission_percent SET DEFAULT 12.00;
ALTER TABLE public.partner_settings ALTER COLUMN prime_commission_percent SET DEFAULT 15.00;

-- 3) Functions
CREATE OR REPLACE FUNCTION public.get_partner_commission_percent(p_partner_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_partner partners%ROWTYPE;
  v_settings partner_settings%ROWTYPE;
BEGIN
  SELECT * INTO v_partner FROM partners WHERE id = p_partner_id;
  IF NOT FOUND THEN RETURN 0; END IF;
  IF v_partner.custom_commission_percent IS NOT NULL THEN
    RETURN v_partner.custom_commission_percent;
  END IF;
  SELECT * INTO v_settings FROM partner_settings WHERE id = 1;
  RETURN CASE v_partner.level
    WHEN 'select' THEN v_settings.select_commission_percent
    WHEN 'signature' THEN v_settings.signature_commission_percent
    WHEN 'prime' THEN v_settings.prime_commission_percent
  END;
END;
$function$;

CREATE OR REPLACE FUNCTION public.recalc_partner_level(p_partner_id uuid, p_reason text DEFAULT NULL::text)
RETURNS partner_level
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_partner partners%ROWTYPE;
  v_settings partner_settings%ROWTYPE;
  v_active INTEGER;
  v_new_level partner_level;
BEGIN
  SELECT * INTO v_partner FROM partners WHERE id = p_partner_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT * INTO v_settings FROM partner_settings WHERE id = 1;

  v_active := public.count_partner_active_clients(p_partner_id);

  IF v_active >= COALESCE(v_settings.prime_threshold_clients, 250) THEN
    v_new_level := 'prime';
  ELSIF v_active >= COALESCE(v_settings.signature_threshold_clients, 100) THEN
    v_new_level := 'signature';
  ELSE
    v_new_level := 'select';
  END IF;

  UPDATE partners
  SET level = v_new_level,
      total_paid_clients = v_active,
      updated_at = now()
  WHERE id = p_partner_id;

  IF v_new_level IS DISTINCT FROM v_partner.level THEN
    INSERT INTO partner_levels_history (partner_id, from_level, to_level, reason)
    VALUES (p_partner_id, v_partner.level, v_new_level, p_reason);
  END IF;

  RETURN v_new_level;
END;
$function$;

CREATE OR REPLACE FUNCTION public.recompute_partner_level(p_partner_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  s RECORD;
  active_count int;
  new_level text;
  cur_level text;
BEGIN
  SELECT * INTO s FROM public.partner_settings WHERE id = 1;
  IF s IS NULL THEN RETURN; END IF;

  SELECT COUNT(*)::int INTO active_count
  FROM public.partner_leads
  WHERE partner_id = p_partner_id AND is_paid = true AND is_cancelled = false;

  IF active_count >= COALESCE(s.prime_threshold_clients, 250) THEN
    new_level := 'prime';
  ELSIF active_count >= COALESCE(s.signature_threshold_clients, 100) THEN
    new_level := 'signature';
  ELSE
    new_level := 'select';
  END IF;

  SELECT level INTO cur_level FROM public.partners WHERE id = p_partner_id;
  IF cur_level IS DISTINCT FROM new_level
     AND array_position(ARRAY['select','signature','prime'], new_level)
       > array_position(ARRAY['select','signature','prime'], cur_level) THEN
    UPDATE public.partners SET level = new_level::partner_level, updated_at = now() WHERE id = p_partner_id;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.verify_partner_public(p_code text)
RETURNS TABLE(full_name text, company text, level partner_level, status partner_status, partner_since timestamp with time zone, country text, verification_code text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;