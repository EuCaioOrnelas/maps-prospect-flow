CREATE TABLE public.influencer_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  query_description text NOT NULL,
  country text NOT NULL DEFAULT 'BR',
  language text NOT NULL DEFAULT 'pt',
  keywords text[] NOT NULL DEFAULT '{}',
  generated_queries text[] NOT NULL DEFAULT '{}',
  min_subscribers integer NOT NULL DEFAULT 5000,
  max_subscribers integer NOT NULL DEFAULT 100000,
  min_views integer,
  recency_days integer NOT NULL DEFAULT 90,
  results_requested integer NOT NULL DEFAULT 20,
  results_found integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'running',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.influencer_prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id uuid REFERENCES public.influencer_searches(id) ON DELETE SET NULL,
  platform text NOT NULL DEFAULT 'youtube',
  youtube_channel_id text NOT NULL,
  channel_handle text,
  channel_name text NOT NULL,
  channel_url text,
  channel_description text,
  thumbnail_url text,
  country text,
  subscriber_count bigint,
  video_count bigint,
  total_view_count bigint,
  avg_recent_views bigint,
  latest_video_at timestamptz,
  fit_score integer,
  content_fit_score integer,
  audience_fit_score integer,
  reach_score integer,
  commercial_score integer,
  quality_score integer,
  fit_category text,
  ai_summary text,
  ai_recommendation text,
  ai_reasoning jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'novo',
  saved boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT influencer_prospects_channel_unique UNIQUE (platform, youtube_channel_id)
);

CREATE TABLE public.influencer_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES public.influencer_prospects(id) ON DELETE CASCADE,
  youtube_video_id text NOT NULL,
  title text,
  description text,
  video_url text,
  published_at timestamptz,
  view_count bigint,
  like_count bigint,
  comment_count bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT influencer_videos_unique UNIQUE (prospect_id, youtube_video_id)
);

CREATE TABLE public.influencer_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES public.influencer_prospects(id) ON DELETE CASCADE,
  search_id uuid REFERENCES public.influencer_searches(id) ON DELETE SET NULL,
  model text NOT NULL,
  prompt_version text NOT NULL,
  analysis_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.influencer_searches TO authenticated;
GRANT ALL ON public.influencer_searches TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.influencer_prospects TO authenticated;
GRANT ALL ON public.influencer_prospects TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.influencer_videos TO authenticated;
GRANT ALL ON public.influencer_videos TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.influencer_analysis TO authenticated;
GRANT ALL ON public.influencer_analysis TO service_role;

ALTER TABLE public.influencer_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.influencer_prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.influencer_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.influencer_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage influencer_searches" ON public.influencer_searches
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage influencer_prospects" ON public.influencer_prospects
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage influencer_videos" ON public.influencer_videos
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage influencer_analysis" ON public.influencer_analysis
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_influencer_prospects_search ON public.influencer_prospects(search_id);
CREATE INDEX idx_influencer_prospects_score ON public.influencer_prospects(fit_score DESC);
CREATE INDEX idx_influencer_prospects_status ON public.influencer_prospects(status);
CREATE INDEX idx_influencer_videos_prospect ON public.influencer_videos(prospect_id);
CREATE INDEX idx_influencer_analysis_prospect ON public.influencer_analysis(prospect_id);
CREATE INDEX idx_influencer_searches_admin ON public.influencer_searches(admin_id, created_at DESC);

CREATE TRIGGER update_influencer_searches_updated_at BEFORE UPDATE ON public.influencer_searches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_influencer_prospects_updated_at BEFORE UPDATE ON public.influencer_prospects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();