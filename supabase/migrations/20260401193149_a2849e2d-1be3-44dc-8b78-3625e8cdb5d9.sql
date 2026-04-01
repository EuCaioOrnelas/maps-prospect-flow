
-- Delete duplicates keeping the newest entry
DELETE FROM public.leads a
USING public.leads b
WHERE a.user_id = b.user_id
  AND a.phone = b.phone
  AND a.id < b.id;

-- Now create the unique index
CREATE UNIQUE INDEX idx_leads_user_phone_unique ON public.leads (user_id, phone);
