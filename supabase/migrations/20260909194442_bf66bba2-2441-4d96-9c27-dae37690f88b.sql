
-- =========================================================
-- WIIZE CENTRAL INTELLIGENCE ENGINE — Fase 1 (fundação)
-- =========================================================

-- ---------- CONFIG ----------
CREATE TABLE IF NOT EXISTS public.intel_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id UUID NOT NULL,
  weights JSONB NOT NULL DEFAULT '{
    "opportunity": {"fit":0.25,"intent":0.30,"engagement":0.15,"quality":0.10,"momentum":0.10,"pattern":0.10},
    "fit": {"niche":0.30,"region":0.20,"digital_maturity":0.25,"reputation":0.15,"contactability":0.10}
  }'::jsonb,
  thresholds JSONB NOT NULL DEFAULT '{
    "hot_opportunity": 70, "high_intent": 65, "high_fit": 65, "high_risk": 60,
    "pattern_match_high": 70, "priority": {"p0":85,"p1":72,"p2":58,"p3":40}
  }'::jsonb,
  decay JSONB NOT NULL DEFAULT '{
    "half_life_days": {"INTENT":14,"PROBLEM":30,"OBJECTION":21,"ACTION":10,"DEFAULT":21},
    "momentum_window_days": 7
  }'::jsonb,
  compound_rules JSONB NOT NULL DEFAULT '[
    {"key":"BUYING_JOURNEY","signals":["INTENT_PRICE","INTENT_AVAILABILITY","INTENT_PAYMENT"],"bonus":18},
    {"key":"PROBLEM_AWARE","signals":["PROBLEM_DETECTED","NEED_DETECTED","INTENT_PRICE"],"bonus":15},
    {"key":"DIAGNOSIS_MATCH","signals":["DIAGNOSIS_GAP","PROBLEM_DETECTED"],"bonus":12},
    {"key":"CLOSING_SIGNALS","signals":["INTENT_PROPOSAL","INTENT_PAYMENT","FAST_RESPONSE"],"bonus":20}
  ]'::jsonb,
  niche_weights JSONB NOT NULL DEFAULT '{}'::jsonb,
  region_weights JSONB NOT NULL DEFAULT '{}'::jsonb,
  ai_enabled BOOLEAN NOT NULL DEFAULT true,
  engine_version TEXT NOT NULL DEFAULT 'v1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.intel_config TO authenticated;
GRANT ALL ON public.intel_config TO service_role;
ALTER TABLE public.intel_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "intel_config owner access" ON public.intel_config
  FOR ALL TO authenticated USING (owner_user_id = auth.uid()) WITH CHECK (owner_user_id = auth.uid());

-- ---------- SIGNALS ----------
CREATE TABLE IF NOT EXISTS public.intel_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id UUID NOT NULL,
  phone_e164 TEXT NOT NULL,
  revenue_lead_id UUID,
  crm_lead_id UUID,
  signal_type TEXT NOT NULL,
  signal_group TEXT NOT NULL DEFAULT 'INTENT',
  confidence NUMERIC NOT NULL DEFAULT 1.0,
  source TEXT NOT NULL DEFAULT 'rule',
  message_id TEXT,
  content_hash TEXT,
  analyzer_version TEXT NOT NULL DEFAULT 'v1',
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_intel_signals_owner_phone ON public.intel_signals (owner_user_id, phone_e164, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_intel_signals_type ON public.intel_signals (owner_user_id, signal_type);
CREATE UNIQUE INDEX IF NOT EXISTS uq_intel_signals_msg ON public.intel_signals (owner_user_id, message_id, signal_type, analyzer_version) WHERE message_id IS NOT NULL;
GRANT SELECT ON public.intel_signals TO authenticated;
GRANT ALL ON public.intel_signals TO service_role;
ALTER TABLE public.intel_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "intel_signals owner read" ON public.intel_signals
  FOR SELECT TO authenticated USING (owner_user_id = auth.uid());

-- ---------- LEAD INTELLIGENCE PROFILE ----------
CREATE TABLE IF NOT EXISTS public.intel_lead_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id UUID NOT NULL,
  phone_e164 TEXT NOT NULL,
  revenue_lead_id UUID,
  crm_lead_id UUID,
  company_name TEXT,
  niche TEXT,
  city TEXT,
  region TEXT,
  fit_score INTEGER NOT NULL DEFAULT 0,
  engagement_score INTEGER NOT NULL DEFAULT 0,
  intent_score INTEGER NOT NULL DEFAULT 0,
  quality_score INTEGER NOT NULL DEFAULT 0,
  momentum_value INTEGER NOT NULL DEFAULT 0,
  momentum_state TEXT NOT NULL DEFAULT 'STABLE',
  risk_score INTEGER NOT NULL DEFAULT 0,
  opportunity_score INTEGER NOT NULL DEFAULT 0,
  pattern_match_score INTEGER NOT NULL DEFAULT 0,
  pattern_matched_key TEXT,
  loss_pattern_match_score INTEGER NOT NULL DEFAULT 0,
  behaviors TEXT[] NOT NULL DEFAULT '{}',
  compound_signals TEXT[] NOT NULL DEFAULT '{}',
  stage TEXT NOT NULL DEFAULT 'DISCOVERY',
  next_best_action TEXT NOT NULL DEFAULT 'QUALIFY',
  priority TEXT NOT NULL DEFAULT 'P4',
  is_hot BOOLEAN NOT NULL DEFAULT false,
  hot_reason TEXT,
  factors JSONB NOT NULL DEFAULT '[]'::jsonb,
  risk_factors JSONB NOT NULL DEFAULT '[]'::jsonb,
  diagnosis_summary TEXT,
  features JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_change JSONB NOT NULL DEFAULT '{}'::jsonb,
  engine_version TEXT NOT NULL DEFAULT 'v1',
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_user_id, phone_e164)
);
CREATE INDEX IF NOT EXISTS idx_intel_profiles_opportunity ON public.intel_lead_profiles (owner_user_id, opportunity_score DESC);
CREATE INDEX IF NOT EXISTS idx_intel_profiles_hot ON public.intel_lead_profiles (owner_user_id, is_hot, priority);
CREATE INDEX IF NOT EXISTS idx_intel_profiles_crm_lead ON public.intel_lead_profiles (crm_lead_id);
GRANT SELECT ON public.intel_lead_profiles TO authenticated;
GRANT ALL ON public.intel_lead_profiles TO service_role;
ALTER TABLE public.intel_lead_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "intel_profiles owner read" ON public.intel_lead_profiles
  FOR SELECT TO authenticated USING (owner_user_id = auth.uid());

