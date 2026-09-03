-- ============ 1. Rate limit dedicado (janela deslizante) ============
CREATE TABLE IF NOT EXISTS public.wiize_api_rate_counters (
  bucket_key text NOT NULL,
  window_start timestamptz NOT NULL,
  count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket_key, window_start)
);
GRANT ALL ON public.wiize_api_rate_counters TO service_role;
ALTER TABLE public.wiize_api_rate_counters ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS wiize_api_rate_counters_window_idx
  ON public.wiize_api_rate_counters (window_start);

-- ============ 2. Antifraude: eventos e banimentos ============
CREATE TABLE IF NOT EXISTS public.wiize_api_abuse_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  api_key_id uuid,
  ip_address text,
  kind text NOT NULL,
  severity integer NOT NULL DEFAULT 1,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wiize_api_abuse_events TO authenticated;
GRANT ALL ON public.wiize_api_abuse_events TO service_role;
ALTER TABLE public.wiize_api_abuse_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "abuse owner read" ON public.wiize_api_abuse_events;
CREATE POLICY "abuse owner read" ON public.wiize_api_abuse_events
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS wiize_api_abuse_lookup_idx
  ON public.wiize_api_abuse_events (kind, created_at DESC);
CREATE INDEX IF NOT EXISTS wiize_api_abuse_user_idx
  ON public.wiize_api_abuse_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS wiize_api_abuse_ip_idx
  ON public.wiize_api_abuse_events (ip_address, created_at DESC);

CREATE TABLE IF NOT EXISTS public.wiize_api_bans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL CHECK (scope IN ('account','key','ip')),
  subject text NOT NULL,
  user_id uuid,
  reason text NOT NULL,
  kind text,
  strike integer NOT NULL DEFAULT 1,
  banned_until timestamptz,
  permanent boolean NOT NULL DEFAULT false,
  released_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wiize_api_bans TO authenticated;
GRANT ALL ON public.wiize_api_bans TO service_role;
ALTER TABLE public.wiize_api_bans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bans owner read" ON public.wiize_api_bans;
CREATE POLICY "bans owner read" ON public.wiize_api_bans
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS wiize_api_bans_active_idx
  ON public.wiize_api_bans (scope, subject, released_at, banned_until);

-- ============ 3. Rate limit: função em janela deslizante ============
CREATE OR REPLACE FUNCTION public.wiize_api_rate_check(
  _bucket text,
  _limit integer,
  _window_seconds integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_now timestamptz := now();
  v_win_start timestamptz;
  v_prev_start timestamptz;
  v_cur integer := 0;
  v_prev integer := 0;
  v_elapsed numeric;
  v_weighted numeric;
BEGIN
  IF _limit IS NULL OR _limit <= 0 THEN
    RETURN jsonb_build_object('allowed', true, 'remaining', 0, 'retry_after', 0);
  END IF;

  v_win_start := to_timestamp(floor(extract(epoch FROM v_now) / _window_seconds) * _window_seconds);
  v_prev_start := v_win_start - make_interval(secs => _window_seconds);
  v_elapsed := extract(epoch FROM v_now) - extract(epoch FROM v_win_start);

  SELECT COALESCE(count, 0) INTO v_prev
    FROM public.wiize_api_rate_counters
   WHERE bucket_key = _bucket AND window_start = v_prev_start;

  INSERT INTO public.wiize_api_rate_counters (bucket_key, window_start, count)
  VALUES (_bucket, v_win_start, 1)
  ON CONFLICT (bucket_key, window_start)
  DO UPDATE SET count = public.wiize_api_rate_counters.count + 1
  RETURNING count INTO v_cur;

  v_weighted := v_cur + v_prev * ((_window_seconds - v_elapsed) / _window_seconds);

  IF v_weighted > _limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'limit', _limit,
      'remaining', 0,
      'retry_after', GREATEST(1, CEIL(_window_seconds - v_elapsed)::int),
      'reset_at', extract(epoch FROM v_win_start + make_interval(secs => _window_seconds))::bigint
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'limit', _limit,
    'remaining', GREATEST(0, _limit - CEIL(v_weighted)::int),
    'retry_after', 0,
    'reset_at', extract(epoch FROM v_win_start + make_interval(secs => _window_seconds))::bigint
  );
