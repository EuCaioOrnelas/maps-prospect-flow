CREATE OR REPLACE FUNCTION public.protect_notification_content()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NOT public.is_current_user_admin() AND current_user NOT IN ('postgres','supabase_admin','service_role') AND (to_jsonb(NEW)-'read_at'-'cleared_at'-'updated_at') IS DISTINCT FROM (to_jsonb(OLD)-'read_at'-'cleared_at'-'updated_at') THEN
  RAISE EXCEPTION 'Só é permitido marcar como lida ou dispensar';
 END IF;
 RETURN NEW;
END $$;
DO $patch$ DECLARE src text; BEGIN
 src := pg_get_functiondef('public.updates_record_event(uuid,text,uuid,boolean)'::regprocedure);
 src := replace(src, 'IF _event=''view'' AND EXISTS(', 'IF _event=''view'' AND _automatic AND EXISTS(');
 EXECUTE src;
 src := pg_get_functiondef('public.project_build_due_digest(uuid)'::regprocedure);
 src := replace(src, 'IF COALESCE(v_total, 0) = 0 THEN CONTINUE; END IF;', $fragment$IF COALESCE(v_total, 0) = 0 THEN
  UPDATE public.user_notifications SET cleared_at=now(), read_at=coalesce(read_at,now()), updated_at=now()
  WHERE user_id=_user AND kind='project_due_' || v_label AND cleared_at IS NULL;
  CONTINUE;
 END IF;$fragment$);
 src := replace(src, 'ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;', $fragment$ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL DO UPDATE
 SET title=EXCLUDED.title, body=EXCLUDED.body, metadata=EXCLUDED.metadata, updated_at=now()
 WHERE (user_notifications.title,user_notifications.body,user_notifications.metadata)
 IS DISTINCT FROM (EXCLUDED.title,EXCLUDED.body,EXCLUDED.metadata);$fragment$);
 EXECUTE src;
END $patch$;
CREATE OR REPLACE FUNCTION public.project_refresh_notifications(_user uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF _user IS NULL THEN RETURN; END IF;
 UPDATE public.user_notifications n SET cleared_at=now(),read_at=coalesce(n.read_at,now()),updated_at=now()
 WHERE n.user_id=_user AND n.cleared_at IS NULL AND (
  (n.kind IN ('project_due_overdue','project_due_today','project_due_tomorrow') AND n.metadata->>'date' IS DISTINCT FROM (now() AT TIME ZONE 'America/Sao_Paulo')::date::text)
  OR (n.kind='task_comment' AND NOT EXISTS(
   SELECT 1 FROM public.project_tasks t JOIN public.projects p ON p.id=t.project_id
   WHERE t.id::text=n.metadata->>'task_id' AND t.status NOT IN ('done','cancelled')
   AND p.status NOT IN ('completed','cancelled') AND p.archived_at IS NULL
  ))
 );
 PERFORM public.project_build_due_digest(_user);
END $$;
REVOKE ALL ON FUNCTION public.project_refresh_notifications(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.project_refresh_notifications(uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.project_due_digest_me()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
 SELECT public.project_refresh_notifications(auth.uid());
$$;
REVOKE ALL ON FUNCTION public.project_due_digest_me() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.project_due_digest_me() TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.project_task_notifications_refresh()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid; pid uuid;
BEGIN
 pid:=CASE WHEN TG_OP='DELETE' THEN OLD.project_id ELSE NEW.project_id END;
 FOR uid IN
  SELECT n.user_id FROM public.user_notifications n WHERE n.cleared_at IS NULL AND n.kind IN ('project_due_overdue','project_due_today','project_due_tomorrow','task_comment')
  AND (n.metadata->>'task_id'=CASE WHEN TG_OP='DELETE' THEN OLD.id::text ELSE NEW.id::text END
   OR n.user_id IN (SELECT t.assignee_id FROM public.project_tasks t WHERE t.project_id=pid)
   OR n.user_id IN (SELECT p.responsible_user_id FROM public.projects p WHERE p.id=pid)
   OR (TG_OP<>'INSERT' AND n.user_id=OLD.assignee_id))
  UNION SELECT t.assignee_id FROM public.project_tasks t WHERE t.project_id=pid AND t.assignee_id IS NOT NULL
  UNION SELECT p.responsible_user_id FROM public.projects p WHERE p.id=pid AND p.responsible_user_id IS NOT NULL
 LOOP PERFORM public.project_refresh_notifications(uid); END LOOP;
 RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.project_task_notifications_refresh() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS trg_project_tasks_notifications_refresh ON public.project_tasks;
CREATE TRIGGER trg_project_tasks_notifications_refresh AFTER INSERT OR UPDATE OF status,due_date,assignee_id,title OR DELETE ON public.project_tasks
FOR EACH ROW EXECUTE FUNCTION public.project_task_notifications_refresh();
CREATE OR REPLACE FUNCTION public.project_notifications_refresh()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid;
BEGIN
 FOR uid IN
  SELECT t.assignee_id FROM public.project_tasks t WHERE t.project_id=NEW.id AND t.assignee_id IS NOT NULL
  UNION SELECT NEW.responsible_user_id WHERE NEW.responsible_user_id IS NOT NULL
  UNION SELECT OLD.responsible_user_id WHERE OLD.responsible_user_id IS NOT NULL
  UNION SELECT n.user_id FROM public.user_notifications n WHERE n.cleared_at IS NULL AND n.metadata->>'project_id'=NEW.id::text
 LOOP PERFORM public.project_refresh_notifications(uid); END LOOP;
 RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.project_notifications_refresh() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS trg_projects_notifications_refresh ON public.projects;
CREATE TRIGGER trg_projects_notifications_refresh AFTER UPDATE OF status,archived_at,due_date,responsible_user_id,name ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.project_notifications_refresh();