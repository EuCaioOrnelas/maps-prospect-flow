CREATE TABLE IF NOT EXISTS public.wiize_api_notification_prefs (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  low_balance boolean NOT NULL DEFAULT true,
  request_errors boolean NOT NULL DEFAULT true,
  monthly_report boolean NOT NULL DEFAULT false,
  low_balance_threshold numeric NOT NULL DEFAULT 30,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wiize_api_notification_prefs TO authenticated;
GRANT ALL ON public.wiize_api_notification_prefs TO service_role;

ALTER TABLE public.wiize_api_notification_prefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wiize_api_notification_prefs_own" ON public.wiize_api_notification_prefs;
CREATE POLICY "wiize_api_notification_prefs_own"
  ON public.wiize_api_notification_prefs FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_wiize_api_notification_prefs_updated_at ON public.wiize_api_notification_prefs;
CREATE TRIGGER update_wiize_api_notification_prefs_updated_at
  BEFORE UPDATE ON public.wiize_api_notification_prefs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();