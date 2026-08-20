-- Influencer outreach layer (contacts, templates, campaigns, sends, events, suppressions)

CREATE TABLE IF NOT EXISTS public.influencer_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES public.influencer_prospects(id) ON DELETE CASCADE,
  type text NOT NULL,
  value text NOT NULL,
  normalized_value text NOT NULL,
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  confidence text NOT NULL DEFAULT 'media',
  status text NOT NULL DEFAULT 'encontrado',
  is_primary boolean NOT NULL DEFAULT false,
  note text,
  discovered_at timestamptz NOT NULL DEFAULT now(),
  last_contacted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT influencer_contacts_unique UNIQUE (prospect_id, type, normalized_value)
);

CREATE TABLE IF NOT EXISTS public.influencer_email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  subject text NOT NULL,
  body_html text NOT NULL,
  kind text NOT NULL DEFAULT 'primeiro_contato',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.influencer_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  template_id uuid REFERENCES public.influencer_email_templates(id) ON DELETE SET NULL,
  subject text NOT NULL,
  body_html text NOT NULL,
  status text NOT NULL DEFAULT 'rascunho',
  created_by uuid,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.influencer_campaign_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.influencer_campaigns(id) ON DELETE CASCADE,
  prospect_id uuid NOT NULL REFERENCES public.influencer_prospects(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.influencer_contacts(id) ON DELETE SET NULL,
  email text NOT NULL,
  subject text NOT NULL,
  body_html text NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  attempts integer NOT NULL DEFAULT 0,
  error_message text,
  provider_message_id text,
  reply_token text NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', ''),
  sent_at timestamptz,
  delivered_at timestamptz,
  failed_at timestamptz,
  replied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT influencer_campaign_recipients_unique UNIQUE (campaign_id, email)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_influencer_recipients_token
  ON public.influencer_campaign_recipients(reply_token);

CREATE TABLE IF NOT EXISTS public.influencer_email_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid REFERENCES public.influencer_campaign_recipients(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.influencer_campaigns(id) ON DELETE CASCADE,
  prospect_id uuid REFERENCES public.influencer_prospects(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  detail text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.influencer_email_suppressions (
  email text PRIMARY KEY,
  reason text NOT NULL DEFAULT 'opt_out',
  prospect_id uuid REFERENCES public.influencer_prospects(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.influencer_contacts TO authenticated;
GRANT ALL ON public.influencer_contacts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.influencer_email_templates TO authenticated;
GRANT ALL ON public.influencer_email_templates TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.influencer_campaigns TO authenticated;
GRANT ALL ON public.influencer_campaigns TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.influencer_campaign_recipients TO authenticated;
GRANT ALL ON public.influencer_campaign_recipients TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.influencer_email_events TO authenticated;
GRANT ALL ON public.influencer_email_events TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.influencer_email_suppressions TO authenticated;
GRANT ALL ON public.influencer_email_suppressions TO service_role;

ALTER TABLE public.influencer_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.influencer_email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.influencer_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.influencer_campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.influencer_email_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.influencer_email_suppressions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='influencer_contacts' AND policyname='Admins manage influencer_contacts') THEN
    CREATE POLICY "Admins manage influencer_contacts" ON public.influencer_contacts
      FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='influencer_email_templates' AND policyname='Admins manage influencer_email_templates') THEN
    CREATE POLICY "Admins manage influencer_email_templates" ON public.influencer_email_templates
      FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='influencer_campaigns' AND policyname='Admins manage influencer_campaigns') THEN
    CREATE POLICY "Admins manage influencer_campaigns" ON public.influencer_campaigns
      FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='influencer_campaign_recipients' AND policyname='Admins manage influencer_campaign_recipients') THEN
    CREATE POLICY "Admins manage influencer_campaign_recipients" ON public.influencer_campaign_recipients
      FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='influencer_email_events' AND policyname='Admins manage influencer_email_events') THEN
    CREATE POLICY "Admins manage influencer_email_events" ON public.influencer_email_events
      FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='influencer_email_suppressions' AND policyname='Admins manage influencer_email_suppressions') THEN
    CREATE POLICY "Admins manage influencer_email_suppressions" ON public.influencer_email_suppressions
      FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_influencer_contacts_prospect ON public.influencer_contacts(prospect_id);
CREATE INDEX IF NOT EXISTS idx_influencer_contacts_type ON public.influencer_contacts(type);
CREATE INDEX IF NOT EXISTS idx_influencer_recipients_campaign ON public.influencer_campaign_recipients(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_influencer_recipients_prospect ON public.influencer_campaign_recipients(prospect_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_influencer_events_prospect ON public.influencer_email_events(prospect_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_influencer_campaigns_created ON public.influencer_campaigns(created_at DESC);

DROP TRIGGER IF EXISTS update_influencer_contacts_updated_at ON public.influencer_contacts;
CREATE TRIGGER update_influencer_contacts_updated_at BEFORE UPDATE ON public.influencer_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_influencer_email_templates_updated_at ON public.influencer_email_templates;
CREATE TRIGGER update_influencer_email_templates_updated_at BEFORE UPDATE ON public.influencer_email_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_influencer_campaigns_updated_at ON public.influencer_campaigns;
CREATE TRIGGER update_influencer_campaigns_updated_at BEFORE UPDATE ON public.influencer_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_influencer_recipients_updated_at ON public.influencer_campaign_recipients;
CREATE TRIGGER update_influencer_recipients_updated_at BEFORE UPDATE ON public.influencer_campaign_recipients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Backfill: migra contatos já existentes nas colunas do prospect para a nova tabela normalizada
INSERT INTO public.influencer_contacts (prospect_id, type, value, normalized_value, sources, confidence, status)
SELECT p.id, 'email', lower(trim(p.contact_email)), lower(trim(p.contact_email)),
       jsonb_build_array(jsonb_build_object('source', 'youtube_about', 'discovered_at', now())), 'alta', 'encontrado'
FROM public.influencer_prospects p
WHERE p.contact_email IS NOT NULL AND p.contact_email <> ''
ON CONFLICT DO NOTHING;

INSERT INTO public.influencer_contacts (prospect_id, type, value, normalized_value, sources, confidence, status)
SELECT p.id, 'instagram', p.instagram_url, lower(p.instagram_url),
       jsonb_build_array(jsonb_build_object('source', 'youtube_about', 'discovered_at', now())), 'alta', 'encontrado'
FROM public.influencer_prospects p
WHERE p.instagram_url IS NOT NULL AND p.instagram_url <> ''
ON CONFLICT DO NOTHING;

INSERT INTO public.influencer_contacts (prospect_id, type, value, normalized_value, sources, confidence, status)
SELECT p.id, 'website', p.website_url, lower(p.website_url),
       jsonb_build_array(jsonb_build_object('source', 'youtube_about', 'discovered_at', now())), 'media', 'encontrado'
FROM public.influencer_prospects p
WHERE p.website_url IS NOT NULL AND p.website_url <> ''
ON CONFLICT DO NOTHING;