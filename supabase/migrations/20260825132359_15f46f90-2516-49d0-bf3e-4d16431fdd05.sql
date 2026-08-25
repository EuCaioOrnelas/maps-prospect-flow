ALTER TABLE public.influencer_prospects
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS profile_id text,
  ADD COLUMN IF NOT EXISTS following_count bigint,
  ADD COLUMN IF NOT EXISTS category_name text,
  ADD COLUMN IF NOT EXISTS is_verified boolean,
  ADD COLUMN IF NOT EXISTS is_business_account boolean,
  ADD COLUMN IF NOT EXISTS is_professional_account boolean,
  ADD COLUMN IF NOT EXISTS is_private boolean,
  ADD COLUMN IF NOT EXISTS avg_likes bigint,
  ADD COLUMN IF NOT EXISTS avg_comments bigint,
  ADD COLUMN IF NOT EXISTS engagement_rate numeric,
  ADD COLUMN IF NOT EXISTS collected_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_influencer_prospects_username ON public.influencer_prospects (platform, lower(username));

ALTER TABLE public.influencer_searches
  ADD COLUMN IF NOT EXISTS platform text NOT NULL DEFAULT 'youtube',
  ADD COLUMN IF NOT EXISTS terms text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS stats jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_influencer_searches_platform ON public.influencer_searches (platform, created_at DESC);