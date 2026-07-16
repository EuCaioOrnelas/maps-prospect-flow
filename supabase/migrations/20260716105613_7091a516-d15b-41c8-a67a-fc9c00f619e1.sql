
CREATE TABLE public.integration_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid,
  client_id text,
  user_id uuid,
  company_id uuid,
  endpoint text NOT NULL,
  version text NOT NULL DEFAULT 'v1',
  modules text[] DEFAULT '{}',
  filters jsonb DEFAULT '{}'::jsonb,
  status_code int NOT NULL,
  success boolean NOT NULL DEFAULT false,
  error_code text,
  error_message text,
  processing_time_ms int,
  records_returned int,
  ip inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.integration_audit_log TO authenticated;
GRANT ALL ON public.integration_audit_log TO service_role;

ALTER TABLE public.integration_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs (uses existing has_role function pattern)
CREATE POLICY "Admins can read integration audit log"
ON public.integration_audit_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Only service_role writes; no INSERT policy for authenticated (edge function uses service key)

CREATE INDEX idx_integration_audit_created_at ON public.integration_audit_log (created_at DESC);
CREATE INDEX idx_integration_audit_user ON public.integration_audit_log (user_id, created_at DESC);
CREATE INDEX idx_integration_audit_client ON public.integration_audit_log (client_id, created_at DESC);
CREATE INDEX idx_integration_audit_request ON public.integration_audit_log (request_id);
