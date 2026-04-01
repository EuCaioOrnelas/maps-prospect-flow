
-- Add new enrichment columns to leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS rating numeric;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS review_count integer;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS phone_numbers jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS social_media jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS opportunity_level text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS closing_probability text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS ai_diagnosis text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS ai_recommended_action text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS enrichment_data jsonb;
