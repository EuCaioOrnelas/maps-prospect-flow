GRANT SELECT ON public.tracking_settings TO anon;
GRANT SELECT, UPDATE ON public.tracking_settings TO authenticated;
GRANT ALL ON public.tracking_settings TO service_role;
NOTIFY pgrst, 'reload schema';