-- ---------- PATTERNS ----------
CREATE TABLE IF NOT EXISTS public.intel_patterns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id UUID NOT NULL,
  pattern_kind TEXT NOT NULL,
  pattern_key TEXT NOT NULL,
  signature TEXT[] NOT NULL DEFAULT '{}',
  niche TEXT,
  region TEXT,
  sample_size INTEGER NOT NULL DEFAULT 0,
  outcome_count INTEGER NOT NULL DEFAULT 0,
  rate NUMERIC NOT NULL DEFAULT 0,
  avg_ticket NUMERIC,
  avg_days_to_close NUMERIC,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_user_id, pattern_kind, pattern_key)
);
CREATE INDEX IF NOT EXISTS idx_intel_patterns_owner ON public.intel_patterns (owner_user_id, pattern_kind, rate DESC);
GRANT SELECT ON public.intel_patterns TO authenticated;
GRANT ALL ON public.intel_patterns TO service_role;
ALTER TABLE public.intel_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "intel_patterns owner read" ON public.intel_patterns
  FOR SELECT TO authenticated USING (owner_user_id = auth.uid());

-- ---------- OUTCOMES (feedback loop / futuro ML) ----------
CREATE TABLE IF NOT EXISTS public.intel_outcomes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id UUID NOT NULL,
  phone_e164 TEXT,
  crm_lead_id UUID,
  revenue_lead_id UUID,
  deal_id UUID,
  outcome TEXT NOT NULL,
  ticket NUMERIC,
  days_to_close NUMERIC,
  niche TEXT,
  region TEXT,
  signature TEXT[] NOT NULL DEFAULT '{}',
  features JSONB NOT NULL DEFAULT '{}'::jsonb,
  predicted_opportunity INTEGER,
  predicted_pattern_match INTEGER,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_user_id, outcome, crm_lead_id, deal_id)
);
CREATE INDEX IF NOT EXISTS idx_intel_outcomes_owner ON public.intel_outcomes (owner_user_id, outcome, occurred_at DESC);
GRANT SELECT ON public.intel_outcomes TO authenticated;
GRANT ALL ON public.intel_outcomes TO service_role;
ALTER TABLE public.intel_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "intel_outcomes owner read" ON public.intel_outcomes
  FOR SELECT TO authenticated USING (owner_user_id = auth.uid());

-- ---------- AUDIT ----------
CREATE TABLE IF NOT EXISTS public.intel_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id UUID NOT NULL,
  phone_e164 TEXT,
  dimension TEXT NOT NULL,
  score_before NUMERIC,
  score_after NUMERIC,
  reason TEXT,
  rule_key TEXT,
  signal_source TEXT,
  confidence NUMERIC,
  engine_version TEXT NOT NULL DEFAULT 'v1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_intel_audit_owner ON public.intel_audit (owner_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_intel_audit_phone ON public.intel_audit (owner_user_id, phone_e164, created_at DESC);
GRANT SELECT ON public.intel_audit TO authenticated;
GRANT ALL ON public.intel_audit TO service_role;
ALTER TABLE public.intel_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "intel_audit owner read" ON public.intel_audit
  FOR SELECT TO authenticated USING (owner_user_id = auth.uid());

-- ---------- updated_at trigger ----------
CREATE OR REPLACE FUNCTION public.intel_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_intel_config_updated ON public.intel_config;
CREATE TRIGGER trg_intel_config_updated BEFORE UPDATE ON public.intel_config
  FOR EACH ROW EXECUTE FUNCTION public.intel_touch_updated_at();
DROP TRIGGER IF EXISTS trg_intel_profiles_updated ON public.intel_lead_profiles;
CREATE TRIGGER trg_intel_profiles_updated BEFORE UPDATE ON public.intel_lead_profiles
  FOR EACH ROW EXECUTE FUNCTION public.intel_touch_updated_at();
DROP TRIGGER IF EXISTS trg_intel_patterns_updated ON public.intel_patterns;
CREATE TRIGGER trg_intel_patterns_updated BEFORE UPDATE ON public.intel_patterns
  FOR EACH ROW EXECUTE FUNCTION public.intel_touch_updated_at();

-- ---------- Vínculo empresa prospectada <-> lead de conversa ----------
ALTER TABLE public.revenue_leads ADD COLUMN IF NOT EXISTS crm_lead_id UUID;
CREATE INDEX IF NOT EXISTS idx_revenue_leads_crm_lead ON public.revenue_leads (crm_lead_id);
