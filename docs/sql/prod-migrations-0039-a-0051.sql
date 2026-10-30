-- Wiize: atualizações 0039 a 0051 em um único SQL (pode rodar mais de uma vez)

-- Cria a pasta de arquivos dos avisos (privada). Sem ela os vídeos não sobem.
INSERT INTO storage.buckets (id, name, public) VALUES ('wiize-updates','wiize-updates', false) ON CONFLICT (id) DO NOTHING;


-- ===================== 0039_project_chat.sql =====================
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
DROP POLICY IF EXISTS project_comments_select ON public.project_comments;
CREATE POLICY project_comments_select ON public.project_comments FOR SELECT TO authenticated
USING (public.project_can_access(project_id));
DROP POLICY IF EXISTS project_comments_insert ON public.project_comments;
CREATE POLICY project_comments_insert ON public.project_comments FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND public.project_can_access(project_id));
DROP POLICY IF EXISTS project_comments_delete ON public.project_comments;
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
DROP TRIGGER IF EXISTS trg_project_comments_notify ON public.project_comments;
CREATE TRIGGER trg_project_comments_notify AFTER INSERT ON public.project_comments
FOR EACH ROW EXECUTE FUNCTION public.project_comments_notify();
-- ===================== 0040_projects_security_hardening.sql =====================
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
DROP POLICY IF EXISTS projects_update ON public.projects;
CREATE POLICY projects_update ON public.projects FOR UPDATE TO authenticated
  USING (public.project_can_manage(id))
  WITH CHECK (owner_user_id = public.get_account_owner(auth.uid()));

-- Stages: everyone with access reads, only managers change
DROP POLICY IF EXISTS project_stages_all ON public.project_stages;
DROP POLICY IF EXISTS project_stages_select ON public.project_stages;
CREATE POLICY project_stages_select ON public.project_stages FOR SELECT TO authenticated USING (public.project_can_access(project_id));
DROP POLICY IF EXISTS project_stages_write ON public.project_stages;
CREATE POLICY project_stages_write ON public.project_stages FOR INSERT TO authenticated WITH CHECK (public.project_can_manage(project_id));
DROP POLICY IF EXISTS project_stages_update ON public.project_stages;
CREATE POLICY project_stages_update ON public.project_stages FOR UPDATE TO authenticated USING (public.project_can_manage(project_id)) WITH CHECK (public.project_can_manage(project_id));
DROP POLICY IF EXISTS project_stages_delete ON public.project_stages;
CREATE POLICY project_stages_delete ON public.project_stages FOR DELETE TO authenticated USING (public.project_can_manage(project_id));

-- Tasks: managers do everything; assignees only update their own tasks
DROP POLICY IF EXISTS project_tasks_all ON public.project_tasks;
DROP POLICY IF EXISTS project_tasks_select ON public.project_tasks;
CREATE POLICY project_tasks_select ON public.project_tasks FOR SELECT TO authenticated USING (public.project_can_access(project_id));
DROP POLICY IF EXISTS project_tasks_insert ON public.project_tasks;
CREATE POLICY project_tasks_insert ON public.project_tasks FOR INSERT TO authenticated WITH CHECK (public.project_can_manage(project_id));
DROP POLICY IF EXISTS project_tasks_update ON public.project_tasks;
CREATE POLICY project_tasks_update ON public.project_tasks FOR UPDATE TO authenticated
  USING (public.project_can_manage(project_id) OR (assignee_id = auth.uid() AND public.project_can_access(project_id)))
  WITH CHECK (public.project_can_access(project_id));
DROP POLICY IF EXISTS project_tasks_delete ON public.project_tasks;
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
DROP TRIGGER IF EXISTS trg_project_tasks_validate_refs ON public.project_tasks;
CREATE TRIGGER trg_project_tasks_validate_refs BEFORE INSERT OR UPDATE ON public.project_tasks
  FOR EACH ROW EXECUTE FUNCTION public.project_tasks_validate_refs();

REVOKE ALL ON public.projects, public.project_stages, public.project_tasks, public.project_task_checklist_items,
  public.project_activity, public.project_files, public.project_comments, public.project_task_comments, public.user_notifications FROM anon;
-- ===================== 0041_fix_calendar_overlap_all_day.sql =====================
-- Corrige "Esse horário já está ocupado" ao editar/concluir tarefas.
-- Eventos de dia todo e concluídos/cancelados não ocupam horário.
CREATE OR REPLACE FUNCTION public.calendar_events_check_overlap()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IN ('cancelled','completed') OR COALESCE(NEW.all_day,false) THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE'
     AND NEW.starts_at = OLD.starts_at AND NEW.ends_at = OLD.ends_at
     AND NEW.assigned_user_id IS NOT DISTINCT FROM OLD.assigned_user_id
     AND NEW.all_day IS NOT DISTINCT FROM OLD.all_day THEN
    RETURN NEW;
  END IF;
  IF NEW.assigned_user_id IS NULL THEN RETURN NEW; END IF;
  IF EXISTS (
    SELECT 1 FROM public.calendar_events e
    WHERE e.assigned_user_id = NEW.assigned_user_id
      AND e.id <> NEW.id
      AND e.status NOT IN ('cancelled','completed')
      AND COALESCE(e.all_day,false) = false
      AND tstzrange(e.starts_at, e.ends_at, '[)') && tstzrange(NEW.starts_at, NEW.ends_at, '[)')
  ) THEN
    RAISE EXCEPTION 'conflicting key value violates exclusion constraint "calendar_events_no_overlap"' USING ERRCODE = '23P01';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_calendar_events_no_overlap ON public.calendar_events;
