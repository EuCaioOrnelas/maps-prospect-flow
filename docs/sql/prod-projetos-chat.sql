CREATE TABLE IF NOT EXISTS public.project_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  content text NOT NULL CHECK (length(btrim(content)) BETWEEN 1 AND 4000),
  reply_to_id uuid REFERENCES public.project_comments(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_project_comments_project ON public.project_comments(project_id, created_at);

GRANT SELECT, INSERT, DELETE ON public.project_comments TO authenticated;
GRANT ALL ON public.project_comments TO service_role;
ALTER TABLE public.project_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY project_comments_select ON public.project_comments FOR SELECT TO authenticated
USING (public.project_can_access(project_id));
CREATE POLICY project_comments_insert ON public.project_comments FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND public.project_can_access(project_id));
CREATE POLICY project_comments_delete ON public.project_comments FOR DELETE TO authenticated
USING (user_id = auth.uid());

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.project_comments;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.project_comments_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record; j jsonb; v_author text; v_uid uuid; v_preview text; v_count integer; v_id uuid;
BEGIN
  NEW.content := btrim(NEW.content);
  SELECT id, name, responsible_user_id, created_by INTO p FROM public.projects WHERE id = NEW.project_id;
  SELECT to_jsonb(pr) INTO j FROM public.profiles pr WHERE pr.id = NEW.user_id;
  v_author := COALESCE(NULLIF(btrim(j->>'full_name'), ''), NULLIF(btrim(j->>'name'), ''),
                       NULLIF(split_part(COALESCE(j->>'email', ''), '@', 1), ''), 'Alguém');
  v_preview := left(NEW.content, 140);
  FOR v_uid IN
    SELECT p.responsible_user_id WHERE p.responsible_user_id IS NOT NULL
    UNION SELECT p.created_by WHERE p.created_by IS NOT NULL
    UNION SELECT DISTINCT c.user_id FROM public.project_comments c WHERE c.project_id = NEW.project_id
  LOOP
    CONTINUE WHEN v_uid IS NULL OR v_uid = NEW.user_id;
    v_id := NULL;
    SELECT id, COALESCE((metadata->>'count')::int, 1) INTO v_id, v_count
    FROM public.user_notifications
    WHERE user_id = v_uid AND kind = 'project_comment' AND read_at IS NULL AND metadata->>'project_id' = NEW.project_id::text
    ORDER BY created_at DESC LIMIT 1;
    IF v_id IS NOT NULL THEN
      UPDATE public.user_notifications
      SET title = (v_count + 1) || ' novas mensagens no projeto “' || p.name || '”',
          body = v_author || ': ' || v_preview,
          metadata = metadata || jsonb_build_object('count', v_count + 1),
          created_at = now(), updated_at = now()
      WHERE id = v_id;
    ELSE
      INSERT INTO public.user_notifications (user_id, kind, title, body, link, metadata)
      VALUES (v_uid, 'project_comment', 'Nova mensagem no projeto “' || p.name || '”', v_author || ': ' || v_preview,
              '/projects/' || p.id || '?tab=chat',
              jsonb_build_object('project_id', p.id, 'count', 1));
    END IF;
  END LOOP;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_project_comments_notify AFTER INSERT ON public.project_comments
FOR EACH ROW EXECUTE FUNCTION public.project_comments_notify();