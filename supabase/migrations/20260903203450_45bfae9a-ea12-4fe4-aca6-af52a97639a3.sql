-- ============ WIIZE API V1 — FASE 1 ============

-- WALLETS
CREATE TABLE IF NOT EXISTS public.wiize_api_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  balance_tokens bigint NOT NULL DEFAULT 0,
  reserved_tokens bigint NOT NULL DEFAULT 0,
  lifetime_credited_tokens bigint NOT NULL DEFAULT 0,
  lifetime_spent_tokens bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  low_balance_threshold_tokens bigint NOT NULL DEFAULT 500,
  low_balance_notified_at timestamptz,
  auto_topup_enabled boolean NOT NULL DEFAULT false,
  auto_topup_threshold_tokens bigint NOT NULL DEFAULT 500,
  auto_topup_amount_brl numeric(12,2) NOT NULL DEFAULT 50,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wiize_api_wallets_balance_nonneg CHECK (balance_tokens >= 0),
  CONSTRAINT wiize_api_wallets_reserved_nonneg CHECK (reserved_tokens >= 0)
);

GRANT SELECT, UPDATE ON public.wiize_api_wallets TO authenticated;
GRANT ALL ON public.wiize_api_wallets TO service_role;
ALTER TABLE public.wiize_api_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wallet owner read" ON public.wiize_api_wallets
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "wallet owner update prefs" ON public.wiize_api_wallets
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- LEDGER
CREATE TABLE IF NOT EXISTS public.wiize_api_wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES public.wiize_api_wallets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  type text NOT NULL,
  amount_brl numeric(12,2) NOT NULL DEFAULT 0,
  tokens bigint NOT NULL,
  balance_before bigint NOT NULL,
  balance_after bigint NOT NULL,
  reference_id text,
  reference_type text,
  status text NOT NULL DEFAULT 'completed',
  description text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wiize_api_tx_type_valid CHECK (type IN (
    'CREDIT_PURCHASE','API_USAGE','REFUND','ADJUSTMENT','BONUS','EXPIRATION','CHARGEBACK','REVERSAL'
  ))
);

CREATE UNIQUE INDEX IF NOT EXISTS wiize_api_tx_idem_uidx
  ON public.wiize_api_wallet_transactions (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS wiize_api_tx_user_idx ON public.wiize_api_wallet_transactions (user_id, created_at DESC);

GRANT SELECT ON public.wiize_api_wallet_transactions TO authenticated;
GRANT ALL ON public.wiize_api_wallet_transactions TO service_role;
ALTER TABLE public.wiize_api_wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tx owner read" ON public.wiize_api_wallet_transactions
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- API KEYS
CREATE TABLE IF NOT EXISTS public.wiize_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  api_id text NOT NULL DEFAULT 'prospecting',
  name text NOT NULL,
  environment text NOT NULL DEFAULT 'live',
  prefix text NOT NULL UNIQUE,
  secret_hash text NOT NULL,
  last_four text,
  permissions text[] NOT NULL DEFAULT ARRAY['prospecting:search','prospecting:analyze','prospecting:approach']::text[],
  status text NOT NULL DEFAULT 'active',
  rate_limit_per_minute integer,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wiize_api_keys_env_valid CHECK (environment IN ('live','test')),
  CONSTRAINT wiize_api_keys_status_valid CHECK (status IN ('active','revoked'))
);

CREATE INDEX IF NOT EXISTS wiize_api_keys_user_idx ON public.wiize_api_keys (user_id, created_at DESC);