DROP TRIGGER IF EXISTS trg_calendar_events_no_overlap ON public.calendar_events;
CREATE TRIGGER trg_calendar_events_no_overlap
BEFORE INSERT OR UPDATE OF starts_at, ends_at, assigned_user_id, status, all_day
ON public.calendar_events FOR EACH ROW EXECUTE FUNCTION public.calendar_events_check_overlap();

REVOKE ALL ON FUNCTION public.calendar_events_check_overlap() FROM PUBLIC, anon, authenticated;

-- Se a regra antiga (constraint) ainda existir, troca pela regra acima
ALTER TABLE public.calendar_events DROP CONSTRAINT IF EXISTS calendar_events_no_overlap;
-- ===================== 0042_wiize_evolui_suggestions_hub.sql =====================
-- Wiize Evolui: evolução aditiva da central de sugestões

-- 1) Novas colunas em suggestions (todas nullable ou com default — nada quebra)
ALTER TABLE public.suggestions
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS problem text,
  ADD COLUMN IF NOT EXISTS expected_behavior text,
  ADD COLUMN IF NOT EXISTS expected_benefit text,
  ADD COLUMN IF NOT EXISTS vote_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_status text NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS ai_summary text,
  ADD COLUMN IF NOT EXISTS ai_category text,
  ADD COLUMN IF NOT EXISTS ai_priority_score integer,
  ADD COLUMN IF NOT EXISTS ai_priority_reason text,
  ADD COLUMN IF NOT EXISTS ai_group_id uuid,
  ADD COLUMN IF NOT EXISTS ai_analyzed_at timestamptz,
  ADD COLUMN IF NOT EXISTS implemented_at timestamptz,
  ADD COLUMN IF NOT EXISTS implementation_notes text,
  ADD COLUMN IF NOT EXISTS admin_notes text;

CREATE INDEX IF NOT EXISTS idx_suggestions_is_public ON public.suggestions (is_public, vote_count DESC);
CREATE INDEX IF NOT EXISTS idx_suggestions_ai_status ON public.suggestions (ai_status);
CREATE INDEX IF NOT EXISTS idx_suggestions_ai_group ON public.suggestions (ai_group_id);

-- 2) Votos da comunidade (1 voto por usuário por sugestão, contagem via trigger)
CREATE TABLE IF NOT EXISTS public.suggestion_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id uuid NOT NULL REFERENCES public.suggestions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (suggestion_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.suggestion_votes TO authenticated;
GRANT ALL ON public.suggestion_votes TO service_role;
ALTER TABLE public.suggestion_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS suggestion_votes_select ON public.suggestion_votes;
CREATE POLICY suggestion_votes_select ON public.suggestion_votes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS suggestion_votes_insert ON public.suggestion_votes;
CREATE POLICY suggestion_votes_insert ON public.suggestion_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS suggestion_votes_delete ON public.suggestion_votes;
CREATE POLICY suggestion_votes_delete ON public.suggestion_votes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.suggestion_votes_sync_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.suggestions SET vote_count = vote_count + 1 WHERE id = NEW.suggestion_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.suggestions SET vote_count = GREATEST(vote_count - 1, 0) WHERE id = OLD.suggestion_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_suggestion_votes_count ON public.suggestion_votes;
DROP TRIGGER IF EXISTS trg_suggestion_votes_count ON public.suggestion_votes;
CREATE TRIGGER trg_suggestion_votes_count
AFTER INSERT OR DELETE ON public.suggestion_votes
FOR EACH ROW EXECUTE FUNCTION public.suggestion_votes_sync_count();

-- 3) Grupos consolidados pela IA (camada de organização — nunca apaga originais)
CREATE TABLE IF NOT EXISTS public.suggestion_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  problem text,
  solution text,
  category text,
  suggestions_count integer NOT NULL DEFAULT 0,
  users_count integer NOT NULL DEFAULT 0,
  companies_count integer NOT NULL DEFAULT 0,
  votes_total integer NOT NULL DEFAULT 0,
  priority_score integer,
  priority_reason text,
  confidence text,
  status text NOT NULL DEFAULT 'pendente',
  admin_locked boolean NOT NULL DEFAULT false,
  first_occurrence timestamptz,
  last_occurrence timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suggestion_groups TO authenticated;
GRANT ALL ON public.suggestion_groups TO service_role;
ALTER TABLE public.suggestion_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS suggestion_groups_admin_all ON public.suggestion_groups;
CREATE POLICY suggestion_groups_admin_all ON public.suggestion_groups FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.suggestions DROP CONSTRAINT IF EXISTS suggestions_ai_group_fk;
ALTER TABLE public.suggestions
  ADD CONSTRAINT suggestions_ai_group_fk FOREIGN KEY (ai_group_id) REFERENCES public.suggestion_groups(id) ON DELETE SET NULL;

