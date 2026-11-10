CREATE OR REPLACE FUNCTION public.updates_record_event(_id uuid, _event text, _presentation uuid, _automatic boolean DEFAULT false)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ DECLARE a public.announcements; s public.announcement_user_state; sid text=coalesce(auth.jwt()->>'session_id',auth.jwt()->>'iat'); inserted_count integer; BEGIN
IF auth.uid() IS NULL OR sid IS NULL OR _event NOT IN ('view','dismiss','click','reopen') THEN RAISE EXCEPTION 'Evento inválido'; END IF;
PERFORM pg_advisory_xact_lock(hashtext(auth.uid()::text||_id::text));
SELECT * INTO a FROM public.announcements WHERE id=_id;
IF a.id IS NULL OR NOT public.update_is_available(a,auth.uid()) THEN RETURN false; END IF;
SELECT * INTO s FROM public.announcement_user_state WHERE announcement_id=_id AND user_id=auth.uid();
IF _event='view' AND _automatic AND NOT public.update_is_due(a,s,sid) THEN RETURN false; END IF;
IF _event IN ('click','dismiss') AND NOT EXISTS(SELECT 1 FROM public.announcement_events WHERE announcement_id=_id AND user_id=auth.uid() AND presentation_id=_presentation AND event_type='view') THEN RETURN false; END IF;
IF _event='view' AND _automatic AND EXISTS(SELECT 1 FROM public.announcement_events WHERE announcement_id=_id AND user_id=auth.uid() AND event_type='view' AND created_at>now()-interval '5 seconds' AND presentation_id<>_presentation) THEN RETURN false; END IF;
INSERT INTO public.announcement_events(announcement_id,user_id,event_type,session_id,presentation_id) VALUES(_id,auth.uid(),_event,sid,_presentation) ON CONFLICT DO NOTHING; GET DIAGNOSTICS inserted_count=ROW_COUNT;
IF inserted_count=0 THEN RETURN true; END IF;
INSERT INTO public.announcement_user_state(announcement_id,user_id) VALUES(_id,auth.uid()) ON CONFLICT DO NOTHING;
UPDATE public.announcement_user_state SET first_viewed_at=CASE WHEN _event='view' THEN coalesce(first_viewed_at,now()) ELSE first_viewed_at END,last_viewed_at=CASE WHEN _event='view' THEN now() ELSE last_viewed_at END,last_session_id=CASE WHEN _event='view' THEN sid ELSE last_session_id END,dismissed_at=CASE WHEN _event='dismiss' THEN now() ELSE dismissed_at END,view_count=view_count+CASE WHEN _event='view' THEN 1 ELSE 0 END,click_count=click_count+CASE WHEN _event='click' THEN 1 ELSE 0 END WHERE announcement_id=_id AND user_id=auth.uid();
-- Novidade vista no popup tambem fica lida no sino (mesma pessoa, mesmo aviso).
IF _event IN ('view','click','dismiss') THEN
  UPDATE public.user_notifications
  SET read_at = coalesce(read_at, now()), updated_at = now()
  WHERE user_id = auth.uid()
    AND kind = 'wiize_update'
    AND metadata->>'announcement_id' = _id::text
    AND read_at IS NULL;
END IF;
RETURN true; END $function$;