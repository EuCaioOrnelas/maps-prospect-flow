-- Drop the old unique constraint that blocks per-campaign scoping
ALTER TABLE public.ignored_contacts DROP CONSTRAINT ignored_contacts_user_id_phone_key;

-- Drop the redundant index too
DROP INDEX IF EXISTS idx_ignored_contacts_user_phone;

-- Create new unique constraint scoped per campaign
-- Using COALESCE to handle NULL campaign_id (legacy rows)
CREATE UNIQUE INDEX ignored_contacts_user_phone_campaign_key 
ON public.ignored_contacts (user_id, phone, COALESCE(campaign_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- Add index for efficient per-campaign lookups
CREATE INDEX idx_ignored_contacts_campaign ON public.ignored_contacts (user_id, campaign_id, phone);