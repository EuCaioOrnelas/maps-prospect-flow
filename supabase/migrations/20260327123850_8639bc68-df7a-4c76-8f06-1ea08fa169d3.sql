CREATE TABLE public.user_waba_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  waba_id text NOT NULL,
  phone_number_id text,
  display_phone_number text,
  business_name text,
  access_token text NOT NULL,
  token_expires_at timestamptz,
  status text NOT NULL DEFAULT 'active',
  raw_signup_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, waba_id)
);

ALTER TABLE public.user_waba_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own waba connections"
  ON public.user_waba_connections FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own waba connections"
  ON public.user_waba_connections FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own waba connections"
  ON public.user_waba_connections FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all waba connections"
  ON public.user_waba_connections FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role full access on waba connections"
  ON public.user_waba_connections FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER update_user_waba_connections_updated_at
  BEFORE UPDATE ON public.user_waba_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();