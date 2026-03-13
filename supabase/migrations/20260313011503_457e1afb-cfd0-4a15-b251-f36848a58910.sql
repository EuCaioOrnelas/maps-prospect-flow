
-- Fix FK: point to profiles instead of auth.users
ALTER TABLE public.user_scores DROP CONSTRAINT user_scores_user_id_fkey;
ALTER TABLE public.user_scores ADD CONSTRAINT user_scores_user_id_profiles_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
