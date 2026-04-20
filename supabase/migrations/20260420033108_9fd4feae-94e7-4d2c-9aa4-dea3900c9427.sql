-- Migrate legacy paying users to new search limits and grant grandfathered access
-- IMPORTANT: Does NOT touch subscription_price_cents or billing IDs (legacy pricing preserved)

-- Disable trigger that protects sensitive fields
ALTER TABLE public.profiles DISABLE TRIGGER protect_profile_fields;

-- Start: 1000 searches, grandfathered (legacy access to Fluxos/AI Agents)
UPDATE public.profiles
SET searches_limit = 1000,
    admin_assigned_plan = true,
    updated_at = NOW()
WHERE plan = 'start'
  AND subscription_current_period_end > NOW();

-- Growth: 3000 searches (no grandfather flag needed - growth already has full access)
UPDATE public.profiles
SET searches_limit = 3000,
    updated_at = NOW()
WHERE plan = 'growth'
  AND subscription_current_period_end > NOW();

-- Scale: 10000 searches
UPDATE public.profiles
SET searches_limit = 10000,
    updated_at = NOW()
WHERE plan = 'scale'
  AND subscription_current_period_end > NOW();

-- Re-enable trigger
ALTER TABLE public.profiles ENABLE TRIGGER protect_profile_fields;