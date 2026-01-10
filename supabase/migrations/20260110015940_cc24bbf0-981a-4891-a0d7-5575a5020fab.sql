-- Disable trigger, update, then re-enable
ALTER TABLE public.profiles DISABLE TRIGGER protect_profile_fields;

UPDATE public.profiles 
SET searches_limit = 200 
WHERE email = 'sonencaio@gmail.com';

ALTER TABLE public.profiles ENABLE TRIGGER protect_profile_fields;