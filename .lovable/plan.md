# Criptografia do chat sem arquivos compartilhados

## Objetivo

Manter a proteção AES-256-GCM de `chat_messages.content`, `chat_messages.media_caption` e `chat_conversations.last_message_text`, sem usar `_shared` ou qualquer arquivo auxiliar entre Edge Functions.

## Alterações

1. Remover `supabase/functions/_shared/messageCrypto.ts` e seu teste.
2. Cada Edge Function alterada ficará autocontida em um único `index.ts`:
   - funções que gravam conteúdo terão a implementação local mínima de criptografia;
   - funções que leem conteúdo terão a implementação local mínima de descriptografia;
   - funções que leem e gravam terão ambas no próprio arquivo.
3. Manter o mesmo formato versionado `enc:v1:<iv>:<ciphertext>`, AES-256-GCM, IV aleatório de 12 bytes e chave somente no backend.
4. Preservar os bloqueios do banco contra gravações em texto puro.
5. Manter o navegador sem acesso à chave: leitura autorizada continua por `chat-secure-read`, e Realtime continua apenas sinalizando atualizações.
6. Manter compatibilidade temporária de leitura com registros antigos em texto puro, sem alterar IDs, datas, relações ou metadados.
7. Ajustar a rotina administrativa de migração para ser autocontida e processar os registros antigos em lotes.
8. Atualizar a documentação para registrar explicitamente que não existe módulo compartilhado e que cada Edge Function possui apenas seu `index.ts`.

## Funções que serão atualizadas

- `chat-secure-read`
- `migrate-chat-encryption`
- `send-chat-message`
- `evolution-webhook`
- `meta-webhook`
- `chat-auto-reply`
- `wa-flow-runner`
- `meta-send-campaign`
- `sdr-followup-processor`
- `sdr-dispatch`
- `chat-summarize`
- `intel-engine`

## Validação

- Confirmar que não existe importação de `_shared/messageCrypto` em todo o repositório.
- Confirmar que não existe arquivo de criptografia em `_shared`.
- Executar typecheck e build.
- Testar localmente ida e volta, IV único, chave errada e conteúdo adulterado em uma função autocontida.
- Publicar novamente todas as Edge Functions alteradas.
- Testar `chat-secure-read` após a publicação.
- Auditar novamente todos os acessos a `content`, `media_caption` e `last_message_text`.
- Informar no final a lista completa de arquivos criados, editados e removidos.

## Limitação preservada

A migração dos registros antigos continua dependendo de uma execução administrativa autenticada. Até isso ocorrer, esses registros permanecem intactos e legíveis pela compatibilidade temporária do backend.