END;
$$;
REVOKE ALL ON FUNCTION public.wiize_api_rate_check(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wiize_api_rate_check(text, integer, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.wiize_api_rate_gc()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH d AS (
    DELETE FROM public.wiize_api_rate_counters
     WHERE window_start < now() - interval '2 days'
     RETURNING 1
  ) SELECT COALESCE(count(*), 0)::int FROM d;
$$;
REVOKE ALL ON FUNCTION public.wiize_api_rate_gc() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wiize_api_rate_gc() TO service_role;

-- ============ 4. Antifraude: verificação de banimento ============
CREATE OR REPLACE FUNCTION public.wiize_api_check_bans(
  _user_id uuid,
  _api_key_id uuid,
  _ip text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_ban public.wiize_api_bans%ROWTYPE;
BEGIN
  SELECT * INTO v_ban
    FROM public.wiize_api_bans
   WHERE released_at IS NULL
     AND (permanent OR banned_until > now())
     AND (
       (scope = 'account' AND _user_id IS NOT NULL AND subject = _user_id::text)
       OR (scope = 'key' AND _api_key_id IS NOT NULL AND subject = _api_key_id::text)
       OR (scope = 'ip' AND _ip IS NOT NULL AND subject = _ip)
     )
   ORDER BY permanent DESC, banned_until DESC NULLS FIRST
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('banned', false);
  END IF;

  RETURN jsonb_build_object(
    'banned', true,
    'scope', v_ban.scope,
    'reason', v_ban.reason,
    'permanent', v_ban.permanent,
    'banned_until', v_ban.banned_until,
    'retry_after', CASE WHEN v_ban.permanent THEN NULL
                        ELSE GREATEST(1, CEIL(extract(epoch FROM v_ban.banned_until - now()))::int) END
  );
END;
$$;
REVOKE ALL ON FUNCTION public.wiize_api_check_bans(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wiize_api_check_bans(uuid, uuid, text) TO service_role;

-- ============ 5. Antifraude: registro de abuso + banimento escalonado ============
CREATE OR REPLACE FUNCTION public.wiize_api_register_abuse(
  _user_id uuid,
  _api_key_id uuid,
  _ip text,
  _kind text,
  _details jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_threshold integer;
  v_window integer;
  v_scope text;
  v_subject text;
  v_count integer;
  v_strikes integer;
  v_minutes integer;
  v_ban_id uuid;
BEGIN
  INSERT INTO public.wiize_api_abuse_events (user_id, api_key_id, ip_address, kind, details)
  VALUES (_user_id, _api_key_id, _ip, _kind, COALESCE(_details, '{}'::jsonb));

  -- Configuração por tipo (com fallback seguro)
  SELECT COALESCE((SELECT value::integer FROM public.wiize_api_limits WHERE key = 'abuse_' || _kind || '_threshold'), NULL)
    INTO v_threshold;
  SELECT COALESCE((SELECT value::integer FROM public.wiize_api_limits WHERE key = 'abuse_' || _kind || '_window'), NULL)
    INTO v_window;

  IF v_threshold IS NULL THEN
    v_threshold := CASE _kind
      WHEN 'auth_failure' THEN 25
      WHEN 'invalid_key' THEN 15
      WHEN 'rate_limit' THEN 40
      WHEN 'insufficient_balance' THEN 60
      WHEN 'validation_error' THEN 120
      ELSE 100 END;
  END IF;
  IF v_window IS NULL THEN
    v_window := CASE _kind
      WHEN 'auth_failure' THEN 600
      WHEN 'invalid_key' THEN 600
      WHEN 'rate_limit' THEN 900
      WHEN 'insufficient_balance' THEN 900
      ELSE 600 END;
  END IF;

  -- Escopo do bloqueio: sem conta identificada, bloqueia o IP
  IF _user_id IS NULL THEN
    v_scope := 'ip'; v_subject := COALESCE(_ip, 'unknown');
  ELSIF _kind IN ('validation_error', 'rate_limit') AND _api_key_id IS NOT NULL THEN
    v_scope := 'key'; v_subject := _api_key_id::text;
  ELSE
    v_scope := 'account'; v_subject := _user_id::text;
  END IF;

  IF v_subject IS NULL OR v_subject = 'unknown' THEN
    RETURN jsonb_build_object('ok', true, 'banned', false);
  END IF;

  SELECT count(*)::int INTO v_count
    FROM public.wiize_api_abuse_events
   WHERE kind = _kind
     AND created_at > now() - make_interval(secs => v_window)
     AND (
       (v_scope = 'ip' AND ip_address = v_subject)
       OR (v_scope = 'key' AND api_key_id::text = v_subject)
       OR (v_scope = 'account' AND user_id::text = v_subject)
     );

  IF v_count < v_threshold THEN
    RETURN jsonb_build_object('ok', true, 'banned', false, 'count', v_count, 'threshold', v_threshold);
  END IF;

  -- Já existe banimento ativo? Não duplica.
  IF EXISTS (
    SELECT 1 FROM public.wiize_api_bans
     WHERE scope = v_scope AND subject = v_subject
       AND released_at IS NULL AND (permanent OR banned_until > now())
  ) THEN
    RETURN jsonb_build_object('ok', true, 'banned', true, 'already', true);
  END IF;

  SELECT count(*)::int INTO v_strikes
    FROM public.wiize_api_bans
   WHERE scope = v_scope AND subject = v_subject
     AND created_at > now() - interval '30 days';

  v_minutes := CASE v_strikes
    WHEN 0 THEN 15
    WHEN 1 THEN 60
    WHEN 2 THEN 360
    WHEN 3 THEN 1440
    ELSE 10080 END;

  INSERT INTO public.wiize_api_bans (scope, subject, user_id, reason, kind, strike, banned_until)
  VALUES (
    v_scope, v_subject, _user_id,
    format('Bloqueio automático: %s ocorrências de %s em %s segundos', v_count, _kind, v_window),
    _kind, v_strikes + 1, now() + make_interval(mins => v_minutes)
  )
  RETURNING id INTO v_ban_id;

  RETURN jsonb_build_object(
    'ok', true, 'banned', true, 'ban_id', v_ban_id,
    'scope', v_scope, 'minutes', v_minutes,
    'retry_after', v_minutes * 60
  );
END;
$$;
REVOKE ALL ON FUNCTION public.wiize_api_register_abuse(uuid, uuid, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wiize_api_register_abuse(uuid, uuid, text, text, jsonb) TO service_role;

-- ============ 6. Correção: reservas expiradas devolvem tokens ============
CREATE OR REPLACE FUNCTION public.wiize_api_reserve_tokens(
  _user_id uuid, _operation text, _tokens bigint, _api_key_id uuid, _request_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_wallet public.wiize_api_wallets%ROWTYPE;
  v_res_id uuid;
  v_ttl integer;
  v_expired bigint := 0;
BEGIN
  IF _tokens IS NULL OR _tokens <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'INVALID_AMOUNT');
  END IF;

  PERFORM public.wiize_api_ensure_wallet(_user_id);

  -- Expira reservas vencidas devolvendo os tokens reservados à carteira
  WITH e AS (
    UPDATE public.wiize_api_reservations
       SET status = 'expired', settled_at = now()
     WHERE user_id = _user_id AND status = 'reserved' AND expires_at < now()
     RETURNING tokens
  )
  SELECT COALESCE(sum(tokens), 0) INTO v_expired FROM e;

  IF v_expired > 0 THEN
    UPDATE public.wiize_api_wallets
       SET reserved_tokens = GREATEST(reserved_tokens - v_expired, 0), updated_at = now()
     WHERE user_id = _user_id;
  END IF;

  SELECT * INTO v_wallet FROM public.wiize_api_wallets WHERE user_id = _user_id FOR UPDATE;

  IF v_wallet.status <> 'active' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'ACCOUNT_SUSPENDED');
  END IF;

  IF (v_wallet.balance_tokens - v_wallet.reserved_tokens) < _tokens THEN
    RETURN jsonb_build_object('ok', false, 'code', 'INSUFFICIENT_BALANCE',
      'available_tokens', v_wallet.balance_tokens - v_wallet.reserved_tokens, 'required_tokens', _tokens);
  END IF;

  SELECT COALESCE((SELECT value::integer FROM public.wiize_api_limits WHERE key = 'reservation_ttl_seconds'), 300)
    INTO v_ttl;

  UPDATE public.wiize_api_wallets
     SET reserved_tokens = reserved_tokens + _tokens, updated_at = now()
   WHERE id = v_wallet.id;

  INSERT INTO public.wiize_api_reservations (wallet_id, user_id, api_key_id, operation, tokens, request_id, expires_at)
  VALUES (v_wallet.id, _user_id, _api_key_id, _operation, _tokens, _request_id, now() + make_interval(secs => v_ttl))
  RETURNING id INTO v_res_id;

  RETURN jsonb_build_object('ok', true, 'reservation_id', v_res_id,
    'available_tokens', v_wallet.balance_tokens - v_wallet.reserved_tokens - _tokens);
END;
$$;

-- ============ 7. Proteção das chaves contra escalonamento de privilégio ============
CREATE OR REPLACE FUNCTION public.wiize_api_keys_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND current_setting('role', true) <> 'service_role' THEN
    NEW.user_id := OLD.user_id;
    NEW.prefix := OLD.prefix;
    NEW.secret_hash := OLD.secret_hash;
    NEW.last_four := OLD.last_four;
    NEW.permissions := OLD.permissions;
    NEW.environment := OLD.environment;
    NEW.rate_limit_per_minute := OLD.rate_limit_per_minute;
    NEW.api_id := OLD.api_id;
    NEW.created_at := OLD.created_at;
    -- O cliente só pode renomear ou revogar
    IF NEW.status NOT IN ('active', 'revoked') THEN
      NEW.status := OLD.status;
    END IF;
    IF OLD.status = 'revoked' THEN
      NEW.status := 'revoked';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.wiize_api_keys_guard() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS wiize_api_keys_guard_tg ON public.wiize_api_keys;
CREATE TRIGGER wiize_api_keys_guard_tg
  BEFORE UPDATE ON public.wiize_api_keys
  FOR EACH ROW EXECUTE FUNCTION public.wiize_api_keys_guard();

-- ============ 8. Grants: remove acesso anônimo e escritas indevidas ============
REVOKE ALL ON public.wiize_api_wallets, public.wiize_api_wallet_transactions,
  public.wiize_api_reservations, public.wiize_api_requests, public.wiize_api_keys,
  public.wiize_api_topups, public.wiize_api_profiles, public.wiize_api_notification_prefs,
  public.wiize_api_limits, public.wiize_api_pricing
  FROM anon, authenticated;

GRANT SELECT ON public.wiize_api_wallets TO authenticated;
GRANT UPDATE ON public.wiize_api_wallets TO authenticated; -- preferências, protegido por trigger
GRANT SELECT ON public.wiize_api_wallet_transactions TO authenticated;
GRANT SELECT ON public.wiize_api_reservations TO authenticated;
GRANT SELECT ON public.wiize_api_requests TO authenticated;
GRANT SELECT, UPDATE ON public.wiize_api_keys TO authenticated; -- protegido por trigger
GRANT SELECT ON public.wiize_api_topups TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.wiize_api_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.wiize_api_notification_prefs TO authenticated;
GRANT SELECT ON public.wiize_api_limits TO authenticated;
GRANT SELECT ON public.wiize_api_pricing TO anon, authenticated;

GRANT ALL ON public.wiize_api_wallets, public.wiize_api_wallet_transactions,
  public.wiize_api_reservations, public.wiize_api_requests, public.wiize_api_keys,
  public.wiize_api_topups, public.wiize_api_profiles, public.wiize_api_notification_prefs,
  public.wiize_api_limits, public.wiize_api_pricing TO service_role;

-- ============ 9. Novos limites configuráveis ============
INSERT INTO public.wiize_api_limits (key, value, description) VALUES
  ('burst_per_10s_key', 20, 'Rajada máxima por chave em 10 segundos'),
  ('rate_per_hour_key', 3000, 'Requisições por hora por chave'),
  ('rate_per_minute_account', 300, 'Requisições por minuto por conta'),
  ('abuse_auth_failure_threshold', 25, 'Falhas de autenticação antes do bloqueio'),
  ('abuse_auth_failure_window', 600, 'Janela (s) das falhas de autenticação'),
  ('abuse_rate_limit_threshold', 40, 'Excessos de rate limit antes do bloqueio'),
  ('abuse_rate_limit_window', 900, 'Janela (s) dos excessos de rate limit'),
  ('abuse_insufficient_balance_threshold', 60, 'Erros de saldo antes do bloqueio'),
  ('abuse_insufficient_balance_window', 900, 'Janela (s) dos erros de saldo'),
  ('abuse_validation_error_threshold', 150, 'Erros de validação antes do bloqueio'),
  ('abuse_validation_error_window', 600, 'Janela (s) dos erros de validação'),
  ('max_topup_brl', 5000, 'Recarga máxima em reais')
ON CONFLICT (key) DO NOTHING;