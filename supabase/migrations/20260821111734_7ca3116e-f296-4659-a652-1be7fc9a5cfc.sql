-- ============ 1. Thread de conversa com influenciadores ============
CREATE TABLE IF NOT EXISTS public.influencer_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES public.influencer_prospects(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.influencer_campaigns(id) ON DELETE SET NULL,
  recipient_id uuid REFERENCES public.influencer_campaign_recipients(id) ON DELETE SET NULL,
  direction text NOT NULL CHECK (direction IN ('enviada','recebida','nota')),
  subject text,
  body_text text NOT NULL DEFAULT '',
  body_html text,
  from_email text,
  to_email text,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  provider_message_id text,
  author_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_influencer_messages_prospect ON public.influencer_messages(prospect_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_influencer_messages_recipient ON public.influencer_messages(recipient_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.influencer_messages TO authenticated;
GRANT ALL ON public.influencer_messages TO service_role;

ALTER TABLE public.influencer_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage influencer messages" ON public.influencer_messages;
CREATE POLICY "Admins manage influencer messages"
ON public.influencer_messages FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.influencer_messages REPLICA IDENTITY FULL;

-- ============ 2. Segurança: account_members self-update ============
CREATE OR REPLACE FUNCTION public.protect_account_member_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- service_role e admins globais podem tudo
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  -- o dono da conta pode gerenciar seus membros
  IF OLD.owner_user_id = auth.uid() THEN
    RETURN NEW;
  END IF;
  -- o próprio membro só pode registrar o último acesso
  IF OLD.user_id = auth.uid() THEN
    NEW.owner_user_id := OLD.owner_user_id;
    NEW.user_id       := OLD.user_id;
    NEW.role          := OLD.role;
    NEW.status        := OLD.status;
    NEW.email         := OLD.email;
    NEW.created_by    := OLD.created_by;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_account_member_self_update ON public.account_members;
CREATE TRIGGER trg_protect_account_member_self_update
BEFORE UPDATE ON public.account_members
FOR EACH ROW EXECUTE FUNCTION public.protect_account_member_self_update();

-- ============ 3. Segurança: profiles self-update (billing/roles) ============
CREATE OR REPLACE FUNCTION public.protect_profile_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_privileged_columns ON public.profiles;
CREATE TRIGGER trg_protect_profile_privileged_columns
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileged_columns();

-- ============ 4. Segurança: lead_deals fora do tenant ============
DROP POLICY IF EXISTS "Account members update lead_deals" ON public.lead_deals;
CREATE POLICY "Account members update lead_deals"
ON public.lead_deals FOR UPDATE TO authenticated
USING (owner_user_id IN (SELECT unnest(public.accessible_owner_ids())))
WITH CHECK (owner_user_id IN (SELECT unnest(public.accessible_owner_ids())));