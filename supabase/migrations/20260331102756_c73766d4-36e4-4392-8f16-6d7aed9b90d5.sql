
-- Allow warming_sessions and warming_search_assignments to exist without a linked number
-- This enables preserving warming state when a number is deleted and re-linked on reconnection via phone_key
ALTER TABLE public.warming_sessions ALTER COLUMN whatsapp_number_id DROP NOT NULL;
ALTER TABLE public.warming_search_assignments ALTER COLUMN whatsapp_number_id DROP NOT NULL;
