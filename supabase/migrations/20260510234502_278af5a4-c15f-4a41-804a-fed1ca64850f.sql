CREATE TABLE IF NOT EXISTS public.frontend_errors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NULL,
  session_id TEXT NULL,
  message TEXT NOT NULL,
  source_file TEXT NULL,
  line_no INT NULL,
  col_no INT NULL,
  stack TEXT NULL,
  route TEXT NULL,
  user_agent TEXT NULL,
  app_version TEXT NULL,
  severity TEXT NOT NULL DEFAULT 'error',
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_frontend_errors_user_created
  ON public.frontend_errors (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_frontend_errors_created
  ON public.frontend_errors (created_at DESC);

ALTER TABLE public.frontend_errors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone can insert frontend errors" ON public.frontend_errors;
CREATE POLICY "anyone can insert frontend errors"
  ON public.frontend_errors FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "users see their own frontend errors" ON public.frontend_errors;
CREATE POLICY "users see their own frontend errors"
  ON public.frontend_errors FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());