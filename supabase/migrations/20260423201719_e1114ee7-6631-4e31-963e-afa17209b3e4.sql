-- =====================================================
-- PARTNERS PROGRAM — FOUNDATION
-- =====================================================

-- Add 'partner' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'partner';

-- Partner level enum
DO $$ BEGIN
  CREATE TYPE public.partner_level AS ENUM ('bronze', 'silver', 'gold', 'platinum');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Partner status enum
DO $$ BEGIN
  CREATE TYPE public.partner_status AS ENUM ('active', 'inactive', 'blocked');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Commission status enum
DO $$ BEGIN
  CREATE TYPE public.commission_status AS ENUM ('pending', 'review', 'available', 'requested', 'paid', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Withdrawal status enum
DO $$ BEGIN
  CREATE TYPE public.withdrawal_status AS ENUM ('pending', 'approved', 'rejected', 'paid');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- =====================================================
-- 1. PARTNERS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  tax_id TEXT,
  country TEXT DEFAULT 'BR',
  referral_code TEXT UNIQUE NOT NULL,
  level partner_level NOT NULL DEFAULT 'bronze',
  status partner_status NOT NULL DEFAULT 'active',
  custom_commission_percent NUMERIC(5,2),
  internal_notes TEXT,
  created_by_admin_id UUID,
  total_clicks INTEGER NOT NULL DEFAULT 0,
  total_leads INTEGER NOT NULL DEFAULT 0,
  total_paid_clients INTEGER NOT NULL DEFAULT 0,
  lifetime_revenue_cents BIGINT NOT NULL DEFAULT 0,
  lifetime_commission_cents BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_partners_referral_code ON public.partners(referral_code);
CREATE INDEX idx_partners_status ON public.partners(status);
CREATE INDEX idx_partners_level ON public.partners(level);

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all partners"
  ON public.partners FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Partners can view own profile"
  ON public.partners FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Partners can update limited own fields"
  ON public.partners FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =====================================================
-- 2. PARTNER_CLICKS (last-click tracking)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.partner_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  landing_page TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  session_id TEXT,
  converted_to_lead_at TIMESTAMPTZ,
  converted_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_partner_clicks_partner ON public.partner_clicks(partner_id, created_at DESC);
CREATE INDEX idx_partner_clicks_session ON public.partner_clicks(session_id);
CREATE INDEX idx_partner_clicks_converted ON public.partner_clicks(converted_user_id);

ALTER TABLE public.partner_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert clicks"
  ON public.partner_clicks FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins view all clicks"
  ON public.partner_clicks FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Partners view own clicks"
  ON public.partner_clicks FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM partners WHERE partners.id = partner_clicks.partner_id AND partners.user_id = auth.uid()));

-- =====================================================
-- 3. PARTNER_LEADS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.partner_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL,
  name TEXT,
  click_id UUID REFERENCES public.partner_clicks(id) ON DELETE SET NULL,
  attributed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_trial BOOLEAN NOT NULL DEFAULT true,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  is_cancelled BOOLEAN NOT NULL DEFAULT false,
  current_plan TEXT,
  paid_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_partner_leads_partner ON public.partner_leads(partner_id);
CREATE INDEX idx_partner_leads_user ON public.partner_leads(user_id);
CREATE INDEX idx_partner_leads_paid ON public.partner_leads(is_paid) WHERE is_paid = true;

ALTER TABLE public.partner_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all leads"
  ON public.partner_leads FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Partners view own leads"
  ON public.partner_leads FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM partners WHERE partners.id = partner_leads.partner_id AND partners.user_id = auth.uid()));

-- =====================================================
-- 4. PARTNER_SALES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.partner_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  partner_lead_id UUID REFERENCES public.partner_leads(id) ON DELETE SET NULL,
  customer_user_id UUID NOT NULL,
  plan TEXT NOT NULL,
  amount_cents BIGINT NOT NULL DEFAULT 0,
  payment_provider TEXT NOT NULL,
  payment_method TEXT,
  external_reference TEXT,
  is_recurring BOOLEAN NOT NULL DEFAULT true,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  refunded_at TIMESTAMPTZ,
  chargeback_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_partner_sales_partner ON public.partner_sales(partner_id, paid_at DESC);
