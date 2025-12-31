-- Add instance_name column to whatsapp_numbers table
ALTER TABLE public.whatsapp_numbers 
ADD COLUMN instance_name text;