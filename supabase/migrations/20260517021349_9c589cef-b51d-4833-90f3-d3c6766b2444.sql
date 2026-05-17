CREATE TABLE IF NOT EXISTS public.meta_user_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  notify_number_disconnected BOOLEAN NOT NULL DEFAULT true,
  notify_quality_drop BOOLEAN NOT NULL DEFAULT true,
  notify_daily_summary BOOLEAN NOT NULL DEFAULT false,
  notify_campaign_issues BOOLEAN NOT NULL DEFAULT true,
  security_hmac_required BOOLEAN NOT NULL DEFAULT true,
  security_ip_allowlist BOOLEAN NOT NULL DEFAULT true,
  security_audit_log BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.meta_user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own meta settings" ON public.meta_user_settings
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own meta settings" ON public.meta_user_settings
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own meta settings" ON public.meta_user_settings
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER update_meta_user_settings_updated_at
  BEFORE UPDATE ON public.meta_user_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();