CREATE UNIQUE INDEX idx_partner_sales_dedup ON public.partner_sales(external_reference) WHERE external_reference IS NOT NULL;

ALTER TABLE public.partner_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all sales"
  ON public.partner_sales FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Partners view own sales"
  ON public.partner_sales FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM partners WHERE partners.id = partner_sales.partner_id AND partners.user_id = auth.uid()));

-- =====================================================
-- 5. PARTNER_COMMISSIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.partner_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  partner_sale_id UUID NOT NULL REFERENCES public.partner_sales(id) ON DELETE CASCADE,
  partner_level partner_level NOT NULL,
  commission_percent NUMERIC(5,2) NOT NULL,
  base_amount_cents BIGINT NOT NULL,
  commission_amount_cents BIGINT NOT NULL,
  status commission_status NOT NULL DEFAULT 'pending',
  available_at TIMESTAMPTZ NOT NULL,
  paid_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  internal_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_partner_commissions_partner ON public.partner_commissions(partner_id, status);
CREATE INDEX idx_partner_commissions_available ON public.partner_commissions(available_at) WHERE status = 'pending';

ALTER TABLE public.partner_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all commissions"
  ON public.partner_commissions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Partners view own commissions"
  ON public.partner_commissions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM partners WHERE partners.id = partner_commissions.partner_id AND partners.user_id = auth.uid()));

-- =====================================================
-- 6. PARTNER_BANK_ACCOUNTS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.partner_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL UNIQUE REFERENCES public.partners(id) ON DELETE CASCADE,
  holder_name TEXT,
  holder_tax_id TEXT,
  bank_name TEXT,
  bank_branch TEXT,
  bank_account TEXT,
  account_type TEXT,
  pix_key TEXT,
  pix_key_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all bank accounts"
  ON public.partner_bank_accounts FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Partners manage own bank account"
  ON public.partner_bank_accounts FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM partners WHERE partners.id = partner_bank_accounts.partner_id AND partners.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM partners WHERE partners.id = partner_bank_accounts.partner_id AND partners.user_id = auth.uid()));

-- =====================================================
-- 7. PARTNER_WITHDRAWALS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.partner_withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  amount_cents BIGINT NOT NULL,
  status withdrawal_status NOT NULL DEFAULT 'pending',
  bank_snapshot JSONB,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  rejection_reason TEXT,
  internal_notes TEXT,
  reviewed_by_admin_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_partner_withdrawals_partner ON public.partner_withdrawals(partner_id, status);
CREATE INDEX idx_partner_withdrawals_status ON public.partner_withdrawals(status, requested_at);

ALTER TABLE public.partner_withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all withdrawals"
  ON public.partner_withdrawals FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Partners view own withdrawals"
  ON public.partner_withdrawals FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM partners WHERE partners.id = partner_withdrawals.partner_id AND partners.user_id = auth.uid()));

CREATE POLICY "Partners create own withdrawals"
  ON public.partner_withdrawals FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM partners WHERE partners.id = partner_withdrawals.partner_id AND partners.user_id = auth.uid()));

-- =====================================================
-- 8. PARTNER_PAYOUTS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.partner_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  withdrawal_id UUID REFERENCES public.partner_withdrawals(id) ON DELETE SET NULL,
  amount_cents BIGINT NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'pix',
  payment_reference TEXT,
  receipt_file_name TEXT,
  receipt_file_url TEXT,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  internal_notes TEXT,
  recorded_by_admin_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_partner_payouts_partner ON public.partner_payouts(partner_id, paid_at DESC);

