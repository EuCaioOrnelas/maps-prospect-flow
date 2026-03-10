
CREATE TABLE public.user_dismissed_popups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  popup_key text NOT NULL,
  dismissed_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, popup_key)
);

ALTER TABLE public.user_dismissed_popups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own dismissed popups"
  ON public.user_dismissed_popups FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own dismissed popups"
  ON public.user_dismissed_popups FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
