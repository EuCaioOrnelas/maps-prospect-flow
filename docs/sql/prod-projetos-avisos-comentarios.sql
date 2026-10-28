-- =====================================================================
-- PROJETOS — avisos no sininho, conversa nas tarefas e horário na Agenda
-- Rodar DEPOIS de prod-modulo-projetos.sql. Seguro para rodar de novo.
-- =====================================================================

-- ========== 1) HORÁRIO OPCIONAL NA TAREFA (ocupa a Agenda) ==========
ALTER TABLE public.project_tasks ADD COLUMN IF NOT EXISTS due_time time;
ALTER TABLE public.project_tasks ADD COLUMN IF NOT EXISTS duration_minutes integer NOT NULL DEFAULT 60;
ALTER TABLE public.project_tasks DROP CONSTRAINT IF EXISTS project_tasks_duration_check;
ALTER TABLE public.project_tasks ADD CONSTRAINT project_tasks_duration_check CHECK (duration_minutes BETWEEN 15 AND 720);

-- Sem horário = dia inteiro (não ocupa espaço). Com horário = compromisso que
-- bloqueia o mesmo horário na Agenda individual do responsável (calendar_events_no_overlap).
CREATE OR REPLACE FUNCTION public.project_task_sync_calendar()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record; v_assigned uuid; v_status public.calendar_event_status; v_start timestamptz; v_end timestamptz; v_all_day boolean;
BEGIN
  IF NEW.due_date IS NULL THEN
    DELETE FROM public.calendar_events WHERE project_task_id = NEW.id;
    RETURN NEW;
  END IF;
  SELECT * INTO p FROM public.projects WHERE id = NEW.project_id;
  v_assigned := COALESCE(NEW.assignee_id, p.responsible_user_id, NEW.created_by, p.owner_user_id);
  v_status := CASE WHEN NEW.status = 'done' THEN 'completed'::public.calendar_event_status
                   WHEN NEW.status = 'cancelled' THEN 'cancelled'::public.calendar_event_status
                   ELSE 'scheduled'::public.calendar_event_status END;
  IF NEW.due_time IS NULL THEN
    v_all_day := true;
    v_start := (NEW.due_date::timestamp AT TIME ZONE 'America/Sao_Paulo');
    v_end := v_start + interval '1 day';
  ELSE
    v_all_day := false;
    v_start := ((NEW.due_date + NEW.due_time)::timestamp AT TIME ZONE 'America/Sao_Paulo');
    v_end := v_start + make_interval(mins => NEW.duration_minutes);
  END IF;
  INSERT INTO public.calendar_events (owner_user_id, assigned_user_id, created_by, title, description, event_type, status, source,
    starts_at, ends_at, all_day, timezone, lead_id, company_name, project_id, project_task_id, metadata)
  VALUES (p.owner_user_id, v_assigned, v_assigned, 'Tarefa: ' || NEW.title, NEW.description, 'deadline', v_status, 'project',
    v_start, v_end, v_all_day, 'America/Sao_Paulo', p.lead_id, p.client_name, p.id, NEW.id,
    jsonb_build_object('kind','task_deadline','project_id', p.id, 'task_id', NEW.id))
  ON CONFLICT (project_task_id) WHERE project_task_id IS NOT NULL
  DO UPDATE SET assigned_user_id = EXCLUDED.assigned_user_id, created_by = EXCLUDED.created_by, title = EXCLUDED.title,
    description = EXCLUDED.description, status = EXCLUDED.status, starts_at = EXCLUDED.starts_at, ends_at = EXCLUDED.ends_at,
    all_day = EXCLUDED.all_day, updated_at = now();
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_project_tasks_calendar ON public.project_tasks;
CREATE TRIGGER trg_project_tasks_calendar AFTER INSERT OR UPDATE OF title, description, status, due_date, due_time, duration_minutes, assignee_id
ON public.project_tasks FOR EACH ROW EXECUTE FUNCTION public.project_task_sync_calendar();

