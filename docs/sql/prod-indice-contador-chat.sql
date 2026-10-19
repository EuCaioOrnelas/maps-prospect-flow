-- ============================================================
-- Índices para o contador de mensagens não lidas e a lista do Chat.
-- Era a consulta que mais pesava no banco (240 ms cada, lendo a tabela inteira).
-- Rode inteiro, de uma vez. Pode repetir sem problema.
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_chat_conv_owner_unread
  ON public.chat_conversations (owner_user_id)
  WHERE unread_count > 0;

CREATE INDEX IF NOT EXISTS idx_chat_conv_owner_only
  ON public.chat_conversations (owner_user_id);

ANALYZE public.chat_conversations;

SELECT indexname FROM pg_indexes
WHERE tablename = 'chat_conversations' AND indexname LIKE 'idx_chat_conv_owner%';
