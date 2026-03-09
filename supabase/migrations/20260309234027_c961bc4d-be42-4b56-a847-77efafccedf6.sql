
-- Score Rules table (configurable rules)
CREATE TABLE public.score_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL UNIQUE,
  category text NOT NULL, -- activation, engagement, value, purchase_intent, churn_risk
  points integer NOT NULL DEFAULT 0,
  is_negative boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  apply_decay boolean NOT NULL DEFAULT true,
  max_applications_per_period integer DEFAULT NULL,
  period_type text DEFAULT NULL, -- day, week, month
  description text DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- User Scores table (main score per user)
CREATE TABLE public.user_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activation_score numeric NOT NULL DEFAULT 0,
  engagement_score numeric NOT NULL DEFAULT 0,
  value_score numeric NOT NULL DEFAULT 0,
  purchase_intent_score numeric NOT NULL DEFAULT 0,
  churn_risk_score numeric NOT NULL DEFAULT 0,
  raw_score numeric NOT NULL DEFAULT 0,
  normalized_score numeric NOT NULL DEFAULT 0,
  total_score numeric NOT NULL DEFAULT 0,
  score_label text NOT NULL DEFAULT 'Frio',
  score_band text NOT NULL DEFAULT '0-20',
  last_event_at timestamptz DEFAULT NULL,
  last_calculated_at timestamptz DEFAULT now(),
  score_version integer NOT NULL DEFAULT 1,
  previous_score numeric NOT NULL DEFAULT 0,
  trend text NOT NULL DEFAULT 'stable', -- rising, stable, falling
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- User Score Events table (individual events)
CREATE TABLE public.user_score_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_name text NOT NULL,
  event_category text NOT NULL,
  base_points integer NOT NULL DEFAULT 0,
  decay_multiplier numeric NOT NULL DEFAULT 1.0,
  adjusted_points numeric NOT NULL DEFAULT 0,
  event_occurred_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}',
  source text DEFAULT 'system',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- User Score History table (snapshots)
CREATE TABLE public.user_score_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  previous_score numeric NOT NULL DEFAULT 0,
  new_score numeric NOT NULL DEFAULT 0,
  variation numeric NOT NULL DEFAULT 0,
  reason text DEFAULT NULL,
  snapshot jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Score Decay Config table
CREATE TABLE public.score_decay_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  min_days integer NOT NULL DEFAULT 0,
  max_days integer NOT NULL DEFAULT 3,
  multiplier numeric NOT NULL DEFAULT 1.0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_user_scores_user_id ON public.user_scores(user_id);
CREATE INDEX idx_user_scores_total_score ON public.user_scores(total_score DESC);
CREATE INDEX idx_user_scores_score_label ON public.user_scores(score_label);
CREATE INDEX idx_user_score_events_user_id ON public.user_score_events(user_id);
CREATE INDEX idx_user_score_events_event_name ON public.user_score_events(event_name);
CREATE INDEX idx_user_score_events_occurred ON public.user_score_events(event_occurred_at DESC);
CREATE INDEX idx_user_score_history_user_id ON public.user_score_history(user_id);
CREATE INDEX idx_user_score_history_created ON public.user_score_history(created_at DESC);

-- Enable RLS
ALTER TABLE public.score_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_score_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_score_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.score_decay_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies (admin only for all tables)
CREATE POLICY "Admins can manage score_rules" ON public.score_rules FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage user_scores" ON public.user_scores FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage user_score_events" ON public.user_score_events FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage user_score_history" ON public.user_score_history FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage score_decay_config" ON public.score_decay_config FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Users can read their own score
CREATE POLICY "Users can read own score" ON public.user_scores FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Updated_at trigger
CREATE TRIGGER update_score_rules_updated_at BEFORE UPDATE ON public.score_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_scores_updated_at BEFORE UPDATE ON public.user_scores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_score_decay_config_updated_at BEFORE UPDATE ON public.score_decay_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
