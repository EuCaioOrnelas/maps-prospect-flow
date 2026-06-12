
CREATE TABLE IF NOT EXISTS public.chat_quick_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_owner_id uuid NOT NULL,
  created_by_user_id uuid NOT NULL,
  shortcut text NOT NULL,
  title text,
  content text NOT NULL DEFAULT '',
  media_url text,
  media_type text,
  media_filename text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS chat_quick_replies_owner_shortcut_idx
  ON public.chat_quick_replies (account_owner_id, lower(shortcut));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_quick_replies TO authenticated;
GRANT ALL ON public.chat_quick_replies TO service_role;

ALTER TABLE public.chat_quick_replies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quick_replies_select" ON public.chat_quick_replies;
CREATE POLICY "quick_replies_select" ON public.chat_quick_replies
  FOR SELECT TO authenticated
  USING (
    account_owner_id = auth.uid()
    OR account_owner_id IN (
      SELECT owner_user_id FROM public.account_members WHERE user_id = auth.uid() AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "quick_replies_insert" ON public.chat_quick_replies;
CREATE POLICY "quick_replies_insert" ON public.chat_quick_replies
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by_user_id = auth.uid()
    AND (
      account_owner_id = auth.uid()
      OR account_owner_id IN (
        SELECT owner_user_id FROM public.account_members WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );

DROP POLICY IF EXISTS "quick_replies_update" ON public.chat_quick_replies;
CREATE POLICY "quick_replies_update" ON public.chat_quick_replies
  FOR UPDATE TO authenticated
  USING (
    account_owner_id = auth.uid()
    OR account_owner_id IN (
      SELECT owner_user_id FROM public.account_members WHERE user_id = auth.uid() AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "quick_replies_delete" ON public.chat_quick_replies;
CREATE POLICY "quick_replies_delete" ON public.chat_quick_replies
  FOR DELETE TO authenticated
  USING (
    account_owner_id = auth.uid()
    OR created_by_user_id = auth.uid()
  );

CREATE OR REPLACE FUNCTION public.update_chat_quick_replies_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_chat_quick_replies_updated_at ON public.chat_quick_replies;
CREATE TRIGGER trg_chat_quick_replies_updated_at
  BEFORE UPDATE ON public.chat_quick_replies
  FOR EACH ROW EXECUTE FUNCTION public.update_chat_quick_replies_updated_at();
