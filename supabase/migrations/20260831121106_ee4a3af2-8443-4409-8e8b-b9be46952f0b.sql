-- 1) Partners: block self-escalation of privileged columns
CREATE OR REPLACE FUNCTION public.protect_partner_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- service_role (auth.uid() IS NULL) and global admins keep full control
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  NEW.level                     := OLD.level;
  NEW.status                    := OLD.status;
  NEW.referral_code             := OLD.referral_code;
  NEW.user_id                   := OLD.user_id;
  NEW.custom_commission_percent := OLD.custom_commission_percent;
  NEW.lifetime_revenue_cents    := OLD.lifetime_revenue_cents;
  NEW.lifetime_commission_cents := OLD.lifetime_commission_cents;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_protect_partner_privileged_columns ON public.partners;
CREATE TRIGGER trg_protect_partner_privileged_columns
BEFORE UPDATE ON public.partners
FOR EACH ROW EXECUTE FUNCTION public.protect_partner_privileged_columns();

-- 2) member_availability: force the pairing to the caller's real account
CREATE OR REPLACE FUNCTION public.enforce_member_availability_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  -- Account owner managing a member's availability: member must belong to them
  IF NEW.account_owner_id = auth.uid() THEN
    IF NEW.user_id <> auth.uid()
       AND public.get_account_owner(NEW.user_id) <> auth.uid() THEN
      RAISE EXCEPTION 'member_availability: user does not belong to this account';
    END IF;
    RETURN NEW;
  END IF;

  -- Member writing their own availability: owner is always derived server-side
  IF NEW.user_id = auth.uid() THEN
    NEW.account_owner_id := public.get_account_owner(auth.uid());
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'member_availability: not allowed';
END;
$function$;

DROP TRIGGER IF EXISTS trg_enforce_member_availability_tenant ON public.member_availability;
CREATE TRIGGER trg_enforce_member_availability_tenant
BEFORE INSERT OR UPDATE ON public.member_availability
FOR EACH ROW EXECUTE FUNCTION public.enforce_member_availability_tenant();

-- 3) partner_leads: users may only self-attribute, never fabricate paid status
CREATE OR REPLACE FUNCTION public.protect_partner_lead_self_attribution()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_plan text;
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  SELECT p.plan INTO v_plan FROM public.profiles p WHERE p.id = NEW.user_id;

  NEW.current_plan := v_plan;
  NEW.is_paid      := (COALESCE(v_plan, 'free') <> 'free');
  NEW.is_trial     := (COALESCE(v_plan, 'free') = 'free');

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_protect_partner_lead_self_attribution ON public.partner_leads;
CREATE TRIGGER trg_protect_partner_lead_self_attribution
BEFORE INSERT ON public.partner_leads
FOR EACH ROW EXECUTE FUNCTION public.protect_partner_lead_self_attribution();

-- 4) profiles: also freeze must_change_password for non-admin self updates
CREATE OR REPLACE FUNCTION public.protect_profile_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  NEW.plan                          := OLD.plan;
  NEW.searches_limit                := OLD.searches_limit;
  NEW.searches_used                 := OLD.searches_used;
  NEW.bonus_searches                := OLD.bonus_searches;
  NEW.admin_assigned_plan           := OLD.admin_assigned_plan;
  NEW.custom_searches_limit         := OLD.custom_searches_limit;
  NEW.custom_whatsapp_numbers_limit := OLD.custom_whatsapp_numbers_limit;
  NEW.custom_feature_permissions    := OLD.custom_feature_permissions;
  NEW.custom_subscription_id        := OLD.custom_subscription_id;
  NEW.is_custom_subscription        := OLD.is_custom_subscription;
  NEW.is_blocked                    := OLD.is_blocked;
  NEW.is_archived                   := OLD.is_archived;
  NEW.account_role                  := OLD.account_role;
  NEW.parent_owner_id               := OLD.parent_owner_id;
  NEW.payment_provider              := OLD.payment_provider;
  NEW.billing_period                := OLD.billing_period;
  NEW.subscription_price_cents      := OLD.subscription_price_cents;
  NEW.subscription_current_period_end := OLD.subscription_current_period_end;
  NEW.asaas_subscription_id         := OLD.asaas_subscription_id;
  NEW.asaas_customer_id             := OLD.asaas_customer_id;
  NEW.trial_start_at                := OLD.trial_start_at;
  NEW.trial_end_at                  := OLD.trial_end_at;
  NEW.trial_will_charge_at          := OLD.trial_will_charge_at;
  NEW.trial_plan_chosen             := OLD.trial_plan_chosen;
  NEW.trial_asaas_subscription_id   := OLD.trial_asaas_subscription_id;
  NEW.trial_asaas_customer_id       := OLD.trial_asaas_customer_id;
  NEW.extra_numbers                 := OLD.extra_numbers;
  NEW.extra_contacts_packs          := OLD.extra_contacts_packs;
  NEW.extra_opportunities_packs     := OLD.extra_opportunities_packs;
  NEW.requires_payment_setup        := OLD.requires_payment_setup;
  NEW.first_paid_at                 := OLD.first_paid_at;
  NEW.fraud_flags                   := OLD.fraud_flags;
  NEW.must_change_password          := OLD.must_change_password;

  RETURN NEW;
END;
$function$;