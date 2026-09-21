-- FORMS
CREATE TABLE IF NOT EXISTS public.forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL,
  created_by UUID,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL DEFAULT '',
  description TEXT,
  button_text TEXT NOT NULL DEFAULT 'Enviar',
  success_message TEXT NOT NULL DEFAULT 'Obrigado! Recebemos seus dados e entraremos em contato em breve.',
  status TEXT NOT NULL DEFAULT 'active',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  crm_enabled BOOLEAN NOT NULL DEFAULT true,
  crm_stage_id UUID,
  crm_responsibles UUID[] NOT NULL DEFAULT ARRAY[]::uuid[],
  notify_enabled BOOLEAN NOT NULL DEFAULT false,
  notify_user_ids UUID[] NOT NULL DEFAULT ARRAY[]::uuid[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_forms_owner ON public.forms(owner_user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.forms TO authenticated;
GRANT ALL ON public.forms TO service_role;
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "forms_select_own" ON public.forms FOR SELECT TO authenticated
  USING (owner_user_id = ANY (public.accessible_owner_ids()));
CREATE POLICY "forms_insert_own" ON public.forms FOR INSERT TO authenticated
  WITH CHECK (owner_user_id = ANY (public.accessible_owner_ids()));
CREATE POLICY "forms_update_own" ON public.forms FOR UPDATE TO authenticated
  USING (owner_user_id = ANY (public.accessible_owner_ids()));
CREATE POLICY "forms_delete_own" ON public.forms FOR DELETE TO authenticated
  USING (owner_user_id = ANY (public.accessible_owner_ids()));

-- FORM FIELDS
CREATE TABLE IF NOT EXISTS public.form_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL,
  field_type TEXT NOT NULL,
  label TEXT NOT NULL,
  name TEXT NOT NULL,
  placeholder TEXT,
  required BOOLEAN NOT NULL DEFAULT false,
  position INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_form_fields_form ON public.form_fields(form_id, position);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.form_fields TO authenticated;
GRANT ALL ON public.form_fields TO service_role;
ALTER TABLE public.form_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "form_fields_all_own" ON public.form_fields FOR ALL TO authenticated
  USING (owner_user_id = ANY (public.accessible_owner_ids()))
  WITH CHECK (owner_user_id = ANY (public.accessible_owner_ids()));

-- SUBMISSIONS
CREATE TABLE IF NOT EXISTS public.form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL,
  lead_id UUID,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  referrer TEXT,
  landing_url TEXT,
  user_agent TEXT,
  device TEXT,
  ip_hash TEXT,
  tracked_link_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_form_submissions_form ON public.form_submissions(form_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_form_submissions_owner ON public.form_submissions(owner_user_id);
GRANT SELECT, DELETE ON public.form_submissions TO authenticated;
GRANT ALL ON public.form_submissions TO service_role;
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "form_submissions_select_own" ON public.form_submissions FOR SELECT TO authenticated
  USING (owner_user_id = ANY (public.accessible_owner_ids()));
CREATE POLICY "form_submissions_delete_own" ON public.form_submissions FOR DELETE TO authenticated
  USING (owner_user_id = ANY (public.accessible_owner_ids()));

-- VIEWS
CREATE TABLE IF NOT EXISTS public.form_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  device TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_form_views_form ON public.form_views(form_id, created_at DESC);
GRANT SELECT ON public.form_views TO authenticated;
GRANT ALL ON public.form_views TO service_role;
ALTER TABLE public.form_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "form_views_select_own" ON public.form_views FOR SELECT TO authenticated
  USING (owner_user_id = ANY (public.accessible_owner_ids()));

-- TRACKED LINKS
CREATE TABLE IF NOT EXISTS public.tracked_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL,
  created_by UUID,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  destination_url TEXT NOT NULL,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tracked_links_owner ON public.tracked_links(owner_user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tracked_links TO authenticated;
GRANT ALL ON public.tracked_links TO service_role;
ALTER TABLE public.tracked_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tracked_links_all_own" ON public.tracked_links FOR ALL TO authenticated
  USING (owner_user_id = ANY (public.accessible_owner_ids()))
  WITH CHECK (owner_user_id = ANY (public.accessible_owner_ids()));

-- TRACKED LINK CLICKS
CREATE TABLE IF NOT EXISTS public.tracked_link_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracked_link_id UUID NOT NULL REFERENCES public.tracked_links(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  device TEXT,
  visitor_hash TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tracked_link_clicks_link ON public.tracked_link_clicks(tracked_link_id, created_at DESC);
GRANT SELECT ON public.tracked_link_clicks TO authenticated;
GRANT ALL ON public.tracked_link_clicks TO service_role;
ALTER TABLE public.tracked_link_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tracked_link_clicks_select_own" ON public.tracked_link_clicks FOR SELECT TO authenticated
  USING (owner_user_id = ANY (public.accessible_owner_ids()));

-- Relação Formulário → Lead
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS form_submission_id UUID;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS form_id UUID;
CREATE INDEX IF NOT EXISTS idx_leads_form_id ON public.leads(form_id);