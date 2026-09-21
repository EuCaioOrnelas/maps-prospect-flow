-- Origem automática via HTTP Referer (complementa UTM, não substitui)
ALTER TABLE public.form_submissions   ADD COLUMN IF NOT EXISTS detected_source text;
ALTER TABLE public.form_views         ADD COLUMN IF NOT EXISTS detected_source text;
ALTER TABLE public.tracked_link_clicks ADD COLUMN IF NOT EXISTS detected_source text;
ALTER TABLE public.leads              ADD COLUMN IF NOT EXISTS traffic_source text;
ALTER TABLE public.leads              ADD COLUMN IF NOT EXISTS traffic_referrer text;

CREATE INDEX IF NOT EXISTS idx_form_submissions_detected_source ON public.form_submissions (form_id, detected_source);
CREATE INDEX IF NOT EXISTS idx_leads_traffic_source ON public.leads (owner_user_id, traffic_source);