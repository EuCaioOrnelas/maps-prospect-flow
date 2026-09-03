CREATE TABLE IF NOT EXISTS public.wiize_api_profiles (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  company_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  doc_type TEXT NOT NULL DEFAULT 'cnpj',
  doc_number TEXT,
  postal_code TEXT,
  street TEXT,
  street_number TEXT,
  complement TEXT,
  neighborhood TEXT,
  city TEXT,
  state TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wiize_api_profiles TO authenticated;
GRANT ALL ON public.wiize_api_profiles TO service_role;

ALTER TABLE public.wiize_api_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wiize_api_profiles_own" ON public.wiize_api_profiles;
CREATE POLICY "wiize_api_profiles_own"
  ON public.wiize_api_profiles FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_wiize_api_profiles_updated_at ON public.wiize_api_profiles;
CREATE TRIGGER update_wiize_api_profiles_updated_at
  BEFORE UPDATE ON public.wiize_api_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();