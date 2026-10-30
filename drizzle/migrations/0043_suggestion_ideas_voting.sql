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
CREATE POLICY sgv_select_own ON public.suggestion_group_votes FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY sgv_insert_own ON public.suggestion_group_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
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