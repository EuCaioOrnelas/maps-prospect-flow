INSERT INTO public.user_waba_connections (user_id, owner_user_id, waba_id, phone_number_id, display_phone_number, business_name, nickname, access_token, status)
SELECT u.id, u.id, 'TEST-WABA-000', 'TEST-PHONE-000', '+55 11 90000-0000', 'Wiize Teste', 'Número de Teste (sandbox)', 'TEST_TOKEN_SANDBOX', 'active'
FROM auth.users u
WHERE u.email = 'caiowiize@gmail.com'
AND NOT EXISTS (
  SELECT 1 FROM public.user_waba_connections c WHERE c.owner_user_id = u.id AND c.phone_number_id = 'TEST-PHONE-000'
);