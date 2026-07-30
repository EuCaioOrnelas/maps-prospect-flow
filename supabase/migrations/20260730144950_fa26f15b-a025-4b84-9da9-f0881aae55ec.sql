CREATE TABLE IF NOT EXISTS public.suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  account_owner_id uuid,
  company_name text,
  user_name text,
  user_email text,
  category text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  importance text NOT NULL,
  status text NOT NULL DEFAULT 'recebida',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.suggestions TO authenticated;
GRANT ALL ON public.suggestions TO service_role;

ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create their own suggestions" ON public.suggestions;
CREATE POLICY "Users can create their own suggestions"
ON public.suggestions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own suggestions" ON public.suggestions;
CREATE POLICY "Users can view their own suggestions"
ON public.suggestions FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update suggestions" ON public.suggestions;
CREATE POLICY "Admins can update suggestions"
ON public.suggestions FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete suggestions" ON public.suggestions;
CREATE POLICY "Admins can delete suggestions"
ON public.suggestions FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_suggestions_created_at ON public.suggestions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_suggestions_category ON public.suggestions (category);
CREATE INDEX IF NOT EXISTS idx_suggestions_status ON public.suggestions (status);

CREATE TRIGGER update_suggestions_updated_at
BEFORE UPDATE ON public.suggestions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();