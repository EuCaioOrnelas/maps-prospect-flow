
CREATE TABLE public.cancellation_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email TEXT,
  cancellation_reason TEXT NOT NULL,
  usage_level TEXT,
  additional_comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cancellation_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own feedback"
ON public.cancellation_feedback
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all feedback"
ON public.cancellation_feedback
FOR SELECT
TO authenticated
USING (public.is_current_user_admin());

CREATE POLICY "Allow anonymous insert"
ON public.cancellation_feedback
FOR INSERT
TO anon
WITH CHECK (true);
