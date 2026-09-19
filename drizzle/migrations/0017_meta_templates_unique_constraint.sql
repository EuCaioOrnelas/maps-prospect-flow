DROP INDEX IF EXISTS public.uq_meta_wa_templates_meta_id;

ALTER TABLE public.meta_whatsapp_templates
  DROP CONSTRAINT IF EXISTS uq_meta_wa_templates_meta_id;

ALTER TABLE public.meta_whatsapp_templates
  ADD CONSTRAINT uq_meta_wa_templates_meta_id UNIQUE (waba_id, meta_template_id);