
-- =========================================================
-- 1. partner_goals
-- =========================================================
CREATE TYPE public.partner_goal_type AS ENUM ('revenue', 'paid_clients', 'leads', 'mrr');
CREATE TYPE public.partner_goal_status AS ENUM ('active', 'completed', 'expired', 'cancelled');
CREATE TYPE public.partner_goal_prize_status AS ENUM ('not_claimed', 'requested', 'paid');

CREATE TABLE public.partner_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  goal_type partner_goal_type NOT NULL,
  target_value NUMERIC(14,2) NOT NULL CHECK (target_value > 0),
  prize_amount_cents BIGINT NOT NULL DEFAULT 0 CHECK (prize_amount_cents >= 0),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deadline_at TIMESTAMPTZ NOT NULL,
  status partner_goal_status NOT NULL DEFAULT 'active',
  prize_status partner_goal_prize_status NOT NULL DEFAULT 'not_claimed',
  prize_withdrawal_id UUID REFERENCES public.partner_withdrawals(id) ON DELETE SET NULL,
  achieved_value NUMERIC(14,2) NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  prize_claimed_at TIMESTAMPTZ,
  created_by_admin_id UUID,
  internal_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_partner_goals_partner ON public.partner_goals(partner_id, status);
CREATE INDEX idx_partner_goals_deadline ON public.partner_goals(deadline_at) WHERE status = 'active';

ALTER TABLE public.partner_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all goals" ON public.partner_goals
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Partners view own goals" ON public.partner_goals
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM partners WHERE partners.id = partner_goals.partner_id AND partners.user_id = auth.uid()));

CREATE TRIGGER set_partner_goals_updated_at
  BEFORE UPDATE ON public.partner_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 2. partner_referral_links
-- =========================================================
CREATE TABLE public.partner_referral_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  total_clicks INTEGER NOT NULL DEFAULT 0,
  total_leads INTEGER NOT NULL DEFAULT 0,
  total_paid_clients INTEGER NOT NULL DEFAULT 0,
  created_by_admin_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_partner_referral_links_partner ON public.partner_referral_links(partner_id);
CREATE INDEX idx_partner_referral_links_slug ON public.partner_referral_links(slug);

ALTER TABLE public.partner_referral_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all referral links" ON public.partner_referral_links
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Partners view own referral links" ON public.partner_referral_links
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM partners WHERE partners.id = partner_referral_links.partner_id AND partners.user_id = auth.uid()));

CREATE POLICY "Public can read active links by slug" ON public.partner_referral_links
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

CREATE TRIGGER set_partner_referral_links_updated_at
  BEFORE UPDATE ON public.partner_referral_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 3. Add referral_link_id to partner_clicks / partner_leads
-- =========================================================
ALTER TABLE public.partner_clicks
  ADD COLUMN referral_link_id UUID REFERENCES public.partner_referral_links(id) ON DELETE SET NULL;

ALTER TABLE public.partner_leads
  ADD COLUMN referral_link_id UUID REFERENCES public.partner_referral_links(id) ON DELETE SET NULL;

CREATE INDEX idx_partner_clicks_link ON public.partner_clicks(referral_link_id) WHERE referral_link_id IS NOT NULL;
CREATE INDEX idx_partner_leads_link ON public.partner_leads(referral_link_id) WHERE referral_link_id IS NOT NULL;

-- =========================================================
-- 4. partner_bank_accounts: bank_code
-- =========================================================
ALTER TABLE public.partner_bank_accounts
  ADD COLUMN bank_code TEXT;

-- =========================================================
-- 5. compute_partner_mrr(partner_id) → cents
-- =========================================================
CREATE OR REPLACE FUNCTION public.compute_partner_mrr(p_partner_id UUID)
RETURNS BIGINT
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mrr BIGINT := 0;
BEGIN
  -- Soma das mensalidades dos clientes pagos & ativos atribuídos ao parceiro
  -- Plano anual entra como (valor / 12)
  SELECT COALESCE(SUM(
    CASE
      WHEN p.plan = 'start'  THEN 24600   -- start anual = 246/mês
      WHEN p.plan = 'growth' THEN 49600   -- growth anual = 496/mês
      WHEN p.plan = 'scale'  THEN 99600
      ELSE 0
    END
  ), 0)::BIGINT
  INTO v_mrr
  FROM partner_leads pl
  JOIN profiles p ON p.id = pl.user_id
  WHERE pl.partner_id = p_partner_id
    AND pl.is_paid = true
    AND pl.is_cancelled = false
    AND p.plan IN ('start','growth','scale')
    AND (p.subscription_current_period_end IS NULL OR p.subscription_current_period_end > now() - interval '7 days');

  RETURN v_mrr;