ALTER TABLE public.partner_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all payouts"
  ON public.partner_payouts FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Partners view own payouts"
  ON public.partner_payouts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM partners WHERE partners.id = partner_payouts.partner_id AND partners.user_id = auth.uid()));

-- =====================================================
-- 9. PARTNER_LEVELS_HISTORY
-- =====================================================
CREATE TABLE IF NOT EXISTS public.partner_levels_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  from_level partner_level,
  to_level partner_level NOT NULL,
  changed_by_admin_id UUID,
  reason TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_partner_levels_history_partner ON public.partner_levels_history(partner_id, changed_at DESC);

ALTER TABLE public.partner_levels_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage levels history"
  ON public.partner_levels_history FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Partners view own levels history"
  ON public.partner_levels_history FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM partners WHERE partners.id = partner_levels_history.partner_id AND partners.user_id = auth.uid()));

-- =====================================================
-- 10. PARTNER_SETTINGS (single-row config)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.partner_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  program_enabled BOOLEAN NOT NULL DEFAULT true,
  bronze_commission_percent NUMERIC(5,2) NOT NULL DEFAULT 20.00,
  silver_commission_percent NUMERIC(5,2) NOT NULL DEFAULT 25.00,
  gold_commission_percent NUMERIC(5,2) NOT NULL DEFAULT 30.00,
  platinum_commission_percent NUMERIC(5,2) NOT NULL DEFAULT 40.00,
  release_days INTEGER NOT NULL DEFAULT 30,
  minimum_withdrawal_cents BIGINT NOT NULL DEFAULT 10000,
  allow_multiple_pending_withdrawals BOOLEAN NOT NULL DEFAULT false,
  partner_portal_domain TEXT,
  admin_notification_emails TEXT[],
  silver_threshold_clients INTEGER NOT NULL DEFAULT 50,
  gold_threshold_clients INTEGER NOT NULL DEFAULT 250,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO public.partner_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

ALTER TABLE public.partner_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage settings"
  ON public.partner_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users read settings"
  ON public.partner_settings FOR SELECT TO authenticated
  USING (true);

