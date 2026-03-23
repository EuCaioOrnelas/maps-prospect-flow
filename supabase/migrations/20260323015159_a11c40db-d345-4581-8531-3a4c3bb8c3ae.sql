
-- Backfill payment_provider for existing users:
-- Users with checkout_leads that have abacate_ prefix -> abacate_pay
-- Users with checkout_leads without abacate_ prefix (or with Stripe) -> stripe
-- This ensures all paid users have a correct payment_provider

UPDATE public.profiles p
SET payment_provider = 'abacate_pay'
WHERE p.plan != 'free'
  AND p.payment_provider IS NULL
  AND EXISTS (
    SELECT 1 FROM public.checkout_leads cl
    WHERE (cl.user_id = p.id OR cl.email = p.email)
      AND cl.checkout_completed = true
      AND cl.stripe_session_id LIKE 'abacate_%'
  );

UPDATE public.profiles p
SET payment_provider = 'stripe'
WHERE p.plan != 'free'
  AND p.payment_provider IS NULL
  AND EXISTS (
    SELECT 1 FROM public.checkout_leads cl
    WHERE (cl.user_id = p.id OR cl.email = p.email)
      AND cl.checkout_completed = true
      AND cl.stripe_session_id IS NOT NULL
      AND cl.stripe_session_id NOT LIKE 'abacate_%'
  );

-- For any remaining paid users with null provider, default to stripe (legacy)
UPDATE public.profiles
SET payment_provider = 'stripe'
WHERE plan != 'free'
  AND payment_provider IS NULL;
