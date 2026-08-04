-- 1) Profiles: whitelist-based self-update protection (replaces blacklist)
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_service_role boolean;
  is_superuser boolean;
  allowed text[] := ARRAY[
    'name','phone','avatar_url','address','address_number','address_complement',
    'neighborhood','city','state','postal_code','cpf','chat_onboarding_seen',
    'must_change_password','updated_at'
  ];
  old_locked jsonb;
  new_locked jsonb;
  k text;
BEGIN
  is_service_role := (
    auth.uid() IS NULL AND
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );
  is_superuser := (
    session_user = current_user AND
    current_setting('role', true) IN ('rds_superuser', 'supabase_admin', 'postgres')
  );

  IF is_service_role OR is_superuser THEN
    RETURN NEW;
  END IF;

  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  old_locked := to_jsonb(OLD);
  new_locked := to_jsonb(NEW);

  FOREACH k IN ARRAY allowed LOOP
    old_locked := old_locked - k;
    new_locked := new_locked - k;
  END LOOP;

  IF old_locked IS DISTINCT FROM new_locked THEN
    RAISE EXCEPTION 'Alteracao nao permitida: apenas dados pessoais podem ser editados pelo usuario';
  END IF;

  RETURN NEW;
END;
$$;

-- 2) Anti-abuse throttles on publicly writable tables
CREATE OR REPLACE FUNCTION public.throttle_support_tickets()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent integer;
BEGIN
  IF auth.uid() IS NULL AND current_setting('request.jwt.claims', true)::json->>'role' = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF NEW.email IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT count(*) INTO recent
  FROM public.support_tickets
  WHERE lower(email) = lower(NEW.email)
    AND created_at > now() - interval '1 hour';
  IF recent >= 5 THEN
    RAISE EXCEPTION 'Muitos chamados abertos recentemente. Tente novamente mais tarde.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_throttle_support_tickets ON public.support_tickets;
CREATE TRIGGER trg_throttle_support_tickets
BEFORE INSERT ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.throttle_support_tickets();

CREATE OR REPLACE FUNCTION public.throttle_partner_applications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent integer;
BEGIN
  IF auth.uid() IS NULL AND current_setting('request.jwt.claims', true)::json->>'role' = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF NEW.email IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT count(*) INTO recent
  FROM public.partner_applications
  WHERE lower(email) = lower(NEW.email)
    AND created_at > now() - interval '24 hours';
  IF recent >= 3 THEN
    RAISE EXCEPTION 'Limite de envios atingido. Tente novamente em 24 horas.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_throttle_partner_applications ON public.partner_applications;
CREATE TRIGGER trg_throttle_partner_applications
BEFORE INSERT ON public.partner_applications
FOR EACH ROW EXECUTE FUNCTION public.throttle_partner_applications();

CREATE OR REPLACE FUNCTION public.throttle_frontend_errors()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent integer;
BEGIN
  IF auth.uid() IS NULL AND current_setting('request.jwt.claims', true)::json->>'role' = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF NEW.session_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT count(*) INTO recent
  FROM public.frontend_errors
  WHERE session_id = NEW.session_id
    AND created_at > now() - interval '1 minute';
  IF recent >= 30 THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_throttle_frontend_errors ON public.frontend_errors;
CREATE TRIGGER trg_throttle_frontend_errors
BEFORE INSERT ON public.frontend_errors
FOR EACH ROW EXECUTE FUNCTION public.throttle_frontend_errors();