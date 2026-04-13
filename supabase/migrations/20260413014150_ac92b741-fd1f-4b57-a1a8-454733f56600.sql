
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS subscription_price_cents integer DEFAULT NULL;

COMMENT ON COLUMN public.profiles.subscription_price_cents IS 'Preço da assinatura em centavos, gravado no momento da compra. Usado para grandfathering de preços.';
