ALTER TABLE public.lead_notes
  ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.lead_notes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_lead_notes_lead_created ON public.lead_notes (lead_id, created_at);
CREATE INDEX IF NOT EXISTS idx_lead_notes_owner ON public.lead_notes (owner_user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_notes TO authenticated;
GRANT ALL ON public.lead_notes TO service_role;