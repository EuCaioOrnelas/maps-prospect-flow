ALTER TYPE public.calendar_event_type ADD VALUE IF NOT EXISTS 'deadline';
ALTER TYPE public.calendar_event_source ADD VALUE IF NOT EXISTS 'project';

CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  client_name text,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'planning' CHECK (status IN ('planning','in_progress','review','completed','paused','cancelled')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  responsible_user_id uuid,
  start_date date,
  due_date date,
  completed_at timestamptz,
  archived_at timestamptz,
  tags text[] NOT NULL DEFAULT '{}',
  tasks_total integer NOT NULL DEFAULT 0,
  tasks_done integer NOT NULL DEFAULT 0,
  tasks_open integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT projects_name_check CHECK (length(btrim(name)) > 0),
  CONSTRAINT projects_dates_check CHECK (due_date IS NULL OR start_date IS NULL OR due_date >= start_date)
);
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS priority_rank smallint
  GENERATED ALWAYS AS (CASE priority WHEN 'urgent' THEN 4 WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END) STORED;
CREATE INDEX IF NOT EXISTS idx_projects_owner_due ON public.projects(owner_user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_projects_owner_created ON public.projects(owner_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_owner_status ON public.projects(owner_user_id, status);
CREATE INDEX IF NOT EXISTS idx_projects_lead ON public.projects(lead_id);
CREATE INDEX IF NOT EXISTS idx_projects_responsible ON public.projects(responsible_user_id);

CREATE TABLE IF NOT EXISTS public.project_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(btrim(name)) > 0),
  description text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_project_stages_project ON public.project_stages(project_id, position);

CREATE TABLE IF NOT EXISTS public.project_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  stage_id uuid REFERENCES public.project_stages(id) ON DELETE SET NULL,
  title text NOT NULL CHECK (length(btrim(title)) > 0),
  description text,
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','review','done','cancelled')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  assignee_id uuid,
  due_date date,
  completed_at timestamptz,
  position integer NOT NULL DEFAULT 0,
  checklist_total integer NOT NULL DEFAULT 0,
  checklist_done integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_project_tasks_project ON public.project_tasks(project_id, status);
CREATE INDEX IF NOT EXISTS idx_project_tasks_assignee ON public.project_tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_stage ON public.project_tasks(stage_id);

CREATE TABLE IF NOT EXISTS public.project_task_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.project_tasks(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(btrim(title)) > 0),
  is_completed boolean NOT NULL DEFAULT false,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_project_checklist_task ON public.project_task_checklist_items(task_id, position);

CREATE TABLE IF NOT EXISTS public.project_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id uuid,
  actor_id uuid,
  action_type text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_project_activity_project ON public.project_activity(project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.project_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  size_bytes bigint,
  mime_type text,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_project_files_project ON public.project_files(project_id, created_at DESC);

ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS project_task_id uuid REFERENCES public.project_tasks(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS uq_calendar_events_project_deadline ON public.calendar_events(project_id) WHERE project_id IS NOT NULL AND project_task_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_calendar_events_project_task ON public.calendar_events(project_task_id) WHERE project_task_id IS NOT NULL;

ALTER TABLE public.calendar_events DROP CONSTRAINT IF EXISTS calendar_events_no_overlap;
ALTER TABLE public.calendar_events
  ADD CONSTRAINT calendar_events_no_overlap
  EXCLUDE USING gist (
    assigned_user_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  ) WHERE (status <> 'cancelled' AND all_day = false);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_stages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_task_checklist_items TO authenticated;
GRANT SELECT ON public.project_activity TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.project_files TO authenticated;
GRANT ALL ON public.projects, public.project_stages, public.project_tasks, public.project_task_checklist_items, public.project_activity, public.project_files TO service_role;

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_task_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.project_is_manager()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(public.get_account_role(auth.uid())::text IN ('owner','admin'), false);
$$;

CREATE OR REPLACE FUNCTION public.project_can_access(_project_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = _project_id
      AND p.owner_user_id = public.get_account_owner(auth.uid())
      AND (
        public.project_is_manager()
        OR p.responsible_user_id = auth.uid()
        OR p.created_by = auth.uid()
        OR EXISTS (SELECT 1 FROM public.project_tasks t WHERE t.project_id = p.id AND t.assignee_id = auth.uid())
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.project_task_can_access(_task_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.project_tasks t WHERE t.id = _task_id AND public.project_can_access(t.project_id));
$$;

REVOKE EXECUTE ON FUNCTION public.project_is_manager() FROM anon;
REVOKE EXECUTE ON FUNCTION public.project_can_access(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.project_task_can_access(uuid) FROM anon;

DROP POLICY IF EXISTS projects_select ON public.projects;
CREATE POLICY projects_select ON public.projects FOR SELECT TO authenticated
USING (owner_user_id = public.get_account_owner(auth.uid()) AND (
  public.project_is_manager() OR responsible_user_id = auth.uid() OR created_by = auth.uid()
  OR EXISTS (SELECT 1 FROM public.project_tasks t WHERE t.project_id = projects.id AND t.assignee_id = auth.uid())));
DROP POLICY IF EXISTS projects_insert ON public.projects;
CREATE POLICY projects_insert ON public.projects FOR INSERT TO authenticated
WITH CHECK (owner_user_id = public.get_account_owner(auth.uid()) AND created_by = auth.uid());
DROP POLICY IF EXISTS projects_update ON public.projects;
CREATE POLICY projects_update ON public.projects FOR UPDATE TO authenticated
USING (public.project_can_access(id))
WITH CHECK (owner_user_id = public.get_account_owner(auth.uid()));
DROP POLICY IF EXISTS projects_delete ON public.projects;
CREATE POLICY projects_delete ON public.projects FOR DELETE TO authenticated
USING (owner_user_id = public.get_account_owner(auth.uid()) AND (public.project_is_manager() OR created_by = auth.uid()));

DROP POLICY IF EXISTS project_stages_all ON public.project_stages;
CREATE POLICY project_stages_all ON public.project_stages FOR ALL TO authenticated
USING (public.project_can_access(project_id)) WITH CHECK (public.project_can_access(project_id));
DROP POLICY IF EXISTS project_tasks_all ON public.project_tasks;
CREATE POLICY project_tasks_all ON public.project_tasks FOR ALL TO authenticated
USING (public.project_can_access(project_id)) WITH CHECK (public.project_can_access(project_id));
DROP POLICY IF EXISTS project_checklist_all ON public.project_task_checklist_items;
CREATE POLICY project_checklist_all ON public.project_task_checklist_items FOR ALL TO authenticated
USING (public.project_task_can_access(task_id)) WITH CHECK (public.project_task_can_access(task_id));
DROP POLICY IF EXISTS project_activity_select ON public.project_activity;
CREATE POLICY project_activity_select ON public.project_activity FOR SELECT TO authenticated
USING (public.project_can_access(project_id));
DROP POLICY IF EXISTS project_files_select ON public.project_files;
CREATE POLICY project_files_select ON public.project_files FOR SELECT TO authenticated
USING (public.project_can_access(project_id));
DROP POLICY IF EXISTS project_files_insert ON public.project_files;
CREATE POLICY project_files_insert ON public.project_files FOR INSERT TO authenticated
WITH CHECK (public.project_can_access(project_id) AND uploaded_by = auth.uid());
DROP POLICY IF EXISTS project_files_delete ON public.project_files;
CREATE POLICY project_files_delete ON public.project_files FOR DELETE TO authenticated
USING (public.project_can_access(project_id));

CREATE OR REPLACE FUNCTION public.projects_before_write()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_lead record; v_counters boolean := COALESCE(current_setting('wiize.project_counters', true) = 'on', false);
BEGIN
  IF TG_OP = 'INSERT' AND auth.uid() IS NOT NULL THEN
    NEW.owner_user_id := public.get_account_owner(auth.uid());
    NEW.created_by := auth.uid();
    NEW.tasks_total := 0; NEW.tasks_done := 0; NEW.tasks_open := 0;
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.owner_user_id := OLD.owner_user_id;
    NEW.created_by := OLD.created_by;
    IF NOT v_counters THEN
      NEW.tasks_total := OLD.tasks_total; NEW.tasks_done := OLD.tasks_done; NEW.tasks_open := OLD.tasks_open;
    END IF;
  END IF;
  NEW.name := btrim(NEW.name);
  IF NEW.lead_id IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.lead_id IS DISTINCT FROM OLD.lead_id) THEN
    SELECT owner_user_id, contact_name, company_name INTO v_lead FROM public.leads WHERE id = NEW.lead_id;
    IF NOT FOUND OR v_lead.owner_user_id IS DISTINCT FROM NEW.owner_user_id THEN
      RAISE EXCEPTION 'Cliente não pertence à sua conta.' USING ERRCODE = '42501';
    END IF;
    NEW.client_name := COALESCE(NULLIF(v_lead.company_name,''), v_lead.contact_name);
  ELSIF NEW.lead_id IS NULL AND TG_OP = 'INSERT' THEN
    NEW.client_name := NULL;
  ELSIF NEW.lead_id IS NULL AND TG_OP = 'UPDATE' AND OLD.lead_id IS NOT NULL
        AND EXISTS (SELECT 1 FROM public.leads WHERE id = OLD.lead_id) THEN
    NEW.client_name := NULL;
  END IF;
  IF NEW.responsible_user_id IS NOT NULL
     AND public.get_account_owner(NEW.responsible_user_id) IS DISTINCT FROM NEW.owner_user_id THEN
    RAISE EXCEPTION 'Responsável não pertence à sua equipe.' USING ERRCODE = '42501';
  END IF;
  IF NEW.status = 'completed' AND NEW.completed_at IS NULL THEN NEW.completed_at := now();
  ELSIF NEW.status <> 'completed' THEN NEW.completed_at := NULL; END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_projects_before_write ON public.projects;
CREATE TRIGGER trg_projects_before_write BEFORE INSERT OR UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.projects_before_write();

CREATE OR REPLACE FUNCTION public.project_tasks_before_write()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := COALESCE(auth.uid(), NEW.created_by);
    NEW.checklist_total := 0; NEW.checklist_done := 0;
  ELSE
    NEW.project_id := OLD.project_id;
    NEW.created_by := OLD.created_by;
    IF current_setting('wiize.checklist_counters', true) IS DISTINCT FROM 'on' THEN
      NEW.checklist_total := OLD.checklist_total; NEW.checklist_done := OLD.checklist_done;
    END IF;
  END IF;
  SELECT owner_user_id INTO v_owner FROM public.projects WHERE id = NEW.project_id;
  NEW.title := btrim(NEW.title);
  IF NEW.stage_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.project_stages s WHERE s.id = NEW.stage_id AND s.project_id = NEW.project_id) THEN
    RAISE EXCEPTION 'Etapa inválida para este projeto.';
  END IF;
  IF NEW.assignee_id IS NOT NULL AND public.get_account_owner(NEW.assignee_id) IS DISTINCT FROM v_owner THEN
    RAISE EXCEPTION 'Responsável não pertence à sua equipe.' USING ERRCODE = '42501';
  END IF;
  IF NEW.status = 'done' AND NEW.completed_at IS NULL THEN NEW.completed_at := now();
  ELSIF NEW.status <> 'done' THEN NEW.completed_at := NULL; END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_project_tasks_before_write ON public.project_tasks;
CREATE TRIGGER trg_project_tasks_before_write BEFORE INSERT OR UPDATE ON public.project_tasks
FOR EACH ROW EXECUTE FUNCTION public.project_tasks_before_write();

DROP TRIGGER IF EXISTS trg_project_stages_updated ON public.project_stages;
CREATE TRIGGER trg_project_stages_updated BEFORE UPDATE ON public.project_stages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_project_checklist_updated ON public.project_task_checklist_items;
CREATE TRIGGER trg_project_checklist_updated BEFORE UPDATE ON public.project_task_checklist_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.project_recount(_project_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM set_config('wiize.project_counters', 'on', true);
  UPDATE public.projects p SET
    tasks_total = c.total, tasks_done = c.done, tasks_open = c.open
  FROM (
    SELECT count(*) FILTER (WHERE status <> 'cancelled') AS total,
           count(*) FILTER (WHERE status = 'done') AS done,
           count(*) FILTER (WHERE status NOT IN ('done','cancelled')) AS open
    FROM public.project_tasks WHERE project_id = _project_id
  ) c
  WHERE p.id = _project_id;
  PERFORM set_config('wiize.project_counters', 'off', true);
END $$;
REVOKE EXECUTE ON FUNCTION public.project_recount(uuid) FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.project_tasks_after_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN PERFORM public.project_recount(OLD.project_id); RETURN OLD; END IF;
  IF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.project_recount(NEW.project_id);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_project_tasks_count ON public.project_tasks;
CREATE TRIGGER trg_project_tasks_count AFTER INSERT OR UPDATE OR DELETE ON public.project_tasks
FOR EACH ROW EXECUTE FUNCTION public.project_tasks_after_count();

CREATE OR REPLACE FUNCTION public.project_checklist_after_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_task uuid := COALESCE(NEW.task_id, OLD.task_id);
BEGIN
  PERFORM set_config('wiize.checklist_counters', 'on', true);
  UPDATE public.project_tasks t SET
    checklist_total = (SELECT count(*) FROM public.project_task_checklist_items WHERE task_id = v_task),
    checklist_done = (SELECT count(*) FROM public.project_task_checklist_items WHERE task_id = v_task AND is_completed)
  WHERE t.id = v_task;
  PERFORM set_config('wiize.checklist_counters', 'off', true);
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS trg_project_checklist_count ON public.project_task_checklist_items;
CREATE TRIGGER trg_project_checklist_count AFTER INSERT OR UPDATE OR DELETE ON public.project_task_checklist_items
FOR EACH ROW EXECUTE FUNCTION public.project_checklist_after_count();

CREATE OR REPLACE FUNCTION public.projects_log_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.project_activity(project_id, actor_id, action_type, metadata)
    VALUES (NEW.id, auth.uid(), 'project_created', jsonb_build_object('name', NEW.name));
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.project_activity(project_id, actor_id, action_type, metadata)
    VALUES (NEW.id, auth.uid(), 'status_changed', jsonb_build_object('from', OLD.status, 'to', NEW.status));
  END IF;
  IF NEW.due_date IS DISTINCT FROM OLD.due_date THEN
    INSERT INTO public.project_activity(project_id, actor_id, action_type, metadata)
    VALUES (NEW.id, auth.uid(), 'due_changed', jsonb_build_object('from', OLD.due_date, 'to', NEW.due_date));
  END IF;
  IF NEW.responsible_user_id IS DISTINCT FROM OLD.responsible_user_id THEN
    INSERT INTO public.project_activity(project_id, actor_id, action_type, metadata)
    VALUES (NEW.id, auth.uid(), 'responsible_changed', jsonb_build_object('from', OLD.responsible_user_id, 'to', NEW.responsible_user_id));
  END IF;
  IF NEW.archived_at IS DISTINCT FROM OLD.archived_at THEN
    INSERT INTO public.project_activity(project_id, actor_id, action_type, metadata)
    VALUES (NEW.id, auth.uid(), CASE WHEN NEW.archived_at IS NULL THEN 'unarchived' ELSE 'archived' END, '{}'::jsonb);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_projects_activity ON public.projects;
CREATE TRIGGER trg_projects_activity AFTER INSERT OR UPDATE OF status, due_date, responsible_user_id, archived_at ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.projects_log_activity();

CREATE OR REPLACE FUNCTION public.project_tasks_log_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.project_activity(project_id, task_id, actor_id, action_type, metadata)
    SELECT OLD.project_id, NULL, auth.uid(), 'task_deleted', jsonb_build_object('title', OLD.title)
    WHERE EXISTS (SELECT 1 FROM public.projects WHERE id = OLD.project_id);
    RETURN OLD;
  END IF;
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.project_activity(project_id, task_id, actor_id, action_type, metadata)
    VALUES (NEW.project_id, NEW.id, auth.uid(), 'task_created', jsonb_build_object('title', NEW.title));
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.project_activity(project_id, task_id, actor_id, action_type, metadata)
    VALUES (NEW.project_id, NEW.id, auth.uid(),
      CASE WHEN NEW.status = 'done' THEN 'task_completed' ELSE 'task_status_changed' END,
      jsonb_build_object('title', NEW.title, 'from', OLD.status, 'to', NEW.status));
  END IF;
  IF NEW.assignee_id IS DISTINCT FROM OLD.assignee_id THEN
    INSERT INTO public.project_activity(project_id, task_id, actor_id, action_type, metadata)
    VALUES (NEW.project_id, NEW.id, auth.uid(), 'task_assignee_changed', jsonb_build_object('title', NEW.title, 'to', NEW.assignee_id));
  END IF;
  IF NEW.due_date IS DISTINCT FROM OLD.due_date THEN
    INSERT INTO public.project_activity(project_id, task_id, actor_id, action_type, metadata)
    VALUES (NEW.project_id, NEW.id, auth.uid(), 'task_due_changed', jsonb_build_object('title', NEW.title, 'from', OLD.due_date, 'to', NEW.due_date));
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_project_tasks_activity ON public.project_tasks;
CREATE TRIGGER trg_project_tasks_activity AFTER INSERT OR UPDATE OF status, assignee_id, due_date OR DELETE ON public.project_tasks
FOR EACH ROW EXECUTE FUNCTION public.project_tasks_log_activity();

CREATE OR REPLACE FUNCTION public.project_sync_calendar()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_assigned uuid; v_status public.calendar_event_status; v_start timestamptz;
BEGIN
  IF NEW.due_date IS NULL THEN
    DELETE FROM public.calendar_events WHERE project_id = NEW.id AND project_task_id IS NULL;
    RETURN NEW;
  END IF;
  v_assigned := COALESCE(NEW.responsible_user_id, NEW.created_by, NEW.owner_user_id);
  v_status := CASE WHEN NEW.status = 'completed' THEN 'completed'::public.calendar_event_status
                   WHEN NEW.status = 'cancelled' OR NEW.archived_at IS NOT NULL THEN 'cancelled'::public.calendar_event_status
                   ELSE 'scheduled'::public.calendar_event_status END;
  v_start := (NEW.due_date::timestamp AT TIME ZONE 'America/Sao_Paulo');
  INSERT INTO public.calendar_events (owner_user_id, assigned_user_id, created_by, title, description, event_type, status, source,
    starts_at, ends_at, all_day, timezone, lead_id, company_name, project_id, metadata)
  VALUES (NEW.owner_user_id, v_assigned, v_assigned, 'Entrega: ' || NEW.name, NEW.description, 'deadline', v_status, 'project',
    v_start, v_start + interval '1 day', true, 'America/Sao_Paulo', NEW.lead_id, NEW.client_name, NEW.id,
    jsonb_build_object('kind','project_deadline','project_id', NEW.id))
  ON CONFLICT (project_id) WHERE project_id IS NOT NULL AND project_task_id IS NULL
  DO UPDATE SET assigned_user_id = EXCLUDED.assigned_user_id, created_by = EXCLUDED.created_by, title = EXCLUDED.title,
    description = EXCLUDED.description, status = EXCLUDED.status, starts_at = EXCLUDED.starts_at, ends_at = EXCLUDED.ends_at,
    lead_id = EXCLUDED.lead_id, company_name = EXCLUDED.company_name, updated_at = now();
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_projects_calendar ON public.projects;
CREATE TRIGGER trg_projects_calendar AFTER INSERT OR UPDATE OF name, description, status, due_date, responsible_user_id, archived_at, lead_id
ON public.projects FOR EACH ROW EXECUTE FUNCTION public.project_sync_calendar();

DROP POLICY IF EXISTS "Project files read" ON storage.objects;
CREATE POLICY "Project files read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'project-files' AND public.project_can_access(((storage.foldername(name))[1])::uuid));
DROP POLICY IF EXISTS "Project files upload" ON storage.objects;
CREATE POLICY "Project files upload" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'project-files' AND public.project_can_access(((storage.foldername(name))[1])::uuid));
DROP POLICY IF EXISTS "Project files delete" ON storage.objects;
CREATE POLICY "Project files delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'project-files' AND public.project_can_access(((storage.foldername(name))[1])::uuid));