-- 4) Planejamento mensal
CREATE TABLE IF NOT EXISTS public.suggestion_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  month_label text NOT NULL,
  status text NOT NULL DEFAULT 'em_avaliacao',
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suggestion_cycles TO authenticated;
GRANT ALL ON public.suggestion_cycles TO service_role;
ALTER TABLE public.suggestion_cycles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS suggestion_cycles_admin_all ON public.suggestion_cycles;
CREATE POLICY suggestion_cycles_admin_all ON public.suggestion_cycles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.suggestion_cycle_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES public.suggestion_cycles(id) ON DELETE CASCADE,
  group_id uuid REFERENCES public.suggestion_groups(id) ON DELETE SET NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'selecionada',
  justification text,
  responsible text,
  due_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suggestion_cycle_items TO authenticated;
GRANT ALL ON public.suggestion_cycle_items TO service_role;
ALTER TABLE public.suggestion_cycle_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS suggestion_cycle_items_admin_all ON public.suggestion_cycle_items;
CREATE POLICY suggestion_cycle_items_admin_all ON public.suggestion_cycle_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5) Publicações de roadmap (Em desenvolvimento / Últimas melhorias)
CREATE TABLE IF NOT EXISTS public.suggestion_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_item_id uuid REFERENCES public.suggestion_cycle_items(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  problem text,
  benefit text,
  category text,
  image_url text,
  doc_url text,
  status text NOT NULL DEFAULT 'em_desenvolvimento',
  expected_date date,
  released_at timestamptz,
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.suggestion_releases TO authenticated;
GRANT ALL ON public.suggestion_releases TO service_role;
ALTER TABLE public.suggestion_releases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS suggestion_releases_read_published ON public.suggestion_releases;
CREATE POLICY suggestion_releases_read_published ON public.suggestion_releases FOR SELECT TO authenticated
  USING (published = true OR public.has_role(auth.uid(), 'admin'));

-- 6) Log de auditoria administrativa
CREATE TABLE IF NOT EXISTS public.suggestion_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id uuid,
  details jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.suggestion_audit_log TO authenticated;
GRANT ALL ON public.suggestion_audit_log TO service_role;
ALTER TABLE public.suggestion_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS suggestion_audit_admin_select ON public.suggestion_audit_log;
CREATE POLICY suggestion_audit_admin_select ON public.suggestion_audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS suggestion_audit_admin_insert ON public.suggestion_audit_log;
CREATE POLICY suggestion_audit_admin_insert ON public.suggestion_audit_log FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 7) Listagem pública da comunidade: usuários autenticados leem sugestões públicas
DROP POLICY IF EXISTS suggestions_select_public ON public.suggestions;
DROP POLICY IF EXISTS suggestions_select_public ON public.suggestions;
CREATE POLICY suggestions_select_public ON public.suggestions FOR SELECT TO authenticated
  USING (is_public = true);

-- 8) Notificações no sininho (reutiliza user_notifications)
CREATE OR REPLACE FUNCTION public.suggestion_notify_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title text;
  v_body text;
  v_kind text := 'suggestion_status';
  v_dedupe text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_title := 'Sugestão recebida';
    v_body := 'Recebemos sua sugestão "' || left(NEW.title, 80) || '". Nossa equipe irá analisá-la.';
    v_dedupe := 'suggestion-received-' || NEW.id;
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    v_dedupe := 'suggestion-status-' || NEW.id || '-' || NEW.status;
    IF NEW.status = 'em_analise' THEN
      v_title := 'Sugestão em análise';
      v_body := 'Sua sugestão "' || left(NEW.title, 80) || '" foi selecionada para análise pela nossa equipe.';
    ELSIF NEW.status = 'planejada' THEN
      v_title := 'Sugestão planejada';
      v_body := 'Sua sugestão "' || left(NEW.title, 80) || '" entrou para o planejamento da Wiize.';
    ELSIF NEW.status = 'em_desenvolvimento' THEN
      v_title := 'Sugestão em desenvolvimento';
      v_body := 'Sua sugestão "' || left(NEW.title, 80) || '" já está sendo desenvolvida.';
    ELSIF NEW.status = 'implementada' THEN
      v_title := 'Sugestão implementada';
      v_body := 'Sua sugestão "' || left(NEW.title, 80) || '" virou funcionalidade. Obrigado por ajudar a construir a Wiize!';
    ELSE
      RETURN NEW;
    END IF;
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.user_notifications (user_id, kind, title, body, link, metadata, dedupe_key)
  VALUES (NEW.user_id, v_kind, v_title, v_body, '/sugestoes', jsonb_build_object('suggestion_id', NEW.id), v_dedupe)
  ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_suggestion_notify ON public.suggestions;
DROP TRIGGER IF EXISTS trg_suggestion_notify ON public.suggestions;
CREATE TRIGGER trg_suggestion_notify
AFTER INSERT OR UPDATE OF status ON public.suggestions
FOR EACH ROW EXECUTE FUNCTION public.suggestion_notify_user();
-- ===================== 0043_suggestion_ideas_voting.sql =====================
ALTER TABLE public.suggestion_groups
  ADD COLUMN IF NOT EXISTS public_status text NOT NULL DEFAULT 'em_votacao',
  ADD COLUMN IF NOT EXISTS community_votes integer NOT NULL DEFAULT 0;
