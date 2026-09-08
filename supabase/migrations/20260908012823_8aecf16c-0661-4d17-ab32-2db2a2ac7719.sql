CREATE OR REPLACE FUNCTION public.wiize_api_commit_reservation(_reservation_id uuid, _reference_id text, _actual_tokens bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_res public.wiize_api_reservations%ROWTYPE; v_wallet public.wiize_api_wallets%ROWTYPE; v_before bigint; v_after bigint; v_charge bigint;
BEGIN
  SELECT * INTO v_res FROM public.wiize_api_reservations WHERE id = _reservation_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'code', 'RESERVATION_NOT_FOUND'); END IF;
  IF v_res.status <> 'reserved' THEN
    RETURN jsonb_build_object('ok', true, 'already', v_res.status);
  END IF;

  v_charge := LEAST(GREATEST(COALESCE(_actual_tokens, v_res.tokens), 0), v_res.tokens);

  SELECT * INTO v_wallet FROM public.wiize_api_wallets WHERE id = v_res.wallet_id FOR UPDATE;
  v_before := v_wallet.balance_tokens;
  v_after := v_before - v_charge;

  UPDATE public.wiize_api_wallets
     SET balance_tokens = v_after,
         reserved_tokens = GREATEST(reserved_tokens - v_res.tokens, 0),
         lifetime_spent_tokens = lifetime_spent_tokens + v_charge,
         updated_at = now()
   WHERE id = v_wallet.id;

  UPDATE public.wiize_api_reservations SET status = 'committed', settled_at = now(), tokens = v_charge WHERE id = v_res.id;

  IF v_charge > 0 THEN
    INSERT INTO public.wiize_api_wallet_transactions
      (wallet_id, user_id, type, amount_brl, tokens, balance_before, balance_after, reference_id, reference_type, description, idempotency_key)
    VALUES (v_wallet.id, v_res.user_id, 'API_USAGE',
      ROUND(v_charge * COALESCE((SELECT value FROM public.wiize_api_limits WHERE key = 'token_price_brl'), 0.01), 2),
      -v_charge, v_before, v_after, COALESCE(_reference_id, v_res.request_id), 'api_request', v_res.operation,
      'res:' || v_res.id::text);
  END IF;

  RETURN jsonb_build_object('ok', true, 'balance_tokens', v_after, 'tokens_charged', v_charge);
END;
$$;

REVOKE ALL ON FUNCTION public.wiize_api_commit_reservation(uuid, text, bigint) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wiize_api_commit_reservation(uuid, text, bigint) TO service_role;