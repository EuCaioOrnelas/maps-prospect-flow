
-- ==========================================
-- WIIZE REVENUE - Database Schema
-- ==========================================

-- Enums
CREATE TYPE public.revenue_status_bucket AS ENUM ('COLD', 'ENGAGED', 'HOT', 'VERY_HOT');
CREATE TYPE public.revenue_risk_state AS ENUM ('OK', 'COOLING', 'AT_RISK');

-- ==========================================
-- 1. revenue_settings (per-user config)
-- ==========================================
CREATE TABLE public.revenue_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  default_ticket_value NUMERIC NOT NULL DEFAULT 3000,
  default_close_rate_cold NUMERIC NOT NULL DEFAULT 0.05,
  default_close_rate_engaged NUMERIC NOT NULL DEFAULT 0.15,
  default_close_rate_hot NUMERIC NOT NULL DEFAULT 0.35,
  default_close_rate_very_hot NUMERIC NOT NULL DEFAULT 0.55,
  sla_first_response_minutes INTEGER NOT NULL DEFAULT 5,
  risk_no_reply_hours INTEGER NOT NULL DEFAULT 24,
  cooldown_decay_per_day NUMERIC NOT NULL DEFAULT 0.06,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.revenue_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage revenue settings"
  ON public.revenue_settings FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_revenue_settings_updated_at
  BEFORE UPDATE ON public.revenue_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================
-- 2. revenue_score_rules (scoring config)
-- ==========================================
CREATE TABLE public.revenue_score_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  rule_key TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  cooldown_minutes INTEGER DEFAULT NULL,
  max_per_day INTEGER DEFAULT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, rule_key)
);

ALTER TABLE public.revenue_score_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage score rules"
  ON public.revenue_score_rules FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_revenue_score_rules_updated_at
  BEFORE UPDATE ON public.revenue_score_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================
-- 3. revenue_leads
-- ==========================================
CREATE TABLE public.revenue_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  phone_e164 TEXT NOT NULL,
  name TEXT,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status_bucket revenue_status_bucket NOT NULL DEFAULT 'COLD',
  score_total INTEGER NOT NULL DEFAULT 0,
  score_last_calc_at TIMESTAMPTZ DEFAULT now(),
  assigned_to_user_id UUID,
  source_number_instance_id UUID REFERENCES public.whatsapp_numbers(id),
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  risk_state revenue_risk_state NOT NULL DEFAULT 'OK',
  risk_reason TEXT,
  estimated_ticket_value NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_revenue_leads_user_phone ON public.revenue_leads(user_id, phone_e164);
CREATE INDEX idx_revenue_leads_activity ON public.revenue_leads(user_id, last_activity_at DESC);
CREATE INDEX idx_revenue_leads_score ON public.revenue_leads(user_id, score_total DESC);
CREATE INDEX idx_revenue_leads_bucket ON public.revenue_leads(user_id, status_bucket);
CREATE INDEX idx_revenue_leads_risk ON public.revenue_leads(user_id, risk_state);

ALTER TABLE public.revenue_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage revenue leads"
  ON public.revenue_leads FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_revenue_leads_updated_at
  BEFORE UPDATE ON public.revenue_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================
-- 4. revenue_events
-- ==========================================
CREATE TABLE public.revenue_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lead_id UUID NOT NULL REFERENCES public.revenue_leads(id) ON DELETE CASCADE,
  number_instance_id UUID REFERENCES public.whatsapp_numbers(id),
  event_type TEXT NOT NULL,
  event_value INTEGER DEFAULT 0,
  event_meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_revenue_events_lead ON public.revenue_events(user_id, lead_id, created_at DESC);
CREATE INDEX idx_revenue_events_number ON public.revenue_events(user_id, number_instance_id, created_at DESC);
CREATE INDEX idx_revenue_events_type ON public.revenue_events(event_type, created_at DESC);

ALTER TABLE public.revenue_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage revenue events"
  ON public.revenue_events FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ==========================================