-- ========== 2) AVISOS INDIVIDUAIS (sininho) ==========
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  dedupe_key text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user ON public.user_notifications(user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_notifications_dedupe ON public.user_notifications(dedupe_key) WHERE dedupe_key IS NOT NULL;

GRANT SELECT, UPDATE, DELETE ON public.user_notifications TO authenticated;
GRANT ALL ON public.user_notifications TO service_role;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_notifications_select ON public.user_notifications;
CREATE POLICY user_notifications_select ON public.user_notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS user_notifications_update ON public.user_notifications;
CREATE POLICY user_notifications_update ON public.user_notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS user_notifications_delete ON public.user_notifications;
CREATE POLICY user_notifications_delete ON public.user_notifications FOR DELETE TO authenticated USING (user_id = auth.uid());

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notifications;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL; END $$;

-- Resumo diário de vencimentos de UM usuário: atrasadas, hoje e amanhã.
-- Um aviso por tipo por dia (dedupe_key), com "X, Y e outras N".
CREATE OR REPLACE FUNCTION public.project_build_due_digest(_user uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_label text; v_names text[]; v_total integer; v_title text; v_body text;
BEGIN
  IF _user IS NULL THEN RETURN; END IF;
  FOREACH v_label IN ARRAY ARRAY['overdue','today','tomorrow'] LOOP
    SELECT array_agg(x.name ORDER BY x.rank DESC, x.name), count(*)
      INTO v_names, v_total
    FROM (
      SELECT '“' || t.title || '”' AS name,
             CASE t.priority WHEN 'urgent' THEN 4 WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END AS rank
      FROM public.project_tasks t JOIN public.projects p ON p.id = t.project_id
      WHERE t.assignee_id = _user AND t.due_date IS NOT NULL
        AND t.status NOT IN ('done','cancelled')
        AND p.archived_at IS NULL AND p.status NOT IN ('completed','cancelled')
        AND CASE v_label WHEN 'overdue' THEN t.due_date < v_today
                         WHEN 'today' THEN t.due_date = v_today
                         ELSE t.due_date = v_today + 1 END
      UNION ALL
      SELECT 'entrega do projeto “' || p.name || '”', p.priority_rank
      FROM public.projects p
      WHERE p.responsible_user_id = _user AND p.due_date IS NOT NULL
        AND p.archived_at IS NULL AND p.status NOT IN ('completed','cancelled')
        AND CASE v_label WHEN 'overdue' THEN p.due_date < v_today
                         WHEN 'today' THEN p.due_date = v_today
                         ELSE p.due_date = v_today + 1 END
    ) x;

    IF COALESCE(v_total, 0) = 0 THEN CONTINUE; END IF;

    v_title := CASE v_label
      WHEN 'overdue' THEN CASE WHEN v_total = 1 THEN '1 item atrasado' ELSE v_total || ' itens atrasados' END
      WHEN 'today' THEN CASE WHEN v_total = 1 THEN 'Hoje vence 1 item' ELSE 'Hoje vencem ' || v_total || ' itens' END
      ELSE CASE WHEN v_total = 1 THEN 'Amanhã vence 1 item' ELSE 'Amanhã vencem ' || v_total || ' itens' END
    END;
    v_body := CASE
      WHEN v_total = 1 THEN v_names[1]
      WHEN v_total = 2 THEN v_names[1] || ' e ' || v_names[2]
      ELSE v_names[1] || ', ' || v_names[2] || ' e outr' || CASE WHEN v_total - 2 = 1 THEN 'o item' ELSE 'os ' || (v_total - 2) || ' itens' END
    END;
    v_body := upper(left(v_body, 1)) || substr(v_body, 2);

    INSERT INTO public.user_notifications (user_id, kind, title, body, link, dedupe_key, metadata)
    VALUES (_user, 'project_due_' || v_label, v_title, v_body, '/projects',
            'due:' || v_label || ':' || _user || ':' || v_today,
            jsonb_build_object('count', v_total, 'date', v_today))
    ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
  END LOOP;
END $$;
REVOKE EXECUTE ON FUNCTION public.project_build_due_digest(uuid) FROM anon, authenticated, public;

-- Chamado pelo app ao abrir: garante o resumo do dia mesmo sem o agendador.
CREATE OR REPLACE FUNCTION public.project_due_digest_me()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT public.project_build_due_digest(auth.uid());
$$;
REVOKE EXECUTE ON FUNCTION public.project_due_digest_me() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.project_due_digest_me() TO authenticated;

-- Rodado todo dia às 08:00 (Brasília) para todos com vencimentos.
CREATE OR REPLACE FUNCTION public.project_due_digest_all()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; v_today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
BEGIN
  FOR r IN
    SELECT DISTINCT t.assignee_id AS uid FROM public.project_tasks t
    WHERE t.assignee_id IS NOT NULL AND t.due_date <= v_today + 1 AND t.status NOT IN ('done','cancelled')
    UNION
    SELECT DISTINCT p.responsible_user_id FROM public.projects p
    WHERE p.responsible_user_id IS NOT NULL AND p.due_date <= v_today + 1
      AND p.archived_at IS NULL AND p.status NOT IN ('completed','cancelled')
  LOOP
    PERFORM public.project_build_due_digest(r.uid);
  END LOOP;
  -- limpeza: avisos lidos com mais de 60 dias
  DELETE FROM public.user_notifications WHERE read_at IS NOT NULL AND read_at < now() - interval '60 days';
END $$;
REVOKE EXECUTE ON FUNCTION public.project_due_digest_all() FROM anon, authenticated, public;

DO $$ BEGIN
  PERFORM cron.unschedule('project-due-digest');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  PERFORM cron.schedule('project-due-digest', '0 11 * * *', 'SELECT public.project_due_digest_all();');
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Agendador indisponível: o resumo será criado quando cada usuário abrir o app.'; END $$;

-- ========== 3) CONVERSA DENTRO DA TAREFA ==========
CREATE TABLE IF NOT EXISTS public.project_task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.project_tasks(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  content text NOT NULL CHECK (length(btrim(content)) BETWEEN 1 AND 4000),
  reply_to_id uuid REFERENCES public.project_task_comments(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_project_task_comments_task ON public.project_task_comments(task_id, created_at);

GRANT SELECT, INSERT, DELETE ON public.project_task_comments TO authenticated;
GRANT ALL ON public.project_task_comments TO service_role;
ALTER TABLE public.project_task_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS task_comments_select ON public.project_task_comments;
CREATE POLICY task_comments_select ON public.project_task_comments FOR SELECT TO authenticated
USING (public.project_task_can_access(task_id));
DROP POLICY IF EXISTS task_comments_insert ON public.project_task_comments;
CREATE POLICY task_comments_insert ON public.project_task_comments FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND public.project_task_can_access(task_id));
DROP POLICY IF EXISTS task_comments_delete ON public.project_task_comments;
CREATE POLICY task_comments_delete ON public.project_task_comments FOR DELETE TO authenticated
USING (user_id = auth.uid());

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.project_task_comments;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL; END $$;

-- project_id sempre coerente com a tarefa
CREATE OR REPLACE FUNCTION public.project_task_comments_before_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  SELECT project_id INTO NEW.project_id FROM public.project_tasks WHERE id = NEW.task_id;
  IF NEW.project_id IS NULL THEN RAISE EXCEPTION 'Tarefa inválida'; END IF;
  NEW.content := btrim(NEW.content);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_task_comments_before_insert ON public.project_task_comments;
CREATE TRIGGER trg_task_comments_before_insert BEFORE INSERT ON public.project_task_comments
FOR EACH ROW EXECUTE FUNCTION public.project_task_comments_before_insert();

-- Nova mensagem: avisa o responsável da tarefa e quem já conversou nela (menos o autor).
-- Enquanto o aviso não for lido, ele é atualizado ("3 novas mensagens") em vez de duplicar.
CREATE OR REPLACE FUNCTION public.project_task_comments_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t record; j jsonb; v_author text; v_uid uuid; v_preview text; v_count integer; v_id uuid;
BEGIN
  SELECT pt.id, pt.title, pt.assignee_id, pt.project_id INTO t FROM public.project_tasks pt WHERE pt.id = NEW.task_id;
  SELECT to_jsonb(pr) INTO j FROM public.profiles pr WHERE pr.id = NEW.user_id;
  v_author := COALESCE(NULLIF(btrim(j->>'full_name'), ''), NULLIF(btrim(j->>'name'), ''),
                       NULLIF(split_part(COALESCE(j->>'email', ''), '@', 1), ''), 'Alguém');
  v_preview := left(NEW.content, 140);

  FOR v_uid IN
    SELECT t.assignee_id WHERE t.assignee_id IS NOT NULL
    UNION
    SELECT DISTINCT c.user_id FROM public.project_task_comments c WHERE c.task_id = NEW.task_id
  LOOP
    CONTINUE WHEN v_uid IS NULL OR v_uid = NEW.user_id;
    SELECT id, COALESCE((metadata->>'count')::int, 1) INTO v_id, v_count
    FROM public.user_notifications
    WHERE user_id = v_uid AND kind = 'task_comment' AND read_at IS NULL AND metadata->>'task_id' = NEW.task_id::text
    ORDER BY created_at DESC LIMIT 1;
    IF v_id IS NOT NULL THEN
      UPDATE public.user_notifications
      SET title = (v_count + 1) || ' novas mensagens em “' || t.title || '”',
          body = v_author || ': ' || v_preview,
          metadata = metadata || jsonb_build_object('count', v_count + 1),
          created_at = now(), updated_at = now()
      WHERE id = v_id;
    ELSE
      INSERT INTO public.user_notifications (user_id, kind, title, body, link, metadata)
      VALUES (v_uid, 'task_comment', 'Nova mensagem em “' || t.title || '”', v_author || ': ' || v_preview,
              '/projects/' || t.project_id || '?task=' || t.id,
              jsonb_build_object('task_id', t.id, 'project_id', t.project_id, 'count', 1));
    END IF;
  END LOOP;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_task_comments_notify ON public.project_task_comments;
CREATE TRIGGER trg_task_comments_notify AFTER INSERT ON public.project_task_comments
FOR EACH ROW EXECUTE FUNCTION public.project_task_comments_notify();

-- Projeto excluído: some também com os avisos ligados a ele
CREATE OR REPLACE FUNCTION public.projects_cleanup_notifications()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.user_notifications WHERE metadata->>'project_id' = OLD.id::text;
  RETURN OLD;
END $$;
DROP TRIGGER IF EXISTS trg_projects_cleanup_notifications ON public.projects;
CREATE TRIGGER trg_projects_cleanup_notifications AFTER DELETE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.projects_cleanup_notifications();

-- Conferência
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('user_notifications','project_task_comments') ORDER BY 1;
