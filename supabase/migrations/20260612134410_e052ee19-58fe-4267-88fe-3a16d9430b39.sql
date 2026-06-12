-- Reativar conexão Meta marcada como desconectada por engano (token sem validade)
UPDATE public.user_waba_connections
SET status = 'active', updated_at = now()
WHERE status = 'disconnected'
  AND access_token IS NOT NULL
  AND token_expires_at IS NULL;