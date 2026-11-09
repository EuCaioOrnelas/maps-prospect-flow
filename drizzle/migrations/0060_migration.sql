ALTER TABLE public.chat_scheduled_messages ADD COLUMN IF NOT EXISTS is_outreach boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS chat_sched_outreach_owner_idx ON public.chat_scheduled_messages (owner_user_id, scheduled_at) WHERE is_outreach;

CREATE OR REPLACE FUNCTION public.schedule_outreach_message(_conversation_id uuid, _content text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  c record; conn record;
  _daily_limit constant int := 200;
  _window_limit constant int := 50;
  _window constant interval := interval '25 minutes';
  _min_gap constant interval := interval '20 seconds';
  _day_start timestamptz := date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
  _used int; _slot timestamptz; _last timestamptz; _win_count int; _oldest timestamptz; _id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sessão expirada'; END IF;
  _content := btrim(coalesce(_content, ''));
  IF _content = '' OR length(_content) > 4000 THEN RAISE EXCEPTION 'Mensagem inválida'; END IF;

  SELECT id, owner_user_id, waba_connection_id, contact_phone INTO c
    FROM chat_conversations WHERE id = _conversation_id;
  IF c.id IS NULL OR NOT (c.owner_user_id = ANY (accessible_owner_ids())) THEN
    RAISE EXCEPTION 'Conversa não encontrada';
  END IF;
  SELECT provider INTO conn FROM user_waba_connections WHERE id = c.waba_connection_id;
  IF conn.provider IS DISTINCT FROM 'evolution' THEN RAISE EXCEPTION 'Fila de abordagem disponível só no número de atendimento'; END IF;

  PERFORM pg_advisory_xact_lock(hashtext('outreach:' || c.owner_user_id::text));

  SELECT count(*) INTO _used FROM chat_scheduled_messages
   WHERE owner_user_id = c.owner_user_id AND is_outreach
     AND status IN ('pending','processing','sent') AND scheduled_at >= _day_start;
  IF _used >= _daily_limit THEN
    RAISE EXCEPTION 'Limite diário de % abordagens atingido. Tente novamente amanhã.', _daily_limit;
  END IF;

  _slot := now() + make_interval(secs => 25 + floor(random() * 46));

  SELECT max(scheduled_at) INTO _last FROM chat_scheduled_messages
   WHERE owner_user_id = c.owner_user_id AND is_outreach AND status IN ('pending','processing');
  IF _last IS NOT NULL AND _slot < _last + _min_gap THEN
    _slot := _last + _min_gap + make_interval(secs => floor(random() * 15));
  END IF;

  -- Até 50 abordagens em qualquer janela de 25 minutos: as excedentes esperam a vez.
  SELECT count(*), min(scheduled_at) INTO _win_count, _oldest FROM (
    SELECT scheduled_at FROM chat_scheduled_messages
     WHERE owner_user_id = c.owner_user_id AND is_outreach
       AND status IN ('pending','processing','sent')
       AND scheduled_at > _slot - _window
     ORDER BY scheduled_at DESC LIMIT _window_limit) w;
  IF _win_count >= _window_limit THEN
    _slot := _oldest + _window + make_interval(secs => 5 + floor(random() * 30));
  END IF;

  INSERT INTO chat_scheduled_messages (owner_user_id, created_by, conversation_id, waba_connection_id,
    contact_phone, kind, content, scheduled_at, status, sequence, is_outreach)
  VALUES (c.owner_user_id, auth.uid(), c.id, c.waba_connection_id, c.contact_phone, 'text', _content,
    _slot, 'pending', 0, true)
  RETURNING id INTO _id;

  RETURN jsonb_build_object('id', _id, 'scheduled_at', _slot, 'daily_used', _used + 1, 'daily_limit', _daily_limit);
END $$;

REVOKE ALL ON FUNCTION public.schedule_outreach_message(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.schedule_outreach_message(uuid, text) TO authenticated;