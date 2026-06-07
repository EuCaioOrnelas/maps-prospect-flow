GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO authenticated;
GRANT SELECT, INSERT ON public.support_tickets TO anon;
GRANT ALL ON public.support_tickets TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_messages TO authenticated;
GRANT SELECT, INSERT ON public.support_messages TO anon;
GRANT ALL ON public.support_messages TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_ratings TO authenticated;
GRANT INSERT ON public.support_ratings TO anon;
GRANT ALL ON public.support_ratings TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_ticket_events TO authenticated;
GRANT INSERT ON public.support_ticket_events TO anon;
GRANT ALL ON public.support_ticket_events TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_ticket_history TO authenticated;
GRANT ALL ON public.support_ticket_history TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_incidents TO authenticated;
GRANT ALL ON public.support_incidents TO service_role;