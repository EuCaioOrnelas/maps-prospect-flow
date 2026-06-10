-- Force PostgREST schema cache reload
DO $$ BEGIN PERFORM pg_notify('pgrst', 'reload schema'); END $$;