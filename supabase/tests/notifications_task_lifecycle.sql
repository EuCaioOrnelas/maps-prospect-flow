-- Run as a privileged database test; all fixtures and side effects roll back.
BEGIN;
DO $$
DECLARE u uuid; p uuid:=gen_random_uuid(); t uuid:=gen_random_uuid(); other uuid:=gen_random_uuid();
BEGIN
 SELECT id INTO u FROM public.profiles WHERE parent_owner_id IS NULL LIMIT 1;
 IF u IS NULL THEN RAISE EXCEPTION 'Test requires an existing owner profile'; END IF;
 INSERT INTO public.projects(id,owner_user_id,name) VALUES(p,u,'Notification lifecycle test');
 INSERT INTO public.project_tasks(id,project_id,title,assignee_id,due_date)
 VALUES(t,p,'Notification task A',u,(now() AT TIME ZONE 'America/Sao_Paulo')::date),
       (other,p,'Notification task B',u,(now() AT TIME ZONE 'America/Sao_Paulo')::date);
 INSERT INTO public.user_notifications(user_id,kind,title,metadata)
 VALUES(u,'task_comment','Test conversation',jsonb_build_object('task_id',t,'project_id',p));
 UPDATE public.project_tasks SET status='done' WHERE id=t;
 IF EXISTS(SELECT 1 FROM public.user_notifications WHERE user_id=u AND kind='task_comment' AND metadata->>'task_id'=t::text AND cleared_at IS NULL) THEN
  RAISE EXCEPTION 'Done tasks must disappear from notifications';
 END IF;
 IF EXISTS(SELECT 1 FROM public.user_notifications WHERE user_id=u AND kind='project_due_today' AND cleared_at IS NULL AND body LIKE '%Notification task A%') THEN
  RAISE EXCEPTION 'Done task must be removed from the due digest';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.user_notifications WHERE user_id=u AND kind='project_due_today' AND cleared_at IS NULL AND body LIKE '%Notification task B%') THEN
  RAISE EXCEPTION 'Remaining active task must stay in the digest';
 END IF;
 UPDATE public.project_tasks SET status='todo' WHERE id=t;
 INSERT INTO public.user_notifications(user_id,kind,title,metadata)
 VALUES(u,'task_comment','Test cancelled conversation',jsonb_build_object('task_id',t,'project_id',p));
 UPDATE public.project_tasks SET status='cancelled' WHERE id=t;
 IF EXISTS(SELECT 1 FROM public.user_notifications WHERE user_id=u AND kind='task_comment' AND metadata->>'task_id'=t::text AND cleared_at IS NULL) THEN
  RAISE EXCEPTION 'Cancelled tasks must disappear from notifications';
 END IF;
 IF EXISTS(SELECT 1 FROM public.user_notifications WHERE user_id=u AND kind='project_due_today' AND cleared_at IS NULL AND body LIKE '%Notification task A%') THEN
  RAISE EXCEPTION 'Cancelled task must be removed from the due digest';
 END IF;
END $$;
ROLLBACK;