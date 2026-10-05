CREATE TABLE IF NOT EXISTS public.prospecting_search_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  source text NOT NULL CHECK (source IN ('maps','web')),
  niche_key text NOT NULL,
  location_key text NOT NULL DEFAULT '',
  niche text,
  location text,
  created_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_user_id, source, niche_key, location_key)
);
GRANT SELECT ON public.prospecting_search_locks TO authenticated;
GRANT ALL ON public.prospecting_search_locks TO service_role;
ALTER TABLE public.prospecting_search_locks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Account reads own search locks" ON public.prospecting_search_locks;
CREATE POLICY "Account reads own search locks" ON public.prospecting_search_locks
  FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid() OR owner_user_id = (SELECT parent_owner_id FROM public.profiles WHERE id = auth.uid()));