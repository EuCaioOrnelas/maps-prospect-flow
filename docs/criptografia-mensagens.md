# Criptografia das mensagens do Chat

O conteúdo textual de `chat_messages.content`, `chat_messages.media_caption` e
`chat_conversations.last_message_text` é armazenado com AES-256-GCM no formato
versionado `enc:v1:<iv>:<ciphertext+tag>`.

- A chave `WIIZE_MESSAGE_ENCRYPTION_KEY` existe somente nos secrets das Edge Functions.
- Não existe módulo `_shared`: cada Edge Function contém somente no próprio `index.ts` a implementação criptográfica mínima exigida pelo seu fluxo.
- Cada valor usa um IV aleatório de 96 bits. O tag de autenticação do GCM detecta adulteração e chave incorreta.
- O frontend nunca lê o texto diretamente das tabelas. A função `chat-secure-read` valida conta/colaborador e devolve plaintext apenas ao usuário autorizado.
- Eventos Realtime contêm apenas ciphertext; eles servem como sinal para o frontend buscar a mensagem autorizada.
- Mídias continuam no bucket privado e usam links assinados temporários. Caption é criptografada.
- Mensagens legadas são aceitas somente durante a migração controlada. Novos INSERT/UPDATE em plaintext são bloqueados no banco.

## Migração

`migrate-chat-encryption` processa lotes idempotentes, sem trocar IDs, timestamps,
relacionamentos ou metadados. A rotina pode ser repetida e ignora valores já criptografados.

Ela é uma operação administrativa única, não um cron recorrente. Autorize com
`x-cron-secret` usando `WIIZE_API_CRON_SECRET`, ou com uma sessão de administrador.
Execute até retornar zero itens migrados e confirme no banco que não existem valores
fora do prefixo `enc:v1:`.

## Instalação em banco externo

1. Cadastre `WIIZE_MESSAGE_ENCRYPTION_KEY` com pelo menos 32 caracteres em todas as
   Edge Functions. A mesma chave deve ser mantida durante toda a vida dos dados.
2. Cadastre `WIIZE_API_CRON_SECRET` somente se a migração administrativa for chamada
   por automação externa. Não é necessário criar cron para o funcionamento diário.
3. Publique todas as Edge Functions atualizadas antes de ativar os bloqueios do banco.
4. Execute `migrate-chat-encryption` até não restarem registros antigos.
5. Aplique `drizzle/migrations/0001_enforce_encrypted_chat_content.sql` para impedir
   definitivamente novas gravações em texto puro.
6. Valide envio e recebimento real pela Meta e Evolution, incluindo texto, mídia,
   template, resposta, automação, resumo, Inteligência e Realtime.

Nunca aplique os bloqueios do banco antes de cadastrar a chave e publicar todas as
funções: isso interromperia os caminhos antigos que ainda tentassem gravar texto puro.

## Rotação da chave

Uma rotação exige manter temporariamente a chave anterior, decifrar com ela e cifrar
novamente com a chave nova em uma rotina controlada. Nunca substitua a chave antes dessa
recriptografia: ciphertext existente não é recuperável sem a chave correspondente.

## Limite de proteção

É criptografia em repouso, não ponta a ponta. Protege dumps e backups sem a chave. Um
invasor que comprometa simultaneamente o banco e o ambiente das Edge Functions ainda pode
decifrar os dados.