-- 1. Audit table for blocked self-referral attempts
CREATE TABLE IF NOT EXISTS public.partner_fraud_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES public.partners(id) ON DELETE CASCADE,
  user_id uuid,
  email text,
  reason text NOT NULL,
  matched_field text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_fraud_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view fraud attempts" ON public.partner_fraud_attempts;
CREATE POLICY "Admins view fraud attempts"
  ON public.partner_fraud_attempts FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Service role inserts fraud attempts" ON public.partner_fraud_attempts;
CREATE POLICY "Service role inserts fraud attempts"
  ON public.partner_fraud_attempts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_partner_fraud_partner ON public.partner_fraud_attempts(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_fraud_created ON public.partner_fraud_attempts(created_at DESC);

-- 2. Reusable validator: checks if a (partner, user) pair would be self-referral fraud
CREATE OR REPLACE FUNCTION public.check_partner_self_referral(
  p_partner_id uuid,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner partners%ROWTYPE;
  v_partner_profile profiles%ROWTYPE;
  v_user_profile profiles%ROWTYPE;
  v_partner_clean_cpf text;
  v_user_clean_cpf text;
BEGIN
  SELECT * INTO v_partner FROM partners WHERE id = p_partner_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('blocked', false);
  END IF;

  -- Same auth user
  IF v_partner.user_id = p_user_id THEN
    RETURN jsonb_build_object('blocked', true, 'reason', 'same_user', 'matched_field', 'user_id');
  END IF;

  SELECT * INTO v_partner_profile FROM profiles WHERE id = v_partner.user_id;
  SELECT * INTO v_user_profile    FROM profiles WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('blocked', false);
  END IF;

  -- Email match (compare both partner.email and partner profile email)
  IF v_user_profile.email IS NOT NULL
     AND ( lower(v_user_profile.email) = lower(COALESCE(v_partner.email, ''))
        OR lower(v_user_profile.email) = lower(COALESCE(v_partner_profile.email, '')) )
  THEN
    RETURN jsonb_build_object('blocked', true, 'reason', 'same_email', 'matched_field', 'email');
  END IF;

  -- CPF / tax_id match (clean digits only)
  v_partner_clean_cpf := regexp_replace(COALESCE(v_partner.tax_id, v_partner_profile.cpf, ''), '[^0-9]', '', 'g');
  v_user_clean_cpf    := regexp_replace(COALESCE(v_user_profile.cpf, ''), '[^0-9]', '', 'g');
  IF length(v_partner_clean_cpf) >= 11
     AND length(v_user_clean_cpf) >= 11
     AND v_partner_clean_cpf = v_user_clean_cpf
  THEN
    RETURN jsonb_build_object('blocked', true, 'reason', 'same_cpf', 'matched_field', 'cpf');
  END IF;

  -- Phone match (last 8 digits)
  IF v_partner.phone IS NOT NULL
     AND v_user_profile.phone IS NOT NULL
     AND public.get_phone_key(v_partner.phone) = public.get_phone_key(v_user_profile.phone)
     AND length(public.get_phone_key(v_partner.phone)) = 8
  THEN
    RETURN jsonb_build_object('blocked', true, 'reason', 'same_phone', 'matched_field', 'phone');
  END IF;

  -- Signup IP match
  IF v_partner_profile.signup_ip IS NOT NULL
     AND v_user_profile.signup_ip IS NOT NULL
     AND v_partner_profile.signup_ip <> ''
     AND v_user_profile.signup_ip <> ''
     AND v_partner_profile.signup_ip <> 'unknown'
     AND v_partner_profile.signup_ip = v_user_profile.signup_ip
  THEN
    RETURN jsonb_build_object('blocked', true, 'reason', 'same_ip', 'matched_field', 'signup_ip');
  END IF;

  -- Device fingerprint match
  IF v_partner_profile.device_fingerprint IS NOT NULL
     AND v_user_profile.device_fingerprint IS NOT NULL
     AND v_partner_profile.device_fingerprint <> ''
     AND v_user_profile.device_fingerprint <> ''
     AND v_partner_profile.device_fingerprint = v_user_profile.device_fingerprint
  THEN
    RETURN jsonb_build_object('blocked', true, 'reason', 'same_device', 'matched_field', 'device_fingerprint');
  END IF;

  RETURN jsonb_build_object('blocked', false);
END;
$$;

-- 3. Replace prevent_self_referral trigger with the expanded version
CREATE OR REPLACE FUNCTION public.prevent_self_referral()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_check jsonb;
BEGIN
  v_check := public.check_partner_self_referral(NEW.partner_id, NEW.user_id);

  IF (v_check->>'blocked')::boolean THEN
    -- Log the attempt for admin review
    INSERT INTO public.partner_fraud_attempts (
      partner_id, user_id, email, reason, matched_field, metadata
    ) VALUES (
      NEW.partner_id,
      NEW.user_id,
      NEW.email,
      v_check->>'reason',
      v_check->>'matched_field',
      jsonb_build_object('source', 'prevent_self_referral_trigger', 'click_id', NEW.click_id)
    );

    RAISE EXCEPTION 'partner_self_referral_blocked: %', v_check->>'reason'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;