ALTER TABLE public.suggestion_groups DROP CONSTRAINT IF EXISTS suggestion_groups_public_status_chk;
ALTER TABLE public.suggestion_groups ADD CONSTRAINT suggestion_groups_public_status_chk
  CHECK (public_status IN ('em_votacao','em_desenvolvimento','lancada','publicada'));

CREATE TABLE IF NOT EXISTS public.suggestion_group_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.suggestion_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.suggestion_group_votes TO authenticated;
GRANT ALL ON public.suggestion_group_votes TO service_role;
ALTER TABLE public.suggestion_group_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sgv_select_own ON public.suggestion_group_votes;
CREATE POLICY sgv_select_own ON public.suggestion_group_votes FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS sgv_insert_own ON public.suggestion_group_votes;
CREATE POLICY sgv_insert_own ON public.suggestion_group_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS sgv_delete_own ON public.suggestion_group_votes;
CREATE POLICY sgv_delete_own ON public.suggestion_group_votes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.suggestion_group_votes_sync()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.suggestion_groups SET community_votes = community_votes + 1 WHERE id = NEW.group_id;
    RETURN NEW;
  ELSE
    UPDATE public.suggestion_groups SET community_votes = GREATEST(community_votes - 1, 0) WHERE id = OLD.group_id;
    RETURN OLD;
  END IF;
END $$;
DROP TRIGGER IF EXISTS trg_suggestion_group_votes_sync ON public.suggestion_group_votes;
DROP TRIGGER IF EXISTS trg_suggestion_group_votes_sync ON public.suggestion_group_votes;
CREATE TRIGGER trg_suggestion_group_votes_sync AFTER INSERT OR DELETE ON public.suggestion_group_votes
FOR EACH ROW EXECUTE FUNCTION public.suggestion_group_votes_sync();

