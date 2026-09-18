CREATE TABLE IF NOT EXISTS public.meta_whatsapp_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  connection_id uuid REFERENCES public.user_waba_connections(id) ON DELETE CASCADE,
  waba_id text NOT NULL,
  meta_template_id text,
  name text NOT NULL,
  category text,
  language text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING',
  rejected_reason text,
  quality_score text,
  components jsonb NOT NULL DEFAULT '[]'::jsonb,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  submitted_at timestamptz,
  deleted_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_meta_wa_templates_meta_id
  ON public.meta_whatsapp_templates (waba_id, meta_template_id)
  WHERE meta_template_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_meta_wa_templates_name_lang
  ON public.meta_whatsapp_templates (owner_user_id, waba_id, name, language);

CREATE INDEX IF NOT EXISTS idx_meta_wa_templates_owner
  ON public.meta_whatsapp_templates (owner_user_id, updated_at DESC);

GRANT SELECT ON public.meta_whatsapp_templates TO authenticated;
GRANT ALL ON public.meta_whatsapp_templates TO service_role;

ALTER TABLE public.meta_whatsapp_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant reads own meta templates" ON public.meta_whatsapp_templates;
CREATE POLICY "tenant reads own meta templates"
ON public.meta_whatsapp_templates
FOR SELECT
TO authenticated
USING (owner_user_id = ANY (public.accessible_owner_ids()));

CREATE TABLE IF NOT EXISTS public.meta_template_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  actor_user_id uuid,
  template_id uuid,
  waba_id text,
  action text NOT NULL,
  success boolean NOT NULL DEFAULT true,
  status_code integer,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meta_template_audit_owner
  ON public.meta_template_audit_log (owner_user_id, created_at DESC);

GRANT SELECT ON public.meta_template_audit_log TO authenticated;
GRANT ALL ON public.meta_template_audit_log TO service_role;

ALTER TABLE public.meta_template_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant reads own meta template audit" ON public.meta_template_audit_log;
CREATE POLICY "tenant reads own meta template audit"
ON public.meta_template_audit_log
FOR SELECT
TO authenticated
USING (owner_user_id = ANY (public.accessible_owner_ids()));