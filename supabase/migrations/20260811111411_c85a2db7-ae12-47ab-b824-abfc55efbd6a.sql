CREATE TABLE IF NOT EXISTS public.crm_renewal_settings (
  owner_user_id uuid PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  logo_url text,
  header_color text NOT NULL DEFAULT '#3daa57',
  button_color text NOT NULL DEFAULT '#3daa57',
  sender_name text NOT NULL DEFAULT 'Wiize',
  sender_local_part text NOT NULL DEFAULT 'renovacao',
  email_title text NOT NULL DEFAULT 'Seu contrato está próximo do vencimento',
  email_intro text NOT NULL DEFAULT 'Identificamos que o contrato abaixo está próximo do vencimento. Entre em contato para tratar da renovação.',
  cta_label text NOT NULL DEFAULT 'Ver contrato no CRM',
  notice_days_4_6_months integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_renewal_settings TO authenticated;
GRANT ALL ON public.crm_renewal_settings TO service_role;
ALTER TABLE public.crm_renewal_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Account can view renewal settings" ON public.crm_renewal_settings;
CREATE POLICY "Account can view renewal settings"
ON public.crm_renewal_settings FOR SELECT TO authenticated
USING (owner_user_id = public.current_account_owner());

DROP POLICY IF EXISTS "Account can insert renewal settings" ON public.crm_renewal_settings;
CREATE POLICY "Account can insert renewal settings"
ON public.crm_renewal_settings FOR INSERT TO authenticated
WITH CHECK (owner_user_id = public.current_account_owner());

DROP POLICY IF EXISTS "Account can update renewal settings" ON public.crm_renewal_settings;
CREATE POLICY "Account can update renewal settings"
ON public.crm_renewal_settings FOR UPDATE TO authenticated
USING (owner_user_id = public.current_account_owner())
WITH CHECK (owner_user_id = public.current_account_owner());

DROP TRIGGER IF EXISTS trg_crm_renewal_settings_updated ON public.crm_renewal_settings;
CREATE TRIGGER trg_crm_renewal_settings_updated
BEFORE UPDATE ON public.crm_renewal_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.crm_renewal_notice_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  deal_id uuid REFERENCES public.lead_deals(id) ON DELETE CASCADE,
  lead_id uuid,
  notice_type text NOT NULL,
  recipient_email text,
  recipient_role text,
  status text NOT NULL DEFAULT 'sent',
  error_message text,
  provider_message_id text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.crm_renewal_notice_logs TO authenticated;
GRANT ALL ON public.crm_renewal_notice_logs TO service_role;
ALTER TABLE public.crm_renewal_notice_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Account can view renewal notice logs" ON public.crm_renewal_notice_logs;
CREATE POLICY "Account can view renewal notice logs"
ON public.crm_renewal_notice_logs FOR SELECT TO authenticated
USING (owner_user_id = public.current_account_owner());

CREATE INDEX IF NOT EXISTS idx_crm_renewal_logs_owner ON public.crm_renewal_notice_logs(owner_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_renewal_logs_deal ON public.crm_renewal_notice_logs(deal_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_crm_renewal_notice_once
ON public.crm_renewal_notice_logs(deal_id, notice_type, recipient_email)
WHERE notice_type <> 'test' AND status = 'sent';

ALTER TABLE public.lead_deals
  ADD COLUMN IF NOT EXISTS notice_30d_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS notice_15d_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS notice_7d_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS renewed_from_deal_id uuid REFERENCES public.lead_deals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS renewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS renewal_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_lead_deals_renewed_from ON public.lead_deals(renewed_from_deal_id);
CREATE INDEX IF NOT EXISTS idx_lead_deals_expiration_status ON public.lead_deals(status, expiration_date);