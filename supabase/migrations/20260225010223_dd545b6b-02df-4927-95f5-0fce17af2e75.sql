
-- Tabela de alertas de anomalias
CREATE TABLE public.revenue_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  alert_type TEXT NOT NULL,
  alert_message TEXT NOT NULL,
  alert_severity TEXT NOT NULL DEFAULT 'warning',
  metric_name TEXT NOT NULL,
  current_value NUMERIC NOT NULL DEFAULT 0,
  previous_value NUMERIC NOT NULL DEFAULT 0,
  variation_pct NUMERIC NOT NULL DEFAULT 0,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.revenue_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage revenue alerts"
ON public.revenue_alerts
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_revenue_alerts_user_created ON public.revenue_alerts (user_id, created_at DESC);
CREATE INDEX idx_revenue_alerts_unread ON public.revenue_alerts (user_id, is_read) WHERE is_read = false;
