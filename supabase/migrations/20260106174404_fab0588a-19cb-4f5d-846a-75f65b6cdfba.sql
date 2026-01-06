-- Enable full replica identity for complete realtime sync
ALTER TABLE public.messages REPLICA IDENTITY FULL;