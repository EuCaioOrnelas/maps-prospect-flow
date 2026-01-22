-- 1. Drop the trigger that creates leads from conversations (correct name)
DROP TRIGGER IF EXISTS trigger_create_lead_from_conversation ON public.conversations;

-- 2. Drop the function with CASCADE to handle dependencies
DROP FUNCTION IF EXISTS public.create_lead_from_conversation() CASCADE;

-- 3. Remove conversation_id column from leads (if exists)
ALTER TABLE public.leads DROP COLUMN IF EXISTS conversation_id;

-- 4. Drop chat-related tables in correct order (due to foreign keys)
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.group_member_avatars CASCADE;
DROP TABLE IF EXISTS public.quick_replies CASCADE;
DROP TABLE IF EXISTS public.contacts CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;