END;
$$;

-- =========================================================
-- 6. update_partner_goal_progress(p_partner_id) - server-side recompute
-- =========================================================
CREATE OR REPLACE FUNCTION public.update_partner_goal_progress(p_partner_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_goal RECORD;
  v_value NUMERIC := 0;
BEGIN
  FOR v_goal IN
    SELECT * FROM partner_goals
    WHERE partner_id = p_partner_id
      AND status = 'active'
  LOOP
    v_value := 0;

    IF v_goal.goal_type = 'revenue' THEN
      SELECT COALESCE(SUM(amount_cents), 0) / 100.0 INTO v_value
      FROM partner_sales
      WHERE partner_id = p_partner_id
        AND paid_at >= v_goal.starts_at
        AND paid_at <= v_goal.deadline_at
        AND refunded_at IS NULL
        AND chargeback_at IS NULL;
    ELSIF v_goal.goal_type = 'paid_clients' THEN
      SELECT COUNT(DISTINCT customer_user_id) INTO v_value
      FROM partner_sales
      WHERE partner_id = p_partner_id
        AND paid_at >= v_goal.starts_at
        AND paid_at <= v_goal.deadline_at
        AND refunded_at IS NULL
        AND chargeback_at IS NULL;
    ELSIF v_goal.goal_type = 'leads' THEN
      SELECT COUNT(*) INTO v_value
      FROM partner_leads
      WHERE partner_id = p_partner_id
        AND attributed_at >= v_goal.starts_at
        AND attributed_at <= v_goal.deadline_at;
    ELSIF v_goal.goal_type = 'mrr' THEN
      v_value := compute_partner_mrr(p_partner_id) / 100.0;
    END IF;

    UPDATE partner_goals
    SET achieved_value = v_value,
        status = CASE
          WHEN v_value >= v_goal.target_value THEN 'completed'::partner_goal_status
          WHEN now() > v_goal.deadline_at THEN 'expired'::partner_goal_status
          ELSE 'active'::partner_goal_status
        END,
        completed_at = CASE
          WHEN v_value >= v_goal.target_value AND completed_at IS NULL THEN now()
          ELSE completed_at
        END,
        updated_at = now()
    WHERE id = v_goal.id;
  END LOOP;
END;
$$;

-- =========================================================
-- 7. request_partner_withdrawal: ATOMIC + SECURE
-- =========================================================
CREATE OR REPLACE FUNCTION public.request_partner_withdrawal(p_amount_cents BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner partners%ROWTYPE;
  v_settings partner_settings%ROWTYPE;
  v_bank partner_bank_accounts%ROWTYPE;
  v_balance JSONB;
  v_available BIGINT;
  v_pending_count INT;
  v_withdrawal_id UUID;
BEGIN
  -- 1. authenticate
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não autenticado');
  END IF;

  -- 2. find partner & lock the row to prevent race conditions
  SELECT * INTO v_partner FROM partners
   WHERE user_id = auth.uid() AND status = 'active'
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Parceiro não encontrado ou inativo');
  END IF;

  -- 3. validate amount
  IF p_amount_cents IS NULL OR p_amount_cents <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Valor inválido');
  END IF;

  -- 4. settings & minimum
  SELECT * INTO v_settings FROM partner_settings WHERE id = 1;
  IF NOT v_settings.program_enabled THEN
    RETURN jsonb_build_object('success', false, 'error', 'Programa de parceiros desativado');
  END IF;

  IF p_amount_cents < v_settings.minimum_withdrawal_cents THEN
    RETURN jsonb_build_object('success', false,
      'error', 'Valor abaixo do saque mínimo de R$ ' || (v_settings.minimum_withdrawal_cents / 100.0)::text);
  END IF;

  -- 5. multiple pending check
  IF NOT v_settings.allow_multiple_pending_withdrawals THEN
    SELECT COUNT(*) INTO v_pending_count
    FROM partner_withdrawals
    WHERE partner_id = v_partner.id AND status IN ('pending','approved');

    IF v_pending_count > 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Você já possui um saque em andamento');
    END IF;
  END IF;

  -- 6. bank account required & complete
  SELECT * INTO v_bank FROM partner_bank_accounts WHERE partner_id = v_partner.id;
  IF NOT FOUND
     OR v_bank.holder_name IS NULL OR v_bank.holder_name = ''
     OR v_bank.holder_tax_id IS NULL OR v_bank.holder_tax_id = ''
     OR v_bank.pix_key IS NULL OR v_bank.pix_key = ''
     OR v_bank.bank_name IS NULL OR v_bank.bank_name = ''
     OR v_bank.bank_code IS NULL OR v_bank.bank_code = ''
  THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cadastre seus dados bancários completos antes de solicitar saque');
  END IF;

  -- 7. recompute balance server-side (NEVER trust client value)
  v_balance := compute_partner_balance(v_partner.id);
  v_available := (v_balance->>'available_cents')::BIGINT;

  IF p_amount_cents > v_available THEN
    RETURN jsonb_build_object('success', false, 'error', 'Saldo insuficiente. Disponível: R$ ' || (v_available / 100.0)::text);
  END IF;

  -- 8. create withdrawal with snapshot of current bank data (immutable record)
  INSERT INTO partner_withdrawals (
    partner_id, amount_cents, status, bank_snapshot
  ) VALUES (
    v_partner.id,
    p_amount_cents,
    'pending',
    jsonb_build_object(
      'holder_name',   v_bank.holder_name,
      'holder_tax_id', v_bank.holder_tax_id,
      'bank_code',     v_bank.bank_code,
      'bank_name',     v_bank.bank_name,
      'bank_branch',   v_bank.bank_branch,
      'bank_account',  v_bank.bank_account,
      'account_type',  v_bank.account_type,
      'pix_key',       v_bank.pix_key,
      'pix_key_type',  v_bank.pix_key_type
    )
  )
  RETURNING id INTO v_withdrawal_id;

  PERFORM log_security_event('partner_withdrawal_requested', 'partner_withdrawal',
    v_withdrawal_id::text,
    jsonb_build_object('partner_id', v_partner.id, 'amount_cents', p_amount_cents));

  RETURN jsonb_build_object('success', true, 'withdrawal_id', v_withdrawal_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_partner_withdrawal(BIGINT) TO authenticated;

-- =========================================================
-- 8. claim_partner_goal_prize: convert prize → withdrawal request
-- =========================================================
CREATE OR REPLACE FUNCTION public.claim_partner_goal_prize(p_goal_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner partners%ROWTYPE;
  v_goal partner_goals%ROWTYPE;
  v_bank partner_bank_accounts%ROWTYPE;
  v_withdrawal_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não autenticado');
  END IF;

  SELECT * INTO v_partner FROM partners
   WHERE user_id = auth.uid() AND status = 'active' FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Parceiro não encontrado');
  END IF;

  SELECT * INTO v_goal FROM partner_goals
   WHERE id = p_goal_id AND partner_id = v_partner.id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Meta não encontrada');
  END IF;

  IF v_goal.status <> 'completed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Meta ainda não concluída');
  END IF;

  IF v_goal.prize_status <> 'not_claimed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Prêmio já foi resgatado');
  END IF;

  IF v_goal.prize_amount_cents <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Esta meta não possui prêmio em dinheiro');
  END IF;

  -- bank check
  SELECT * INTO v_bank FROM partner_bank_accounts WHERE partner_id = v_partner.id;
  IF NOT FOUND
     OR v_bank.pix_key IS NULL OR v_bank.bank_code IS NULL OR v_bank.bank_name IS NULL
     OR v_bank.holder_name IS NULL OR v_bank.holder_tax_id IS NULL
  THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cadastre seus dados bancários completos antes de resgatar o prêmio');
  END IF;

  -- create withdrawal flagged as goal prize via internal_notes
  INSERT INTO partner_withdrawals (
    partner_id, amount_cents, status, bank_snapshot, internal_notes
  ) VALUES (
    v_partner.id,
    v_goal.prize_amount_cents,
    'pending',
    jsonb_build_object(
      'holder_name', v_bank.holder_name, 'holder_tax_id', v_bank.holder_tax_id,
      'bank_code', v_bank.bank_code, 'bank_name', v_bank.bank_name,
      'bank_branch', v_bank.bank_branch, 'bank_account', v_bank.bank_account,
      'account_type', v_bank.account_type, 'pix_key', v_bank.pix_key,
      'pix_key_type', v_bank.pix_key_type, 'goal_prize', true,
      'goal_id', v_goal.id, 'goal_title', v_goal.title
    ),
    'Prêmio de meta concluída: ' || v_goal.title
  )
  RETURNING id INTO v_withdrawal_id;

  UPDATE partner_goals
   SET prize_status = 'requested',
       prize_withdrawal_id = v_withdrawal_id,
       prize_claimed_at = now(),
       updated_at = now()
   WHERE id = v_goal.id;

  RETURN jsonb_build_object('success', true, 'withdrawal_id', v_withdrawal_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_partner_goal_prize(UUID) TO authenticated;

-- =========================================================
-- 9. Remove direct insert RLS for partners on withdrawals
-- (forçar uso da função segura)
-- =========================================================
DROP POLICY IF EXISTS "Partners create own withdrawals" ON public.partner_withdrawals;
