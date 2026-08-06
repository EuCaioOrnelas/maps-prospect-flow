
-- 1) Fonte única de verdade: acesso ativo
CREATE OR REPLACE FUNCTION public.is_downgrade_protected(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p record;
BEGIN
  IF _user_id IS NULL THEN RETURN false; END IF;

  SELECT id, parent_owner_id, plan, admin_assigned_plan, is_custom_subscription,
         payment_provider, subscription_current_period_end
    INTO p
  FROM public.profiles WHERE id = _user_id;

  IF NOT FOUND THEN RETURN false; END IF;

  -- Sub-usuário herda a proteção do dono
  IF p.parent_owner_id IS NOT NULL AND p.parent_owner_id <> p.id THEN
    RETURN public.is_downgrade_protected(p.parent_owner_id);
  END IF;

  -- Admin nunca é rebaixado automaticamente
  IF public.has_role(_user_id, 'admin'::app_role) THEN
    RETURN true;
  END IF;

  -- Contrato customizado ativo/vitalício
  IF EXISTS (
    SELECT 1 FROM public.custom_subscriptions cs
    WHERE cs.user_id = _user_id
      AND cs.status = 'active'
      AND (cs.is_lifetime = true OR cs.ends_at IS NULL OR cs.ends_at > now())
  ) THEN
    RETURN true;
  END IF;

  -- Assinatura manual / atribuída pelo admin / custom no perfil
  IF COALESCE(p.admin_assigned_plan, false)
     OR COALESCE(p.is_custom_subscription, false)
     OR lower(COALESCE(p.payment_provider, '')) = 'manual'
  THEN
    -- vitalício = sem data de término definida
    IF p.subscription_current_period_end IS NULL
       OR p.subscription_current_period_end > now() THEN
      RETURN true;
    END IF;
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.has_active_access(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p record;
  owner_id uuid;
BEGIN
  IF _user_id IS NULL THEN RETURN false; END IF;

  SELECT * INTO p FROM public.profiles WHERE id = _user_id;
  IF NOT FOUND THEN RETURN false; END IF;

  -- Bloqueio manual sempre vence
  IF COALESCE(p.is_blocked, false) THEN RETURN false; END IF;

  -- Admin sempre tem acesso
  IF public.has_role(_user_id, 'admin'::app_role) THEN RETURN true; END IF;

  -- Sub-usuário: herda o acesso do dono, mas mantém o aceite dos termos próprio
  owner_id := COALESCE(p.parent_owner_id, p.id);
  IF owner_id <> p.id THEN
    IF p.terms_accepted_at IS NULL THEN RETURN false; END IF;
    RETURN public.has_active_access(owner_id);
  END IF;

  -- Sem aceite de termos não há acesso
  IF p.terms_accepted_at IS NULL THEN RETURN false; END IF;

  -- Assinatura manual/custom protegida
  IF public.is_downgrade_protected(_user_id) THEN RETURN true; END IF;

  -- Trial em andamento
  IF p.trial_will_charge_at IS NOT NULL AND p.trial_will_charge_at > now() THEN
    RETURN true;
  END IF;
  IF p.trial_end_at IS NOT NULL AND p.trial_end_at > now() THEN
    RETURN true;
  END IF;

  -- Assinatura paga válida (7 dias de tolerância)
  IF COALESCE(p.plan, 'free') <> 'free'
     AND p.subscription_current_period_end IS NOT NULL
     AND (p.subscription_current_period_end + interval '7 days') > now()
  THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.has_active_access(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_downgrade_protected(uuid) TO authenticated, service_role;

-- 2) Auditoria de downgrades
CREATE OR REPLACE FUNCTION public.log_plan_downgrade(
  _user_id uuid,
  _reason text,
  _previous_plan text DEFAULT NULL,
  _new_plan text DEFAULT 'free',
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.security_audit_log (user_id, action, resource_type, resource_id, metadata)
  VALUES (
    _user_id,
    'plan_downgrade',
    'subscription',
    _user_id::text,
    COALESCE(_metadata, '{}'::jsonb) || jsonb_build_object(
      'reason', _reason,
      'previous_plan', _previous_plan,
      'new_plan', _new_plan,
      'at', now()
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_plan_downgrade(uuid, text, text, text, jsonb) TO service_role;
