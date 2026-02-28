
-- Enum para tipos de email
CREATE TYPE public.email_type AS ENUM (
  'CAMPAIGN_SCHEDULED_STARTED',
  'WEEKLY_SUMMARY',
  'NUMBER_DISCONNECTED',
  'CAMPAIGN_FAILED_TO_START',
  'ADMIN_BROADCAST'
);

-- Enum para status de email
CREATE TYPE public.email_status AS ENUM ('queued', 'sent', 'failed');

-- Tabela de logs de email
CREATE TABLE public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  to_email TEXT NOT NULL,
  email_type public.email_type NOT NULL,
  status public.email_status NOT NULL DEFAULT 'queued',
  provider_message_id TEXT,
  payload JSONB DEFAULT '{}',
  error_message TEXT,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de preferências de email
CREATE TABLE public.email_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  transactional_enabled BOOLEAN NOT NULL DEFAULT true,
  marketing_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_email_logs_user_id ON public.email_logs(user_id);
CREATE INDEX idx_email_logs_type ON public.email_logs(email_type);
CREATE INDEX idx_email_logs_idempotency ON public.email_logs(idempotency_key);
CREATE INDEX idx_email_logs_created_at ON public.email_logs(created_at DESC);

-- RLS
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_preferences ENABLE ROW LEVEL SECURITY;

-- Políticas email_logs
CREATE POLICY "Users can view own email logs"
  ON public.email_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all email logs"
  ON public.email_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can manage email logs"
  ON public.email_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Políticas email_preferences
CREATE POLICY "Users can view own preferences"
  ON public.email_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own preferences"
  ON public.email_preferences FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own preferences"
  ON public.email_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role can manage preferences"
  ON public.email_preferences FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Trigger updated_at
CREATE TRIGGER update_email_logs_updated_at
  BEFORE UPDATE ON public.email_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_preferences_updated_at
  BEFORE UPDATE ON public.email_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
