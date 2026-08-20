DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='influencer_campaigns') THEN
    ALTER TABLE public.influencer_campaigns REPLICA IDENTITY FULL;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.influencer_campaigns;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='influencer_campaign_recipients') THEN
    ALTER TABLE public.influencer_campaign_recipients REPLICA IDENTITY FULL;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.influencer_campaign_recipients;
  END IF;
END $$;