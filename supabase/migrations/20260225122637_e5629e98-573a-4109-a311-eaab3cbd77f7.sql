
-- Remove name column from revenue_leads (phone is the identifier)
ALTER TABLE public.revenue_leads ALTER COLUMN name SET DEFAULT NULL;

-- Make source_number_instance_id truly optional (it already is nullable, just ensure no constraint issues)
-- Add unique constraint on phone_e164 + user_id so same phone = same lead per user
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'revenue_leads_user_phone_unique'
  ) THEN
    -- First, merge duplicate leads (same phone + user) keeping the one with highest score
    WITH duplicates AS (
      SELECT id, user_id, phone_e164, score_total,
        ROW_NUMBER() OVER (PARTITION BY user_id, phone_e164 ORDER BY score_total DESC, created_at ASC) as rn
      FROM public.revenue_leads
    ),
    to_delete AS (
      SELECT id FROM duplicates WHERE rn > 1
    )
    DELETE FROM public.revenue_leads WHERE id IN (SELECT id FROM to_delete);

    ALTER TABLE public.revenue_leads 
      ADD CONSTRAINT revenue_leads_user_phone_unique UNIQUE (user_id, phone_e164);
  END IF;
END $$;
