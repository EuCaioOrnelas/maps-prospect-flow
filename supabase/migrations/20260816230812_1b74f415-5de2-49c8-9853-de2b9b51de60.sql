ALTER TABLE public.lead_deals REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'lead_deals'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_deals';
  END IF;
END $$;
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS subject text;