-- 5. revenue_conversations
-- ==========================================
CREATE TABLE public.revenue_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lead_id UUID NOT NULL REFERENCES public.revenue_leads(id) ON DELETE CASCADE,
  number_instance_id UUID REFERENCES public.whatsapp_numbers(id),
  last_inbound_at TIMESTAMPTZ,
  last_outbound_at TIMESTAMPTZ,
  inbound_count_7d INTEGER NOT NULL DEFAULT 0,
  outbound_count_7d INTEGER NOT NULL DEFAULT 0,
  avg_response_time_seconds INTEGER DEFAULT 0,
  unreplied_inbound_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, lead_id, number_instance_id)
);

ALTER TABLE public.revenue_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage revenue conversations"
  ON public.revenue_conversations FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_revenue_conversations_updated_at
  BEFORE UPDATE ON public.revenue_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================
-- Function to seed default score rules for a user
-- ==========================================
CREATE OR REPLACE FUNCTION public.seed_revenue_score_rules(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.revenue_score_rules (user_id, rule_key, points, cooldown_minutes, max_per_day) VALUES
    (p_user_id, 'INBOUND_MESSAGE', 12, 2, 30),
    (p_user_id, 'INBOUND_STREAK_3', 25, NULL, 1),
    (p_user_id, 'INBOUND_AFTER_24H_SILENCE', 30, NULL, NULL),
    (p_user_id, 'INBOUND_AFTER_7D_SILENCE', 60, NULL, NULL),
    (p_user_id, 'OUTBOUND_REPLY_RECEIVED_WITHIN_1H', 18, NULL, NULL),
    (p_user_id, 'INTENT_PRICE', 80, NULL, NULL),
    (p_user_id, 'INTENT_BUY_NOW', 140, NULL, NULL),
    (p_user_id, 'INTENT_AVAILABILITY', 70, NULL, NULL),
    (p_user_id, 'INTENT_PAYMENT', 90, NULL, NULL),
    (p_user_id, 'INTENT_PROPOSAL', 100, NULL, NULL),
    (p_user_id, 'INTENT_URGENT', 60, NULL, NULL),
    (p_user_id, 'INTENT_OBJECTION', -50, NULL, NULL),
    (p_user_id, 'INTENT_NEGATIVE', -200, NULL, NULL),
    (p_user_id, 'LINK_CLICK', 35, NULL, NULL),
    (p_user_id, 'FORM_SUBMIT', 90, NULL, NULL),
    (p_user_id, 'CALL_REQUEST', 110, NULL, NULL),
    (p_user_id, 'SLA_FIRST_RESPONSE_UNDER_5MIN', 40, NULL, NULL),
    (p_user_id, 'SLA_FIRST_RESPONSE_5_TO_30MIN', 15, NULL, NULL),
    (p_user_id, 'SLA_FIRST_RESPONSE_OVER_30MIN', -40, NULL, NULL),
    (p_user_id, 'UNREPLIED_INBOUND_OVER_2H', -60, NULL, NULL),
    (p_user_id, 'UNREPLIED_INBOUND_OVER_24H', -140, NULL, NULL),
    (p_user_id, 'CONVERSATION_ACTIVE_3D', 55, NULL, 1),
    (p_user_id, 'CONVERSATION_ACTIVE_5D', 95, NULL, 1),
    (p_user_id, 'BACK_AND_FORTH_5_TURNS', 70, NULL, 1)
  ON CONFLICT (user_id, rule_key) DO NOTHING;
END;
$$;

-- ==========================================
-- Function to calculate score bucket
-- ==========================================
CREATE OR REPLACE FUNCTION public.revenue_score_to_bucket(p_score INTEGER)
RETURNS revenue_status_bucket
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_score >= 650 THEN 'VERY_HOT'::revenue_status_bucket
    WHEN p_score >= 350 THEN 'HOT'::revenue_status_bucket
    WHEN p_score >= 150 THEN 'ENGAGED'::revenue_status_bucket
    ELSE 'COLD'::revenue_status_bucket
  END;
$$;
