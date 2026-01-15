-- Insert records for new SerpAPI keys (5 and 6)
INSERT INTO public.api_key_status (key_name, key_index, status, message) VALUES
  ('SERP_API_KEY_5', 5, 'unknown', 'Aguardando verificação'),
  ('SERP_API_KEY_6', 6, 'unknown', 'Aguardando verificação')
ON CONFLICT (key_name, key_index) DO NOTHING;