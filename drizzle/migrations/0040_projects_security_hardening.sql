CREATE OR REPLACE FUNCTION public.project_can_manage(_project_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = _project_id
      AND p.owner_user_id = public.get_account_owner(auth.uid())
      AND (public.project_is_manager() OR p.responsible_user_id = auth.uid() OR p.created_by = auth.uid())
  );
$$;
REVOKE EXECUTE ON FUNCTION public.project_can_manage(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.project_can_manage(uuid) TO authenticated, service_role;

-- Only managers / responsible / creator can edit the project itself
DROP POLICY IF EXISTS projects_update ON public.projects;
CREATE POLICY projects_update ON public.projects FOR UPDATE TO authenticated
  USING (public.project_can_manage(id))
  WITH CHECK (owner_user_id = public.get_account_owner(auth.uid()));

-- Stages: everyone with access reads, only managers change
DROP POLICY IF EXISTS project_stages_all ON public.project_stages;
CREATE POLICY project_stages_select ON public.project_stages FOR SELECT TO authenticated USING (public.project_can_access(project_id));
CREATE POLICY project_stages_write ON public.project_stages FOR INSERT TO authenticated WITH CHECK (public.project_can_manage(project_id));
CREATE POLICY project_stages_update ON public.project_stages FOR UPDATE TO authenticated USING (public.project_can_manage(project_id)) WITH CHECK (public.project_can_manage(project_id));
CREATE POLICY project_stages_delete ON public.project_stages FOR DELETE TO authenticated USING (public.project_can_manage(project_id));

-- Tasks: managers do everything; assignees only update their own tasks
DROP POLICY IF EXISTS project_tasks_all ON public.project_tasks;
CREATE POLICY project_tasks_select ON public.project_tasks FOR SELECT TO authenticated USING (public.project_can_access(project_id));
CREATE POLICY project_tasks_insert ON public.project_tasks FOR INSERT TO authenticated WITH CHECK (public.project_can_manage(project_id));
CREATE POLICY project_tasks_update ON public.project_tasks FOR UPDATE TO authenticated
  USING (public.project_can_manage(project_id) OR (assignee_id = auth.uid() AND public.project_can_access(project_id)))
  WITH CHECK (public.project_can_access(project_id));
CREATE POLICY project_tasks_delete ON public.project_tasks FOR DELETE TO authenticated USING (public.project_can_manage(project_id));

-- Same-account validation for people and CRM client references
CREATE OR REPLACE FUNCTION public.projects_validate_refs()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.owner_user_id IS DISTINCT FROM OLD.owner_user_id THEN
    RAISE EXCEPTION 'Não é permitido mover o projeto para outra conta';
  END IF;
  IF NEW.responsible_user_id IS NOT NULL AND public.get_account_owner(NEW.responsible_user_id) <> NEW.owner_user_id THEN
    RAISE EXCEPTION 'Responsável não pertence a esta conta';
  END IF;
  IF NEW.lead_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.leads l WHERE l.id = NEW.lead_id AND public.get_account_owner(l.user_id) = NEW.owner_user_id
  ) THEN
    RAISE EXCEPTION 'Cliente não pertence a esta conta';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_projects_validate_refs ON public.projects;
CREATE TRIGGER trg_projects_validate_refs BEFORE INSERT OR UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.projects_validate_refs();

CREATE OR REPLACE FUNCTION public.project_tasks_validate_refs()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _owner uuid;
BEGIN
  SELECT owner_user_id INTO _owner FROM public.projects WHERE id = NEW.project_id;
  IF TG_OP = 'UPDATE' AND NEW.project_id IS DISTINCT FROM OLD.project_id THEN
    RAISE EXCEPTION 'Não é permitido mover a tarefa para outro projeto';
  END IF;
  IF NEW.assignee_id IS NOT NULL AND public.get_account_owner(NEW.assignee_id) <> _owner THEN
    RAISE EXCEPTION 'Responsável não pertence a esta conta';
  END IF;
  IF NEW.stage_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.project_stages s WHERE s.id = NEW.stage_id AND s.project_id = NEW.project_id) THEN
    RAISE EXCEPTION 'Etapa não pertence a este projeto';
  END IF;
  -- Non-managers (assignees) may not reassign the task to someone else
  IF TG_OP = 'UPDATE' AND auth.uid() IS NOT NULL AND NOT public.project_can_manage(NEW.project_id)
     AND NEW.assignee_id IS DISTINCT FROM OLD.assignee_id THEN
    RAISE EXCEPTION 'Somente o gestor do projeto pode trocar o responsável';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_project_tasks_validate_refs ON public.project_tasks;
CREATE TRIGGER trg_project_tasks_validate_refs BEFORE INSERT OR UPDATE ON public.project_tasks
  FOR EACH ROW EXECUTE FUNCTION public.project_tasks_validate_refs();

REVOKE ALL ON public.projects, public.project_stages, public.project_tasks, public.project_task_checklist_items,
  public.project_activity, public.project_files, public.project_comments, public.project_task_comments, public.user_notifications FROM anon;