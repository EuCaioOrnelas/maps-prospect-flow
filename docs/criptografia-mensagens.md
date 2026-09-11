# Criptografia das mensagens do Chat

O conteúdo textual de `chat_messages.content`, `chat_messages.media_caption` e
`chat_conversations.last_message_text` é armazenado com AES-256-GCM no formato
versionado `enc:v1:<iv>:<ciphertext+tag>`.

- A chave `WIIZE_MESSAGE_ENCRYPTION_KEY` existe somente nos secrets das Edge Functions.
- Cada valor usa um IV aleatório de 96 bits. O tag de autenticação do GCM detecta adulteração e chave incorreta.
- O frontend nunca lê o texto diretamente das tabelas. A função `chat-secure-read` valida conta/colaborador e devolve plaintext apenas ao usuário autorizado.
- Eventos Realtime contêm apenas ciphertext; eles servem como sinal para o frontend buscar a mensagem autorizada.
- Mídias continuam no bucket privado e usam links assinados temporários. Caption é criptografada.
- Mensagens legadas são aceitas somente durante a migração controlada. Novos INSERT/UPDATE em plaintext são bloqueados no banco.

## Migração

`migrate-chat-encryption` processa lotes idempotentes, sem trocar IDs, timestamps,
relacionamentos ou metadados. A rotina pode ser repetida e ignora valores já criptografados.

## Rotação da chave

Uma rotação exige manter temporariamente a chave anterior, decifrar com ela e cifrar
novamente com a chave nova em uma rotina controlada. Nunca substitua a chave antes dessa
recriptografia: ciphertext existente não é recuperável sem a chave correspondente.

## Limite de proteção

É criptografia em repouso, não ponta a ponta. Protege dumps e backups sem a chave. Um
invasor que comprometa simultaneamente o banco e o ambiente das Edge Functions ainda pode
decifrar os dados.