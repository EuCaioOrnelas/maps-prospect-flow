-- Prospecção Web: campos de origem e dados de site nos leads existentes
ALTER TABLE public.leads ALTER COLUMN phone DROP NOT NULL;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'maps',
  ADD COLUMN IF NOT EXISTS domain text,
  ADD COLUMN IF NOT EXISTS search_query text,
  ADD COLUMN IF NOT EXISTS search_location text,
  ADD COLUMN IF NOT EXISTS web_title text,
  ADD COLUMN IF NOT EXISTS web_snippet text;

UPDATE public.leads SET source = 'maps' WHERE source IS NULL;

CREATE INDEX IF NOT EXISTS idx_leads_owner_domain ON public.leads (owner_user_id, domain) WHERE domain IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_leads_user_domain ON public.leads (user_id, domain) WHERE domain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_source ON public.leads (owner_user_id, source);

ALTER TABLE public.search_history
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'maps',
  ADD COLUMN IF NOT EXISTS extra_term text,
  ADD COLUMN IF NOT EXISTS requested_count integer,
  ADD COLUMN IF NOT EXISTS status text;