-- =====================================================
-- TRIGGERS — updated_at
-- =====================================================
CREATE TRIGGER set_partners_updated_at BEFORE UPDATE ON public.partners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_partner_leads_updated_at BEFORE UPDATE ON public.partner_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_partner_commissions_updated_at BEFORE UPDATE ON public.partner_commissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_partner_bank_accounts_updated_at BEFORE UPDATE ON public.partner_bank_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_partner_withdrawals_updated_at BEFORE UPDATE ON public.partner_withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_partner_settings_updated_at BEFORE UPDATE ON public.partner_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- FUNCTION: generate_referral_code
-- =====================================================
CREATE OR REPLACE FUNCTION public.generate_partner_referral_code(p_full_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base TEXT;
  v_code TEXT;
  v_suffix INTEGER := 0;
BEGIN
  v_base := lower(regexp_replace(unaccent_simple(p_full_name), '[^a-zA-Z0-9]', '', 'g'));
  v_base := substring(v_base from 1 for 20);
  IF length(v_base) < 3 THEN
    v_base := v_base || substring(md5(random()::text) from 1 for 6);
  END IF;
  v_code := v_base;
  WHILE EXISTS (SELECT 1 FROM partners WHERE referral_code = v_code) LOOP
    v_suffix := v_suffix + 1;
    v_code := v_base || v_suffix::text;
  END LOOP;
  RETURN v_code;
END;
$$;

-- Simple unaccent fallback (avoids dependency on unaccent extension)
CREATE OR REPLACE FUNCTION public.unaccent_simple(input TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT translate(
    input,
    'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇñÑ',
    'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUCnN'
  );
$$;

-- =====================================================
-- FUNCTION: get_partner_commission_percent
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_partner_commission_percent(p_partner_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
    WHEN 'bronze' THEN v_settings.bronze_commission_percent
    WHEN 'silver' THEN v_settings.silver_commission_percent
    WHEN 'gold' THEN v_settings.gold_commission_percent
    WHEN 'platinum' THEN v_settings.platinum_commission_percent
  END;
END;
$$;

-- =====================================================
-- FUNCTION: generate_commission_for_sale
-- =====================================================
CREATE OR REPLACE FUNCTION public.generate_commission_for_sale()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner partners%ROWTYPE;
  v_settings partner_settings%ROWTYPE;
  v_percent NUMERIC;
  v_commission_cents BIGINT;
BEGIN
  SELECT * INTO v_partner FROM partners WHERE id = NEW.partner_id;
  IF NOT FOUND OR v_partner.status <> 'active' THEN RETURN NEW; END IF;

  SELECT * INTO v_settings FROM partner_settings WHERE id = 1;
  IF NOT v_settings.program_enabled THEN RETURN NEW; END IF;

  v_percent := public.get_partner_commission_percent(NEW.partner_id);
  v_commission_cents := (NEW.amount_cents * v_percent / 100)::BIGINT;

  INSERT INTO partner_commissions (
    partner_id, partner_sale_id, partner_level, commission_percent,
    base_amount_cents, commission_amount_cents, status, available_at
  ) VALUES (
    NEW.partner_id, NEW.id, v_partner.level, v_percent,
    NEW.amount_cents, v_commission_cents, 'pending',
    NEW.paid_at + (v_settings.release_days || ' days')::interval
  );

  UPDATE partners
  SET lifetime_revenue_cents = lifetime_revenue_cents + NEW.amount_cents,
      lifetime_commission_cents = lifetime_commission_cents + v_commission_cents,
      total_paid_clients = (
        SELECT COUNT(DISTINCT customer_user_id) FROM partner_sales WHERE partner_id = NEW.partner_id
      )
  WHERE id = NEW.partner_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_commission_for_sale
  AFTER INSERT ON public.partner_sales
  FOR EACH ROW EXECUTE FUNCTION public.generate_commission_for_sale();

-- =====================================================
-- FUNCTION: release_pending_commissions (cron-friendly)
-- =====================================================
CREATE OR REPLACE FUNCTION public.release_pending_commissions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE partner_commissions
  SET status = 'available', updated_at = now()
  WHERE status = 'pending' AND available_at <= now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- =====================================================
-- FUNCTION: log_partner_level_change
-- =====================================================
CREATE OR REPLACE FUNCTION public.log_partner_level_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.level IS DISTINCT FROM OLD.level THEN
    INSERT INTO partner_levels_history (partner_id, from_level, to_level, changed_by_admin_id)
    VALUES (NEW.id, OLD.level, NEW.level, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_partner_level_change
  AFTER UPDATE ON public.partners
  FOR EACH ROW EXECUTE FUNCTION public.log_partner_level_change();

-- =====================================================
-- FUNCTION: prevent_self_referral
-- =====================================================
CREATE OR REPLACE FUNCTION public.prevent_self_referral()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner_user_id UUID;
BEGIN
  SELECT user_id INTO v_partner_user_id FROM partners WHERE id = NEW.partner_id;
  IF v_partner_user_id = NEW.user_id THEN
    RAISE EXCEPTION 'Auto-indicação não permitida (parceiro não pode indicar a si mesmo)';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prevent_self_referral
  BEFORE INSERT ON public.partner_leads
  FOR EACH ROW EXECUTE FUNCTION public.prevent_self_referral();

-- =====================================================
-- STORAGE: payout receipts bucket
-- =====================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('partner-payouts', 'partner-payouts', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins manage payout receipts"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'partner-payouts' AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (bucket_id = 'partner-payouts' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Partners read own payout receipts"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'partner-payouts'
    AND EXISTS (
      SELECT 1 FROM partner_payouts pp
      JOIN partners p ON p.id = pp.partner_id
      WHERE pp.receipt_file_url LIKE '%' || storage.objects.name || '%'
        AND p.user_id = auth.uid()
    )
  );