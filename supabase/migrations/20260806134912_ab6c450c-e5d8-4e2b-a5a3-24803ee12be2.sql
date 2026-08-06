CREATE TABLE IF NOT EXISTS public.user_metric_state (
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  metric_key TEXT NOT NULL,
  has_data BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, metric_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_metric_state TO authenticated;
GRANT ALL ON public.user_metric_state TO service_role;

ALTER TABLE public.user_metric_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own metric state" ON public.user_metric_state;
CREATE POLICY "Users manage own metric state"
  ON public.user_metric_state FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);