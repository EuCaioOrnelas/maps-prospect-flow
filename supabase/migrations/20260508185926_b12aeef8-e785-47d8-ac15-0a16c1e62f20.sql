
-- 1) support_tickets: prazo + manual
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS due_at timestamptz DEFAULT (now() + interval '48 hours'),
  ADD COLUMN IF NOT EXISTS is_manual boolean NOT NULL DEFAULT false;

-- Backfill prazo para tickets existentes
UPDATE public.support_tickets
SET due_at = created_at + interval '48 hours'
WHERE due_at IS NULL;

-- 2) support_ratings: NPS 0-10
ALTER TABLE public.support_ratings
  ADD COLUMN IF NOT EXISTS nps_score integer,
  ADD COLUMN IF NOT EXISTS nps_recommend integer,
  ADD COLUMN IF NOT EXISTS nps_comment text;

ALTER TABLE public.support_ratings
  ALTER COLUMN stars DROP NOT NULL;

ALTER TABLE public.support_ratings
  DROP CONSTRAINT IF EXISTS support_ratings_stars_check;

ALTER TABLE public.support_ratings
  ADD CONSTRAINT support_ratings_stars_check CHECK (stars IS NULL OR (stars >= 1 AND stars <= 5));

ALTER TABLE public.support_ratings
  ADD CONSTRAINT support_ratings_nps_score_check CHECK (nps_score IS NULL OR (nps_score >= 0 AND nps_score <= 10));

ALTER TABLE public.support_ratings
  ADD CONSTRAINT support_ratings_nps_recommend_check CHECK (nps_recommend IS NULL OR (nps_recommend >= 0 AND nps_recommend <= 10));

-- 3) knowledge_base: vídeo
ALTER TABLE public.knowledge_base
  ADD COLUMN IF NOT EXISTS video_url text;

-- 4) histórico de tickets
CREATE TABLE IF NOT EXISTS public.support_ticket_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text,
  action_type text NOT NULL DEFAULT 'note',
  content text,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_ticket_history_ticket
  ON public.support_ticket_history (ticket_id, created_at DESC);

ALTER TABLE public.support_ticket_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ticket_history_admin_all" ON public.support_ticket_history;
CREATE POLICY "ticket_history_admin_all"
  ON public.support_ticket_history
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 5) Bucket privado para anexos do histórico
INSERT INTO storage.buckets (id, name, public)
VALUES ('support-attachments', 'support-attachments', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "support_attachments_admin_select" ON storage.objects;
CREATE POLICY "support_attachments_admin_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'support-attachments' AND has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "support_attachments_admin_insert" ON storage.objects;
CREATE POLICY "support_attachments_admin_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'support-attachments' AND has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "support_attachments_admin_delete" ON storage.objects;
CREATE POLICY "support_attachments_admin_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'support-attachments' AND has_role(auth.uid(), 'admin'::app_role));
