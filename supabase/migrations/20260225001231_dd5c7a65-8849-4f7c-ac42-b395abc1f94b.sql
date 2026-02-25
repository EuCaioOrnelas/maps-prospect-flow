
-- 1. Score Logs - registrar cada alteração de score
CREATE TABLE public.revenue_score_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.revenue_leads(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.revenue_events(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  points_applied INTEGER NOT NULL DEFAULT 0,
  score_before INTEGER NOT NULL DEFAULT 0,
  score_after INTEGER NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'engagement',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_revenue_score_logs_lead ON public.revenue_score_logs(lead_id, created_at DESC);
CREATE INDEX idx_revenue_score_logs_user ON public.revenue_score_logs(user_id);

ALTER TABLE public.revenue_score_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage score logs"
  ON public.revenue_score_logs FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2. Score Snapshots - para gráfico de evolução
CREATE TABLE public.revenue_score_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.revenue_leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  score_value INTEGER NOT NULL DEFAULT 0,
  status_bucket TEXT NOT NULL DEFAULT 'COLD',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(lead_id, snapshot_date)
);

CREATE INDEX idx_revenue_score_snapshots_lead ON public.revenue_score_snapshots(lead_id, snapshot_date DESC);
CREATE INDEX idx_revenue_score_snapshots_user ON public.revenue_score_snapshots(user_id);

ALTER TABLE public.revenue_score_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage score snapshots"
  ON public.revenue_score_snapshots FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
