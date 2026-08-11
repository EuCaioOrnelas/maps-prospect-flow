CREATE TABLE IF NOT EXISTS public.crm_appointment_email_settings (
  owner_user_id uuid PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT true,
  logo_url text,
  header_color text NOT NULL DEFAULT '#3daa57',
  button_color text NOT NULL DEFAULT '#3daa57',
  sender_name text NOT NULL DEFAULT 'Wiize',
  sender_local_part text NOT NULL DEFAULT 'agenda',
  email_title text NOT NULL DEFAULT 'Lembrete de compromisso — {{titulo_compromisso}}',
  email_body text NOT NULL DEFAULT '',
  cta_label text NOT NULL DEFAULT 'Ver compromisso',
  notify_client boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_appointment_email_settings TO authenticated;
GRANT ALL ON public.crm_appointment_email_settings TO service_role;
ALTER TABLE public.crm_appointment_email_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Account can view appointment email settings" ON public.crm_appointment_email_settings;
CREATE POLICY "Account can view appointment email settings"
ON public.crm_appointment_email_settings FOR SELECT TO authenticated
USING (owner_user_id = public.current_account_owner());

DROP POLICY IF EXISTS "Account can insert appointment email settings" ON public.crm_appointment_email_settings;
CREATE POLICY "Account can insert appointment email settings"
ON public.crm_appointment_email_settings FOR INSERT TO authenticated
WITH CHECK (owner_user_id = public.current_account_owner());

DROP POLICY IF EXISTS "Account can update appointment email settings" ON public.crm_appointment_email_settings;
CREATE POLICY "Account can update appointment email settings"
ON public.crm_appointment_email_settings FOR UPDATE TO authenticated
USING (owner_user_id = public.current_account_owner())
WITH CHECK (owner_user_id = public.current_account_owner());

DROP TRIGGER IF EXISTS trg_crm_appointment_email_settings_updated ON public.crm_appointment_email_settings;
CREATE TRIGGER trg_crm_appointment_email_settings_updated
BEFORE UPDATE ON public.crm_appointment_email_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.calendar_email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  event_id uuid,
  user_id uuid,
  email_type text NOT NULL DEFAULT 'appointment',
  reminder_key text NOT NULL DEFAULT 'default',
  recipient_email text,
  recipient_role text,
  scheduled_for timestamptz,
  status text NOT NULL DEFAULT 'sent',
  error_message text,
  provider_message_id text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.calendar_email_logs TO authenticated;
GRANT ALL ON public.calendar_email_logs TO service_role;
ALTER TABLE public.calendar_email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Account can view calendar email logs" ON public.calendar_email_logs;
CREATE POLICY "Account can view calendar email logs"
ON public.calendar_email_logs FOR SELECT TO authenticated
USING (owner_user_id = public.current_account_owner());

CREATE INDEX IF NOT EXISTS idx_calendar_email_logs_owner ON public.calendar_email_logs(owner_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calendar_email_logs_event ON public.calendar_email_logs(event_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_calendar_email_once
ON public.calendar_email_logs(event_id, reminder_key, recipient_email)
WHERE reminder_key <> 'test' AND status = 'sent';