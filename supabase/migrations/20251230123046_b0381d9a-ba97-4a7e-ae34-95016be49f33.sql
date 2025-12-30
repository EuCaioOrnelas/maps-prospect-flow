-- Add DELETE policy for search_history to allow cleanup of old entries
CREATE POLICY "Users can delete their own search history" 
ON public.search_history 
FOR DELETE 
USING (auth.uid() = user_id);