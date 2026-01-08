-- Add avatar_url column to conversations table for storing group profile pictures
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS avatar_url TEXT;