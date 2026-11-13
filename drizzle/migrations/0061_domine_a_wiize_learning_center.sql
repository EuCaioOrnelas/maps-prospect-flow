CREATE TABLE IF NOT EXISTS public.learning_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  cover_path text,
  display_order integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.learning_modules TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_modules TO authenticated;
GRANT ALL ON public.learning_modules TO service_role;

ALTER TABLE public.learning_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public reads published learning modules"
  ON public.learning_modules FOR SELECT TO anon, authenticated
  USING (is_published OR public.is_current_user_admin());

CREATE POLICY "Admins manage learning modules"
  ON public.learning_modules FOR ALL TO authenticated
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

CREATE TABLE IF NOT EXISTS public.learning_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.learning_modules(id) ON DELETE CASCADE,
  slug text NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  youtube_url text NOT NULL,
  youtube_video_id text NOT NULL,
  thumbnail_path text,
  duration_seconds integer,
  display_order integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT learning_lessons_module_slug_key UNIQUE (module_id, slug),
  CONSTRAINT learning_lessons_duration_positive CHECK (duration_seconds IS NULL OR duration_seconds >= 0)
);

GRANT SELECT ON public.learning_lessons TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_lessons TO authenticated;
GRANT ALL ON public.learning_lessons TO service_role;

ALTER TABLE public.learning_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public reads published learning lessons"
  ON public.learning_lessons FOR SELECT TO anon, authenticated
  USING (
    public.is_current_user_admin()
    OR (
      is_published
      AND EXISTS (
        SELECT 1 FROM public.learning_modules m
        WHERE m.id = module_id AND m.is_published
      )
    )
  );

CREATE POLICY "Admins manage learning lessons"
  ON public.learning_lessons FOR ALL TO authenticated
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

CREATE INDEX IF NOT EXISTS learning_modules_order_idx ON public.learning_modules (display_order, created_at);
CREATE INDEX IF NOT EXISTS learning_lessons_module_order_idx ON public.learning_lessons (module_id, display_order, created_at);

DROP TRIGGER IF EXISTS learning_modules_updated_at ON public.learning_modules;
CREATE TRIGGER learning_modules_updated_at
  BEFORE UPDATE ON public.learning_modules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS learning_lessons_updated_at ON public.learning_lessons;
CREATE TRIGGER learning_lessons_updated_at
  BEFORE UPDATE ON public.learning_lessons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP POLICY IF EXISTS "Learning media public read" ON storage.objects;
CREATE POLICY "Learning media public read"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'learning-media');

DROP POLICY IF EXISTS "Learning media admin insert" ON storage.objects;
CREATE POLICY "Learning media admin insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'learning-media' AND public.is_current_user_admin());

DROP POLICY IF EXISTS "Learning media admin update" ON storage.objects;
CREATE POLICY "Learning media admin update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'learning-media' AND public.is_current_user_admin())
  WITH CHECK (bucket_id = 'learning-media' AND public.is_current_user_admin());

DROP POLICY IF EXISTS "Learning media admin delete" ON storage.objects;
CREATE POLICY "Learning media admin delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'learning-media' AND public.is_current_user_admin());