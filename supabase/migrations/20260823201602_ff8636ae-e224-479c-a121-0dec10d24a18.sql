ALTER TABLE public.influencer_messages REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'influencer_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.influencer_messages;
  END IF;
END $$;