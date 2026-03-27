
CREATE TABLE public.meta_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES public.user_waba_connections(id) ON DELETE SET NULL,
  campaign_name TEXT NOT NULL,
  template_name TEXT NOT NULL,
  template_language TEXT NOT NULL DEFAULT 'pt_BR',
  total_recipients INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed',
  error_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.meta_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own meta campaigns"
  ON public.meta_campaigns FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own meta campaigns"
  ON public.meta_campaigns FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role full access meta campaigns"
  ON public.meta_campaigns FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
