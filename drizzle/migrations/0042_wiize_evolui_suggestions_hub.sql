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
CREATE POLICY suggestion_votes_select ON public.suggestion_votes FOR SELECT TO authenticated USING (true);
CREATE POLICY suggestion_votes_insert ON public.suggestion_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
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
CREATE POLICY suggestion_groups_admin_all ON public.suggestion_groups FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

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
CREATE POLICY suggestion_audit_admin_select ON public.suggestion_audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY suggestion_audit_admin_insert ON public.suggestion_audit_log FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 7) Listagem pública da comunidade: usuários autenticados leem sugestões públicas
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
CREATE TRIGGER trg_suggestion_notify
AFTER INSERT OR UPDATE OF status ON public.suggestions
FOR EACH ROW EXECUTE FUNCTION public.suggestion_notify_user();