ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_paid_at timestamptz;

-- Fonte única de verdade: o usuário já pagou de verdade?
CREATE OR REPLACE FUNCTION public.user_has_real_payment(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT first_paid_at IS NOT NULL FROM public.profiles WHERE id = _user_id),
    false
  )
  OR EXISTS (
    SELECT 1 FROM public.custom_subscription_payments
    WHERE user_id = _user_id AND paid_at IS NOT NULL AND amount_cents > 0
  )
  OR EXISTS (
    SELECT 1 FROM public.pix_invoices WHERE user_id = _user_id AND status = 'paid'
  )
  OR EXISTS (
    SELECT 1 FROM public.partner_sales WHERE customer_user_id = _user_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.user_has_real_payment(uuid) TO authenticated, service_role;

-- Marca o primeiro pagamento real (usada pelos webhooks)
CREATE OR REPLACE FUNCTION public.mark_user_first_payment(_user_id uuid, _paid_at timestamptz DEFAULT now())
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles
  SET first_paid_at = LEAST(COALESCE(first_paid_at, _paid_at), _paid_at)
  WHERE id = _user_id;
$$;

GRANT EXECUTE ON FUNCTION public.mark_user_first_payment(uuid, timestamptz) TO service_role;

-- Guarda: nunca registrar churn de quem nunca pagou
CREATE OR REPLACE FUNCTION public.block_fake_churn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_TABLE_NAME = 'subscription_events'
     AND NEW.event_type NOT IN ('subscription_canceled','subscription_deleted','charge_refunded','pix_not_renewed') THEN
    RETURN NEW;
  END IF;

  IF NEW.user_id IS NULL OR NOT public.user_has_real_payment(NEW.user_id) THEN
    RAISE LOG 'block_fake_churn: ignorado % para user % (sem pagamento real)', TG_TABLE_NAME, NEW.user_id;
    RETURN NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_fake_churn_cancellations ON public.subscription_cancellations;
CREATE TRIGGER trg_block_fake_churn_cancellations
BEFORE INSERT ON public.subscription_cancellations
FOR EACH ROW EXECUTE FUNCTION public.block_fake_churn();

DROP TRIGGER IF EXISTS trg_block_fake_churn_events ON public.subscription_events;
CREATE TRIGGER trg_block_fake_churn_events
BEFORE INSERT ON public.subscription_events
FOR EACH ROW EXECUTE FUNCTION public.block_fake_churn();