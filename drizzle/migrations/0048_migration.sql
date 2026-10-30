DO $d$ DECLARE src text; BEGIN
src := pg_get_functiondef('public.updates_record_event(uuid,text,uuid,boolean)'::regprocedure);
src := replace(src, $$sid text=auth.jwt()->>'session_id';$$, $$sid text=coalesce(auth.jwt()->>'session_id',auth.jwt()->>'iat');$$);
EXECUTE src; END $d$;