CREATE TABLE IF NOT EXISTS public.influencer_ai_approaches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES public.influencer_prospects(id) ON DELETE CASCADE,
  admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  channel text,
  subject text NOT NULL,
  message text NOT NULL,
  analysis jsonb NOT NULL DEFAULT '{}'::jsonb,
  research jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'rascunho',
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_infl_ai_approaches_prospect ON public.influencer_ai_approaches(prospect_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.influencer_ai_approaches TO authenticated;
GRANT ALL ON public.influencer_ai_approaches TO service_role;

ALTER TABLE public.influencer_ai_approaches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage ai approaches" ON public.influencer_ai_approaches;
CREATE POLICY "Admins manage ai approaches" ON public.influencer_ai_approaches
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));