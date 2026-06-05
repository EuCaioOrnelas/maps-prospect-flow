
CREATE TABLE IF NOT EXISTS public.blog_post_attributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event text NOT NULL CHECK (event IN ('cta_click','trial_started','purchased')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS blog_post_attributions_post_event_idx ON public.blog_post_attributions(post_id, event);
CREATE INDEX IF NOT EXISTS blog_post_attributions_session_idx ON public.blog_post_attributions(session_id);

GRANT SELECT, INSERT ON public.blog_post_attributions TO anon;
GRANT SELECT, INSERT ON public.blog_post_attributions TO authenticated;
GRANT ALL ON public.blog_post_attributions TO service_role;

ALTER TABLE public.blog_post_attributions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone can insert blog attribution" ON public.blog_post_attributions;
CREATE POLICY "anyone can insert blog attribution"
  ON public.blog_post_attributions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "admins read blog attribution" ON public.blog_post_attributions;
CREATE POLICY "admins read blog attribution"
  ON public.blog_post_attributions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
