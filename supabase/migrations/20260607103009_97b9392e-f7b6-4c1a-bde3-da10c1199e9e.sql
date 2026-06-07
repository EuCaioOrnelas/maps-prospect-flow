GRANT SELECT, INSERT ON public.support_tickets TO anon;
GRANT SELECT, INSERT, UPDATE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;

GRANT SELECT, INSERT ON public.support_messages TO anon;
GRANT SELECT, INSERT ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;

GRANT INSERT ON public.support_ratings TO anon;
GRANT SELECT, INSERT ON public.support_ratings TO authenticated;
GRANT ALL ON public.support_ratings TO service_role;

GRANT INSERT ON public.support_ticket_events TO anon;
GRANT SELECT, INSERT ON public.support_ticket_events TO authenticated;
GRANT ALL ON public.support_ticket_events TO service_role;