GRANT SELECT, UPDATE ON public.wiize_api_keys TO authenticated;
GRANT ALL ON public.wiize_api_keys TO service_role;
ALTER TABLE public.wiize_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "keys owner read" ON public.wiize_api_keys
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "keys owner revoke" ON public.wiize_api_keys
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- RESERVATIONS
CREATE TABLE IF NOT EXISTS public.wiize_api_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES public.wiize_api_wallets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  api_key_id uuid REFERENCES public.wiize_api_keys(id) ON DELETE SET NULL,
  operation text NOT NULL,
  tokens bigint NOT NULL,
  status text NOT NULL DEFAULT 'reserved',
  request_id text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes'),
  created_at timestamptz NOT NULL DEFAULT now(),
  settled_at timestamptz,
  CONSTRAINT wiize_api_res_status_valid CHECK (status IN ('reserved','committed','released','expired'))
);

CREATE INDEX IF NOT EXISTS wiize_api_res_open_idx ON public.wiize_api_reservations (status, expires_at);

GRANT SELECT ON public.wiize_api_reservations TO authenticated;
GRANT ALL ON public.wiize_api_reservations TO service_role;
ALTER TABLE public.wiize_api_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "res owner read" ON public.wiize_api_reservations
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- REQUEST LOG
CREATE TABLE IF NOT EXISTS public.wiize_api_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  api_key_id uuid REFERENCES public.wiize_api_keys(id) ON DELETE SET NULL,
  request_id text NOT NULL,
  api_id text NOT NULL DEFAULT 'prospecting',
  endpoint text NOT NULL,
  method text NOT NULL DEFAULT 'POST',
  environment text NOT NULL DEFAULT 'live',
  status_code integer NOT NULL,
  error_code text,
  tokens_charged bigint NOT NULL DEFAULT 0,
  duration_ms integer,
  ip_address text,
  user_agent text,
  idempotency_key text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wiize_api_req_user_idx ON public.wiize_api_requests (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS wiize_api_req_key_idx ON public.wiize_api_requests (api_key_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS wiize_api_req_idem_uidx
  ON public.wiize_api_requests (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

GRANT SELECT ON public.wiize_api_requests TO authenticated;
GRANT ALL ON public.wiize_api_requests TO service_role;
ALTER TABLE public.wiize_api_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "req owner read" ON public.wiize_api_requests
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- PRICING
CREATE TABLE IF NOT EXISTS public.wiize_api_pricing (
  operation text PRIMARY KEY,
  api_id text NOT NULL DEFAULT 'prospecting',
  label text NOT NULL,
  tokens integer NOT NULL,
  active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.wiize_api_pricing TO authenticated, anon;
GRANT ALL ON public.wiize_api_pricing TO service_role;
ALTER TABLE public.wiize_api_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pricing public read" ON public.wiize_api_pricing FOR SELECT USING (true);
CREATE POLICY "pricing admin write" ON public.wiize_api_pricing
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.wiize_api_pricing (operation, label, tokens) VALUES
  ('prospecting.search', 'Prospecção de leads', 9),
  ('prospecting.analyze', 'Análise e diagnóstico', 5),
  ('prospecting.approach', 'Geração de abordagem', 4)
ON CONFLICT (operation) DO NOTHING;

-- LIMITS / CONFIG
CREATE TABLE IF NOT EXISTS public.wiize_api_limits (
  key text PRIMARY KEY,
  value numeric NOT NULL,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.wiize_api_limits TO authenticated;
GRANT ALL ON public.wiize_api_limits TO service_role;
ALTER TABLE public.wiize_api_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "limits read" ON public.wiize_api_limits FOR SELECT TO authenticated USING (true);
CREATE POLICY "limits admin write" ON public.wiize_api_limits
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.wiize_api_limits (key, value, description) VALUES
  ('token_price_brl', 0.01, 'Preço em reais de 1 Wiize Token'),
  ('rate_per_minute_key', 60, 'Requisições por minuto por API Key'),
  ('rate_per_10min_account', 600, 'Requisições por 10 minutos por conta'),
  ('rate_per_day_account', 10000, 'Requisições por dia por conta'),
  ('max_body_bytes', 32768, 'Tamanho máximo do corpo da requisição'),
  ('reservation_ttl_seconds', 300, 'Validade da reserva de tokens'),
  ('min_topup_brl', 30, 'Recarga mínima em reais')
ON CONFLICT (key) DO NOTHING;

-- ============ FUNÇÕES ATÔMICAS ============

CREATE OR REPLACE FUNCTION public.wiize_api_ensure_wallet(_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.wiize_api_wallets (user_id) VALUES (_user_id)
  ON CONFLICT (user_id) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.wiize_api_reserve_tokens(
  _user_id uuid, _operation text, _tokens bigint, _api_key_id uuid, _request_id text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_wallet public.wiize_api_wallets%ROWTYPE; v_res_id uuid; v_ttl integer;
BEGIN
  PERFORM public.wiize_api_ensure_wallet(_user_id);

  UPDATE public.wiize_api_reservations
     SET status = 'expired', settled_at = now()
   WHERE user_id = _user_id AND status = 'reserved' AND expires_at < now();

  SELECT * INTO v_wallet FROM public.wiize_api_wallets WHERE user_id = _user_id FOR UPDATE;

  IF v_wallet.status <> 'active' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'ACCOUNT_SUSPENDED');
  END IF;

  IF (v_wallet.balance_tokens - v_wallet.reserved_tokens) < _tokens THEN
    RETURN jsonb_build_object('ok', false, 'code', 'INSUFFICIENT_BALANCE',
      'available_tokens', v_wallet.balance_tokens - v_wallet.reserved_tokens, 'required_tokens', _tokens);
  END IF;

  SELECT COALESCE((SELECT value::integer FROM public.wiize_api_limits WHERE key = 'reservation_ttl_seconds'), 300) INTO v_ttl;

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

CREATE OR REPLACE FUNCTION public.wiize_api_commit_reservation(_reservation_id uuid, _reference_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_res public.wiize_api_reservations%ROWTYPE; v_wallet public.wiize_api_wallets%ROWTYPE; v_before bigint; v_after bigint;
BEGIN
  SELECT * INTO v_res FROM public.wiize_api_reservations WHERE id = _reservation_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'code', 'RESERVATION_NOT_FOUND'); END IF;
  IF v_res.status <> 'reserved' THEN
    RETURN jsonb_build_object('ok', true, 'already', v_res.status);
  END IF;

  SELECT * INTO v_wallet FROM public.wiize_api_wallets WHERE id = v_res.wallet_id FOR UPDATE;
  v_before := v_wallet.balance_tokens;
  v_after := v_before - v_res.tokens;

  UPDATE public.wiize_api_wallets
     SET balance_tokens = v_after,
         reserved_tokens = GREATEST(reserved_tokens - v_res.tokens, 0),
         lifetime_spent_tokens = lifetime_spent_tokens + v_res.tokens,
         updated_at = now()
   WHERE id = v_wallet.id;

  UPDATE public.wiize_api_reservations SET status = 'committed', settled_at = now() WHERE id = v_res.id;

  INSERT INTO public.wiize_api_wallet_transactions
    (wallet_id, user_id, type, amount_brl, tokens, balance_before, balance_after, reference_id, reference_type, description, idempotency_key)
  VALUES (v_wallet.id, v_res.user_id, 'API_USAGE',
    ROUND(v_res.tokens * COALESCE((SELECT value FROM public.wiize_api_limits WHERE key = 'token_price_brl'), 0.01), 2),
    -v_res.tokens, v_before, v_after, COALESCE(_reference_id, v_res.request_id), 'api_request', v_res.operation,
    'res:' || v_res.id::text);

  RETURN jsonb_build_object('ok', true, 'balance_tokens', v_after, 'tokens_charged', v_res.tokens);
END;
$$;

CREATE OR REPLACE FUNCTION public.wiize_api_release_reservation(_reservation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_res public.wiize_api_reservations%ROWTYPE;
BEGIN
  SELECT * INTO v_res FROM public.wiize_api_reservations WHERE id = _reservation_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'code', 'RESERVATION_NOT_FOUND'); END IF;
  IF v_res.status <> 'reserved' THEN RETURN jsonb_build_object('ok', true, 'already', v_res.status); END IF;

  UPDATE public.wiize_api_wallets
     SET reserved_tokens = GREATEST(reserved_tokens - v_res.tokens, 0), updated_at = now()
   WHERE id = v_res.wallet_id;

  UPDATE public.wiize_api_reservations SET status = 'released', settled_at = now() WHERE id = v_res.id;
  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.wiize_api_credit_wallet(
  _user_id uuid, _tokens bigint, _amount_brl numeric, _type text, _reference_id text,
  _reference_type text, _idempotency_key text, _description text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_wallet public.wiize_api_wallets%ROWTYPE; v_before bigint; v_after bigint; v_existing uuid;
BEGIN
  IF _tokens = 0 THEN RETURN jsonb_build_object('ok', false, 'code', 'INVALID_AMOUNT'); END IF;

  IF _idempotency_key IS NOT NULL THEN
    SELECT id INTO v_existing FROM public.wiize_api_wallet_transactions WHERE idempotency_key = _idempotency_key;
    IF v_existing IS NOT NULL THEN
      RETURN jsonb_build_object('ok', true, 'duplicate', true, 'transaction_id', v_existing);
    END IF;
  END IF;

  PERFORM public.wiize_api_ensure_wallet(_user_id);
  SELECT * INTO v_wallet FROM public.wiize_api_wallets WHERE user_id = _user_id FOR UPDATE;

  v_before := v_wallet.balance_tokens;
  v_after := v_before + _tokens;
  IF v_after < 0 THEN RETURN jsonb_build_object('ok', false, 'code', 'INSUFFICIENT_BALANCE'); END IF;

  UPDATE public.wiize_api_wallets
     SET balance_tokens = v_after,
         lifetime_credited_tokens = lifetime_credited_tokens + GREATEST(_tokens, 0),
         low_balance_notified_at = CASE WHEN _tokens > 0 THEN NULL ELSE low_balance_notified_at END,
         updated_at = now()
   WHERE id = v_wallet.id;

  INSERT INTO public.wiize_api_wallet_transactions
    (wallet_id, user_id, type, amount_brl, tokens, balance_before, balance_after, reference_id, reference_type, description, idempotency_key)
  VALUES (v_wallet.id, _user_id, _type, COALESCE(_amount_brl, 0), _tokens, v_before, v_after,
          _reference_id, _reference_type, _description, _idempotency_key);

  RETURN jsonb_build_object('ok', true, 'balance_tokens', v_after);
END;
$$;

CREATE OR REPLACE FUNCTION public.wiize_api_expire_reservations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r public.wiize_api_reservations%ROWTYPE; v_count integer := 0;
BEGIN
  FOR r IN SELECT * FROM public.wiize_api_reservations WHERE status = 'reserved' AND expires_at < now() LOOP
    PERFORM public.wiize_api_release_reservation(r.id);
    UPDATE public.wiize_api_reservations SET status = 'expired' WHERE id = r.id;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.wiize_api_reserve_tokens(uuid, text, bigint, uuid, text) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.wiize_api_commit_reservation(uuid, text) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.wiize_api_release_reservation(uuid) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.wiize_api_credit_wallet(uuid, bigint, numeric, text, text, text, text, text) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.wiize_api_expire_reservations() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wiize_api_reserve_tokens(uuid, text, bigint, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.wiize_api_commit_reservation(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.wiize_api_release_reservation(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.wiize_api_credit_wallet(uuid, bigint, numeric, text, text, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.wiize_api_expire_reservations() TO service_role;
GRANT EXECUTE ON FUNCTION public.wiize_api_ensure_wallet(uuid) TO service_role, authenticated;