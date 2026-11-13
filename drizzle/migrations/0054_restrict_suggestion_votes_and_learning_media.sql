DROP POLICY IF EXISTS "suggestion_votes_select" ON public.suggestion_votes;
CREATE POLICY "suggestion_votes_select" ON public.suggestion_votes FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_current_user_admin());

DROP POLICY IF EXISTS "Learning media public read" ON storage.objects;
CREATE POLICY "Learning media admin read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'learning-media' AND public.is_current_user_admin());