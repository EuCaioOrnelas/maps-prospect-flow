
-- Fix user_score_events FK: point to profiles
ALTER TABLE public.user_score_events DROP CONSTRAINT user_score_events_user_id_fkey;
ALTER TABLE public.user_score_events ADD CONSTRAINT user_score_events_user_id_profiles_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Fix user_score_history FK: point to profiles  
ALTER TABLE public.user_score_history DROP CONSTRAINT user_score_history_user_id_fkey;
ALTER TABLE public.user_score_history ADD CONSTRAINT user_score_history_user_id_profiles_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
