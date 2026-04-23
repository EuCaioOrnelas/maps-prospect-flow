-- Permitir que usuários atualizem seu próprio registro de onboarding
CREATE POLICY "Users can update their own onboarding"
ON public.user_onboarding
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);