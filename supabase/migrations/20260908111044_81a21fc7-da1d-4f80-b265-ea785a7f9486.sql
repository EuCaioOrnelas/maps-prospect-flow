CREATE OR REPLACE FUNCTION public.protect_sensitive_profile_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  is_service_role boolean;
  is_superuser boolean;
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

  IF NEW.plan IS DISTINCT FROM OLD.plan THEN
    RAISE EXCEPTION 'Não é permitido alterar o plano diretamente';
  END IF;
  IF NEW.searches_limit IS DISTINCT FROM OLD.searches_limit THEN
    RAISE EXCEPTION 'Não é permitido alterar o limite de buscas';
  END IF;
  IF NEW.is_blocked IS DISTINCT FROM OLD.is_blocked THEN
    RAISE EXCEPTION 'Não é permitido alterar o status de bloqueio';
  END IF;
  IF NEW.fraud_flags IS DISTINCT FROM OLD.fraud_flags THEN
    RAISE EXCEPTION 'Não é permitido alterar flags de fraude';
  END IF;
  IF NEW.device_fingerprint IS DISTINCT FROM OLD.device_fingerprint THEN
    RAISE EXCEPTION 'Não é permitido alterar fingerprint do dispositivo';
  END IF;
  IF NEW.signup_ip IS DISTINCT FROM OLD.signup_ip THEN
    RAISE EXCEPTION 'Não é permitido alterar IP de cadastro';
  END IF;
  IF NEW.account_role IS DISTINCT FROM OLD.account_role THEN
    RAISE EXCEPTION 'Não é permitido alterar o papel da conta (account_role) diretamente';
  END IF;

  RETURN NEW;
END;
$function$;