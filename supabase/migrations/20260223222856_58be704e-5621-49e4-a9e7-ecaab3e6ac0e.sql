
-- Add api_tier column to track which Evolution API a number belongs to
ALTER TABLE public.whatsapp_numbers ADD COLUMN IF NOT EXISTS api_tier text NOT NULL DEFAULT 'free';

-- Add comment for clarity
COMMENT ON COLUMN public.whatsapp_numbers.api_tier IS 'Which Evolution API this number uses: free (testing) or paid (production)';