-- Lista pública e segura das ideias (só campos não sensíveis)
CREATE OR REPLACE FUNCTION public.list_suggestion_ideas(_period text DEFAULT 'all')
RETURNS TABLE(id uuid, name text, description text, category text, public_status text,
  community_votes integer, suggestions_count integer, demand integer, last_activity timestamptz, user_voted boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT g.id, g.name, g.description, g.category, g.public_status,
    g.community_votes, g.suggestions_count, g.community_votes + g.suggestions_count,
    COALESCE(g.last_occurrence, g.created_at),
    EXISTS (SELECT 1 FROM public.suggestion_group_votes v WHERE v.group_id = g.id AND v.user_id = auth.uid())
  FROM public.suggestion_groups g
  WHERE auth.uid() IS NOT NULL
    AND g.status NOT IN ('arquivado','revisao')
    AND (
      _period = 'all'
      OR (_period = 'month' AND COALESCE(g.last_occurrence, g.created_at) >= date_trunc('month', now()))
      OR (_period = 'year' AND COALESCE(g.last_occurrence, g.created_at) >= date_trunc('year', now()))
    )
  ORDER BY g.community_votes + g.suggestions_count DESC, COALESCE(g.last_occurrence, g.created_at) DESC
  LIMIT 200
$$;
REVOKE ALL ON FUNCTION public.list_suggestion_ideas(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.list_suggestion_ideas(text) TO authenticated;
-- ===================== 0044_wiize_updates.sql =====================
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'Comunicado', ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published', ADD COLUMN IF NOT EXISTS start_at timestamptz NOT NULL DEFAULT now(), ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS frequency text NOT NULL DEFAULT 'once', ADD COLUMN IF NOT EXISTS frequency_days integer NOT NULL DEFAULT 7, ADD COLUMN IF NOT EXISTS target_type text NOT NULL DEFAULT 'all', ADD COLUMN IF NOT EXISTS target_values text[] NOT NULL DEFAULT '{}', ADD COLUMN IF NOT EXISTS media_type text NOT NULL DEFAULT 'none', ADD COLUMN IF NOT EXISTS media_path text, ADD COLUMN IF NOT EXISTS poster_path text, ADD COLUMN IF NOT EXISTS button_label text, ADD COLUMN IF NOT EXISTS button_destination text, ADD COLUMN IF NOT EXISTS button_new_tab boolean NOT NULL DEFAULT false, ADD COLUMN IF NOT EXISTS created_by uuid, ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
CREATE TABLE IF NOT EXISTS public.announcement_user_state (announcement_id uuid NOT NULL REFERENCES public.announcements(id), user_id uuid NOT NULL, first_viewed_at timestamptz, last_viewed_at timestamptz, dismissed_at timestamptz, last_session_id text, view_count integer NOT NULL DEFAULT 0, click_count integer NOT NULL DEFAULT 0, PRIMARY KEY (announcement_id,user_id));
GRANT SELECT ON public.announcement_user_state TO authenticated; GRANT ALL ON public.announcement_user_state TO service_role;
ALTER TABLE public.announcement_user_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS updates_state_read ON public.announcement_user_state;
CREATE POLICY updates_state_read ON public.announcement_user_state FOR SELECT TO authenticated USING (user_id=auth.uid() OR public.is_current_user_admin());
INSERT INTO public.announcement_user_state (announcement_id,user_id,first_viewed_at,last_viewed_at,view_count) SELECT announcement_id,user_id,read_at,read_at,1 FROM public.user_announcement_reads ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS public.announcement_events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), announcement_id uuid NOT NULL REFERENCES public.announcements(id), user_id uuid NOT NULL, event_type text NOT NULL, session_id text NOT NULL, presentation_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(announcement_id,user_id,event_type,presentation_id));
GRANT SELECT ON public.announcement_events TO authenticated; GRANT ALL ON public.announcement_events TO service_role;
ALTER TABLE public.announcement_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS updates_events_read ON public.announcement_events;
CREATE POLICY updates_events_read ON public.announcement_events FOR SELECT TO authenticated USING (user_id=auth.uid() OR public.is_current_user_admin());
CREATE INDEX IF NOT EXISTS updates_events_period ON public.announcement_events(announcement_id,created_at);
CREATE TABLE IF NOT EXISTS public.announcement_admin_audit (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), announcement_id uuid NOT NULL, user_id uuid, action text NOT NULL, record jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.announcement_admin_audit TO authenticated; GRANT ALL ON public.announcement_admin_audit TO service_role;
ALTER TABLE public.announcement_admin_audit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS updates_audit_read ON public.announcement_admin_audit;
CREATE POLICY updates_audit_read ON public.announcement_admin_audit FOR SELECT TO authenticated USING (public.is_current_user_admin());
CREATE OR REPLACE FUNCTION public.update_audience_matches(a public.announcements,u uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.profiles p LEFT JOIN public.profiles owner ON owner.id=p.parent_owner_id WHERE p.id=u AND CASE a.target_type WHEN 'all' THEN true WHEN 'free' THEN coalesce(owner.plan,p.plan)='free' WHEN 'plans' THEN coalesce(owner.plan,p.plan)=ANY(a.target_values) WHEN 'users' THEN p.id::text=ANY(a.target_values) WHEN 'companies' THEN coalesce(p.parent_owner_id,p.id)::text=ANY(a.target_values) WHEN 'roles' THEN p.account_role::text=ANY(a.target_values) ELSE false END) $$;
CREATE OR REPLACE FUNCTION public.update_is_available(a public.announcements,u uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT u IS NOT NULL AND a.deleted_at IS NULL AND a.status IN ('published','scheduled') AND a.start_at<=now() AND a.expires_at>now() AND public.update_audience_matches(a,u) $$;
CREATE OR REPLACE FUNCTION public.update_is_due(a public.announcements,s public.announcement_user_state,sid text) RETURNS boolean LANGUAGE sql STABLE SET search_path=public AS $$ SELECT CASE WHEN s.last_viewed_at IS NULL THEN true WHEN a.frequency='once' THEN false WHEN a.frequency='login' THEN s.last_session_id IS DISTINCT FROM sid ELSE greatest(s.last_viewed_at,coalesce(s.dismissed_at,s.last_viewed_at)) + make_interval(days=>CASE a.frequency WHEN '7' THEN 7 WHEN '15' THEN 15 WHEN '30' THEN 30 ELSE a.frequency_days END)<=now() END $$;
DROP POLICY IF EXISTS "Anyone can view active announcements" ON public.announcements;
DROP POLICY IF EXISTS "Authenticated users can view announcements" ON public.announcements;
DROP POLICY IF EXISTS updates_read ON public.announcements;
CREATE POLICY updates_read ON public.announcements FOR SELECT TO authenticated USING(public.is_current_user_admin() OR public.update_is_available(announcements,auth.uid()));
GRANT SELECT,INSERT,UPDATE ON public.announcements TO authenticated; GRANT ALL ON public.announcements TO service_role;
GRANT SELECT,INSERT ON public.user_announcement_reads TO authenticated; GRANT ALL ON public.user_announcement_reads TO service_role;
GRANT SELECT,UPDATE,DELETE ON public.user_notifications TO authenticated; GRANT ALL ON public.user_notifications TO service_role;
CREATE OR REPLACE FUNCTION public.updates_validate() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
IF NOT public.is_current_user_admin() AND current_user NOT IN ('postgres','supabase_admin','service_role') THEN RAISE EXCEPTION 'Somente administradores'; END IF;
IF length(trim(NEW.title)) NOT BETWEEN 1 AND 180 OR length(NEW.content)>10000 OR NEW.expires_at<=NEW.start_at OR NEW.frequency NOT IN ('once','7','15','30','login','custom') OR NEW.frequency_days NOT BETWEEN 1 AND 365 OR NEW.status NOT IN ('draft','scheduled','published','paused','ended','archived') OR NEW.target_type NOT IN ('all','free','plans','users','companies','roles') OR NEW.media_type NOT IN ('none','image','video') THEN RAISE EXCEPTION 'Configuração inválida'; END IF;
IF NEW.button_destination IS NOT NULL AND NEW.button_destination<>'' AND NOT (NEW.button_destination ~ '^/[A-Za-z0-9][A-Za-z0-9/_?=&%#.+-]*$' OR NEW.button_destination ~ '^https://[A-Za-z0-9][A-Za-z0-9.-]*(:[0-9]+)?(/[^[:space:]\\]*)?$') THEN RAISE EXCEPTION 'Destino inseguro'; END IF;
IF NEW.media_path IS NOT NULL AND NEW.media_path !~ '^[a-f0-9-]{36}/[a-f0-9-]{36}\.(jpg|jpeg|png|webp|mp4|webm)$' THEN RAISE EXCEPTION 'Mídia inválida'; END IF;
IF NEW.poster_path IS NOT NULL AND NEW.poster_path !~ '^[a-f0-9-]{36}/[a-f0-9-]{36}\.(jpg|jpeg|png|webp)$' THEN RAISE EXCEPTION 'Capa inválida'; END IF;
NEW.updated_at=now(); NEW.created_by=coalesce(NEW.created_by,auth.uid()); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS updates_validate ON public.announcements;
CREATE TRIGGER updates_validate BEFORE INSERT OR UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.updates_validate();
CREATE OR REPLACE FUNCTION public.updates_audit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN INSERT INTO public.announcement_admin_audit(announcement_id,user_id,action,record) VALUES(NEW.id,auth.uid(),TG_OP,to_jsonb(NEW)); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS updates_audit ON public.announcements;
CREATE TRIGGER updates_audit AFTER INSERT OR UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.updates_audit();
CREATE OR REPLACE FUNCTION public.updates_sync_me() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
INSERT INTO public.user_notifications(user_id,kind,title,body,metadata,dedupe_key) SELECT auth.uid(),'wiize_update',a.title,left(a.content,220),jsonb_build_object('announcement_id',a.id,'category',a.category),'update:'||a.id||':'||auth.uid() FROM public.announcements a WHERE public.update_is_available(a,auth.uid()) ON CONFLICT(dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
END $$;
CREATE OR REPLACE FUNCTION public.updates_publish_notify() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
IF NEW.status IN ('published','scheduled') AND NEW.start_at<=now() AND NEW.expires_at>now() AND NEW.deleted_at IS NULL THEN
INSERT INTO public.user_notifications(user_id,kind,title,body,metadata,dedupe_key) SELECT p.id,'wiize_update',NEW.title,left(NEW.content,220),jsonb_build_object('announcement_id',NEW.id,'category',NEW.category),'update:'||NEW.id||':'||p.id FROM public.profiles p WHERE public.update_audience_matches(NEW,p.id) ON CONFLICT(dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
END IF; RETURN NEW; END $$;
DROP TRIGGER IF EXISTS updates_publish_notify ON public.announcements;
CREATE TRIGGER updates_publish_notify AFTER INSERT OR UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.updates_publish_notify();
CREATE OR REPLACE FUNCTION public.updates_list_due() RETURNS SETOF public.announcements LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT a.* FROM public.announcements a LEFT JOIN public.announcement_user_state s ON s.announcement_id=a.id AND s.user_id=auth.uid() WHERE public.update_is_available(a,auth.uid()) AND public.update_is_due(a,s,coalesce(auth.jwt()->>'session_id','')) AND auth.jwt()->>'session_id' IS NOT NULL ORDER BY a.priority DESC,a.start_at DESC LIMIT 50 $$;
CREATE OR REPLACE FUNCTION public.updates_record_event(_id uuid,_event text,_presentation uuid,_automatic boolean DEFAULT false) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE a public.announcements; s public.announcement_user_state; sid text=auth.jwt()->>'session_id'; inserted_count integer; BEGIN
IF auth.uid() IS NULL OR sid IS NULL OR _event NOT IN ('view','dismiss','click','reopen') THEN RAISE EXCEPTION 'Evento inválido'; END IF;
PERFORM pg_advisory_xact_lock(hashtext(auth.uid()::text||_id::text));
SELECT * INTO a FROM public.announcements WHERE id=_id;
IF a.id IS NULL OR NOT public.update_is_available(a,auth.uid()) THEN RETURN false; END IF;
SELECT * INTO s FROM public.announcement_user_state WHERE announcement_id=_id AND user_id=auth.uid();
IF _event='view' AND _automatic AND NOT public.update_is_due(a,s,sid) THEN RETURN false; END IF;
IF _event IN ('click','dismiss') AND NOT EXISTS(SELECT 1 FROM public.announcement_events WHERE announcement_id=_id AND user_id=auth.uid() AND presentation_id=_presentation AND event_type='view') THEN RETURN false; END IF;
IF _event='view' AND EXISTS(SELECT 1 FROM public.announcement_events WHERE announcement_id=_id AND user_id=auth.uid() AND event_type='view' AND created_at>now()-interval '5 seconds' AND presentation_id<>_presentation) THEN RETURN false; END IF;
INSERT INTO public.announcement_events(announcement_id,user_id,event_type,session_id,presentation_id) VALUES(_id,auth.uid(),_event,sid,_presentation) ON CONFLICT DO NOTHING; GET DIAGNOSTICS inserted_count=ROW_COUNT;
IF inserted_count=0 THEN RETURN true; END IF;
INSERT INTO public.announcement_user_state(announcement_id,user_id) VALUES(_id,auth.uid()) ON CONFLICT DO NOTHING;
UPDATE public.announcement_user_state SET first_viewed_at=CASE WHEN _event='view' THEN coalesce(first_viewed_at,now()) ELSE first_viewed_at END,last_viewed_at=CASE WHEN _event='view' THEN now() ELSE last_viewed_at END,last_session_id=CASE WHEN _event='view' THEN sid ELSE last_session_id END,dismissed_at=CASE WHEN _event='dismiss' THEN now() ELSE dismissed_at END,view_count=view_count+CASE WHEN _event='view' THEN 1 ELSE 0 END,click_count=click_count+CASE WHEN _event='click' THEN 1 ELSE 0 END WHERE announcement_id=_id AND user_id=auth.uid(); RETURN true; END $$;
CREATE OR REPLACE FUNCTION public.updates_metrics(_from timestamptz,_to timestamptz) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$ DECLARE result jsonb; BEGIN IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'Não autorizado'; END IF;
SELECT coalesce(jsonb_agg(to_jsonb(m)),'[]') INTO result FROM (SELECT a.id,(SELECT count(*) FROM public.profiles p WHERE public.update_audience_matches(a,p.id)) eligible,count(e.id) FILTER(WHERE e.event_type='view') views,count(DISTINCT e.user_id) FILTER(WHERE e.event_type='view') viewers,count(DISTINCT e.user_id) FILTER(WHERE e.event_type='dismiss') dismissed,count(e.id) FILTER(WHERE e.event_type='click') clicks,count(DISTINCT e.user_id) FILTER(WHERE e.event_type='click') clickers,max(e.created_at) last_interaction FROM public.announcements a LEFT JOIN public.announcement_events e ON e.announcement_id=a.id AND e.created_at>=_from AND e.created_at<_to WHERE a.deleted_at IS NULL GROUP BY a.id)m; RETURN result; END $$;
CREATE OR REPLACE FUNCTION public.protect_notification_content() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN IF NOT public.is_current_user_admin() AND current_user NOT IN ('postgres','supabase_admin','service_role') AND (to_jsonb(NEW)-'read_at'-'updated_at') IS DISTINCT FROM (to_jsonb(OLD)-'read_at'-'updated_at') THEN RAISE EXCEPTION 'Só é permitido marcar como lida'; END IF; RETURN NEW; END $$;
DROP TRIGGER IF EXISTS protect_notification_content ON public.user_notifications;
CREATE TRIGGER protect_notification_content BEFORE UPDATE ON public.user_notifications FOR EACH ROW EXECUTE FUNCTION public.protect_notification_content();
REVOKE ALL ON FUNCTION public.update_audience_matches(public.announcements,uuid),public.update_is_available(public.announcements,uuid),public.updates_sync_me(),public.updates_list_due(),public.updates_record_event(uuid,text,uuid,boolean),public.updates_metrics(timestamptz,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.update_is_available(public.announcements,uuid),public.updates_sync_me(),public.updates_list_due(),public.updates_record_event(uuid,text,uuid,boolean),public.updates_metrics(timestamptz,timestamptz) TO authenticated;
DROP POLICY IF EXISTS updates_media_admin_insert ON storage.objects;
CREATE POLICY updates_media_admin_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='wiize-updates' AND public.is_current_user_admin() AND (storage.foldername(name))[1]=auth.uid()::text AND ((metadata->>'mimetype' IN ('image/jpeg','image/png','image/webp') AND (metadata->>'size')::bigint<=5242880) OR (metadata->>'mimetype' IN ('video/mp4','video/webm') AND (metadata->>'size')::bigint<=52428800)));
DROP POLICY IF EXISTS updates_media_read ON storage.objects;
CREATE POLICY updates_media_read ON storage.objects FOR SELECT TO authenticated USING(bucket_id='wiize-updates' AND (public.is_current_user_admin() OR EXISTS(SELECT 1 FROM public.announcements a WHERE (a.media_path=name OR a.poster_path=name) AND public.update_is_available(a,auth.uid()))));
DROP POLICY IF EXISTS updates_media_delete ON storage.objects;
CREATE POLICY updates_media_delete ON storage.objects FOR DELETE TO authenticated USING(bucket_id='wiize-updates' AND public.is_current_user_admin() AND NOT EXISTS(SELECT 1 FROM public.announcements a WHERE a.media_path=name OR a.poster_path=name));
-- ===================== 0045_updates_security_guards.sql =====================
CREATE OR REPLACE FUNCTION public.update_is_available(a public.announcements,u uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT u IS NOT NULL AND (u=auth.uid() OR public.is_current_user_admin()) AND a.deleted_at IS NULL AND a.status IN ('published','scheduled') AND a.start_at<=now() AND a.expires_at>now() AND public.update_audience_matches(a,u) $$;
CREATE OR REPLACE FUNCTION public.updates_event_rate_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN IF (SELECT count(*) FROM public.announcement_events WHERE user_id=NEW.user_id AND created_at>now()-interval '1 minute')>=60 THEN RAISE EXCEPTION 'Muitas interações. Aguarde um minuto.'; END IF; IF NEW.event_type='reopen' AND NOT EXISTS(SELECT 1 FROM public.announcement_events WHERE user_id=NEW.user_id AND announcement_id=NEW.announcement_id AND presentation_id=NEW.presentation_id AND event_type='view') THEN RAISE EXCEPTION 'Visualização necessária'; END IF; RETURN NEW; END $$;
DROP TRIGGER IF EXISTS updates_event_rate_guard ON public.announcement_events;
CREATE TRIGGER updates_event_rate_guard BEFORE INSERT ON public.announcement_events FOR EACH ROW EXECUTE FUNCTION public.updates_event_rate_guard();
CREATE OR REPLACE FUNCTION public.updates_validate_media_fields() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
IF NEW.button_destination IS NOT NULL AND (NEW.button_destination ~* '^/admin([/?#]|$)' OR NEW.button_destination ~ '[<>"\\]' OR NEW.button_destination ~ '[[:cntrl:]]') THEN RAISE EXCEPTION 'Destino inseguro'; END IF;
IF NEW.media_path IS NOT NULL AND NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='wiize-updates' AND name=NEW.media_path AND CASE NEW.media_type WHEN 'image' THEN metadata->>'mimetype' IN ('image/jpeg','image/png','image/webp') WHEN 'video' THEN metadata->>'mimetype' IN ('video/mp4','video/webm') ELSE false END) THEN RAISE EXCEPTION 'Arquivo de mídia inválido'; END IF;
IF NEW.poster_path IS NOT NULL AND NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='wiize-updates' AND name=NEW.poster_path AND metadata->>'mimetype' IN ('image/jpeg','image/png','image/webp')) THEN RAISE EXCEPTION 'Imagem de capa inválida'; END IF; RETURN NEW; END $$;
DROP TRIGGER IF EXISTS updates_validate_media_fields ON public.announcements;
CREATE TRIGGER updates_validate_media_fields BEFORE INSERT OR UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.updates_validate_media_fields();
-- ===================== 0046_migration.sql =====================
UPDATE storage.objects SET metadata = jsonb_set(metadata,'{mimetype}','"video/mp4"') WHERE bucket_id='wiize-updates' AND name='11fc2a52-d56c-4e01-af15-f67421e248c3/5b7e1c2a-8d3f-4e6a-9b1c-2d3e4f5a6b7c.mp4';
ALTER TABLE public.user_notifications ADD COLUMN IF NOT EXISTS cleared_at timestamptz;
-- Vídeo do aviso "Novo: Projetos na Wiize". Só aplica se os arquivos já foram enviados
-- para o bucket wiize-updates (suba os vídeos e rode este script de novo para ativar).
UPDATE public.announcements SET media_type='video', media_path='11fc2a52-d56c-4e01-af15-f67421e248c3/5b7e1c2a-8d3f-4e6a-9b1c-2d3e4f5a6b7c.mp4', poster_path='11fc2a52-d56c-4e01-af15-f67421e248c3/ad4b3f7e-5a6b-4c8d-8e9f-4a5b6c7d8e9f.jpg' WHERE id='11fc2a52-d56c-4e01-af15-f67421e248c3' AND EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='wiize-updates' AND name='11fc2a52-d56c-4e01-af15-f67421e248c3/5b7e1c2a-8d3f-4e6a-9b1c-2d3e4f5a6b7c.mp4') AND EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='wiize-updates' AND name='11fc2a52-d56c-4e01-af15-f67421e248c3/ad4b3f7e-5a6b-4c8d-8e9f-4a5b6c7d8e9f.jpg');
DELETE FROM public.announcement_user_state WHERE announcement_id='11fc2a52-d56c-4e01-af15-f67421e248c3' AND user_id='62ba5c53-a297-49cd-9ca3-b44302fc59f4';
UPDATE public.user_notifications SET read_at=NULL, cleared_at=NULL WHERE user_id='62ba5c53-a297-49cd-9ca3-b44302fc59f4' AND dedupe_key='update:11fc2a52-d56c-4e01-af15-f67421e248c3:62ba5c53-a297-49cd-9ca3-b44302fc59f4';
-- ===================== 0047_migration.sql =====================
CREATE OR REPLACE FUNCTION public.updates_list_due()
 RETURNS SETOF announcements LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $f$ SELECT a.* FROM public.announcements a LEFT JOIN public.announcement_user_state s ON s.announcement_id=a.id AND s.user_id=auth.uid() WHERE auth.uid() IS NOT NULL AND public.update_is_available(a,auth.uid()) AND public.update_is_due(a,s,coalesce(auth.jwt()->>'session_id',auth.jwt()->>'iat','')) ORDER BY a.priority DESC,a.start_at DESC LIMIT 50 $f$;
