CREATE POLICY "Users can delete own waba connections"
ON public.user_waba_connections
FOR DELETE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own meta campaigns"
ON public.meta_campaigns
FOR DELETE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own messages"
ON public.chat_messages
FOR DELETE
USING (user_id = auth.uid());