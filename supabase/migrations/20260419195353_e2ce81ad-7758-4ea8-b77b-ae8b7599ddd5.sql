-- Allowlist privada (somente service role)
CREATE TABLE IF NOT EXISTS public.signup_fraud_allowlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier_hash text NOT NULL UNIQUE,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.signup_fraud_allowlist ENABLE ROW LEVEL SECURITY;

-- Sem políticas = ninguém via anon/authenticated consegue ler/escrever.
-- Apenas service_role e SECURITY DEFINER functions acessam.

-- Habilita pgcrypto para digest()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Atualiza a função de fraude para respeitar a allowlist
CREATE OR REPLACE FUNCTION public.check_signup_fraud_strict(p_fingerprint text, p_ip text, p_cpf text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
      v_hash := encode(digest(v_clean_cpf, 'sha256'), 'hex');
      SELECT EXISTS (
        SELECT 1 FROM public.signup_fraud_allowlist WHERE identifier_hash = v_hash
      ) INTO v_allow;
    END IF;
  END IF;

  -- Allowlist: pula todas as travas
  IF v_allow THEN
    RETURN json_build_object('allowed', true);
  END IF;

  IF p_fingerprint IS NOT NULL AND p_fingerprint <> '' THEN
    SELECT COUNT(*) INTO v_fp_count
    FROM profiles
    WHERE device_fingerprint = p_fingerprint;
  END IF;

  IF p_ip IS NOT NULL AND p_ip <> '' AND p_ip <> 'unknown' THEN
    SELECT COUNT(*) INTO v_ip_count
    FROM profiles
    WHERE signup_ip = p_ip;
  END IF;

  IF p_cpf IS NOT NULL AND p_cpf <> '' THEN
    SELECT COUNT(*) INTO v_cpf_count
    FROM profiles
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

-- Seed: libera o identificador informado (apenas hash é armazenado)
INSERT INTO public.signup_fraud_allowlist (identifier_hash, note)
VALUES (encode(digest('15803674966', 'sha256'), 'hex'), 'owner test')
ON CONFLICT (identifier_hash) DO NOTHING;