DELETE FROM public.announcement_user_state WHERE announcement_id='11fc2a52-d56c-4e01-af15-f67421e248c3' AND user_id='62ba5c53-a297-49cd-9ca3-b44302fc59f4';
-- ===================== 0048_migration.sql =====================
DO $d$ DECLARE src text; BEGIN
src := pg_get_functiondef('public.updates_record_event(uuid,text,uuid,boolean)'::regprocedure);
src := replace(src, $$sid text=auth.jwt()->>'session_id';$$, $$sid text=coalesce(auth.jwt()->>'session_id',auth.jwt()->>'iat');$$);
EXECUTE src; END $d$;
-- ===================== 0049_migration.sql =====================
DELETE FROM public.announcement_user_state WHERE announcement_id='11fc2a52-d56c-4e01-af15-f67421e248c3' AND user_id='62ba5c53-a297-49cd-9ca3-b44302fc59f4';
-- ===================== 0050_migration.sql =====================
DELETE FROM public.announcement_user_state WHERE announcement_id='11fc2a52-d56c-4e01-af15-f67421e248c3' AND user_id='62ba5c53-a297-49cd-9ca3-b44302fc59f4';
-- ===================== 0051_migration.sql =====================
-- 0051: o vídeo da WiizePay tem aviso próprio (7c1e2a90), não pertence mais ao aviso de Projetos.
DELETE FROM public.announcement_user_state WHERE announcement_id='11fc2a52-d56c-4e01-af15-f67421e248c3' AND user_id='62ba5c53-a297-49cd-9ca3-b44302fc59f4';