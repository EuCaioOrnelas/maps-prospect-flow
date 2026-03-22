
CREATE TABLE public.coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  coupon_code TEXT NOT NULL,
  plan_key TEXT NOT NULL,
  discount_amount_cents INTEGER NOT NULL DEFAULT 0,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(email, coupon_code)
);

ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on coupon_redemptions"
  ON public.coupon_redemptions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can view own redemptions"
  ON public.coupon_redemptions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
