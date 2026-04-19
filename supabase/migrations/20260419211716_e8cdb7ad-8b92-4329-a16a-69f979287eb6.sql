CREATE OR REPLACE FUNCTION public.check_signup_fraud_strict(p_fingerprint text, p_ip text, p_cpf text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_fp_count INT := 0;
  v_ip_count INT := 0;
  v_cpf_count INT := 0;
  v_allow BOOLEAN := false;
  v_clean_cpf TEXT;
  v_hash TEXT;
BEGIN
  IF p_cpf IS NOT NULL AND p_cpf <> '' THEN
    v_clean_cpf := regexp_replace(p_cpf, '[^0-9]', '', 'g');
    IF length(v_clean_cpf) > 0 THEN
      v_hash := encode(extensions.digest(v_clean_cpf, 'sha256'::text), 'hex');
      SELECT EXISTS (
        SELECT 1 FROM public.signup_fraud_allowlist WHERE identifier_hash = v_hash
      ) INTO v_allow;
    END IF;
  END IF;

  IF v_allow THEN
    RETURN json_build_object('allowed', true);
  END IF;

  IF p_fingerprint IS NOT NULL AND p_fingerprint <> '' THEN
    SELECT COUNT(*) INTO v_fp_count
    FROM public.profiles
    WHERE device_fingerprint = p_fingerprint;
  END IF;

  IF p_ip IS NOT NULL AND p_ip <> '' AND p_ip <> 'unknown' THEN
    SELECT COUNT(*) INTO v_ip_count
    FROM public.profiles
    WHERE signup_ip = p_ip;
  END IF;

  IF p_cpf IS NOT NULL AND p_cpf <> '' THEN
    SELECT COUNT(*) INTO v_cpf_count
    FROM public.profiles
    WHERE cpf = p_cpf;
  END IF;

  IF v_fp_count >= 1 THEN
    RETURN json_build_object('allowed', false, 'reason', 'device_already_registered',
      'message', 'Já existe uma conta neste dispositivo. Faça login na conta existente.');
  END IF;

  IF v_ip_count >= 1 THEN
    RETURN json_build_object('allowed', false, 'reason', 'ip_already_registered',
      'message', 'Já existe uma conta cadastrada nesta rede. Faça login na conta existente.');
  END IF;

  IF v_cpf_count >= 1 THEN
    RETURN json_build_object('allowed', false, 'reason', 'cpf_already_registered',
      'message', 'Este CPF já está vinculado a outra conta.');
  END IF;

  RETURN json_build_object('allowed', true);
END;
$function$;