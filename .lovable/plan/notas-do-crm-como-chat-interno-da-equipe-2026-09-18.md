# Notas do CRM como chat interno da equipe

## Objetivo

Transformar a aba "Notas e histórico" do CRM em uma conversa interna entre os usuários da conta, com o mesmo visual e comportamento do Chat, resposta a mensagens, agrupamento por autor e proteção do conteúdo igual à do Chat.

## Como vai funcionar

- Cada nota vira uma mensagem da equipe, em ordem cronológica (mais antiga em cima, nova embaixo), com rolagem automática.
- Foto do autor aparece apenas na primeira mensagem de uma sequência do mesmo autor; o nome aparece acima da mensagem, como em grupo de WhatsApp.
- Mensagens do próprio usuário ficam alinhadas à direita; as dos colegas à esquerda.
- Responder uma mensagem específica: a citação aparece acima do texto, clicável para rolar até a original.
- Excluir a própria mensagem continua disponível; o histórico de atividades permanece como está, em aba/bloco separado.
- Enter envia, Shift+Enter quebra linha. Atualização em tempo real quando outro usuário da conta escreve.

## Onde aparece

1. CRM → detalhes do contato → aba "Notas e histórico": a parte de notas vira o chat interno.
2. Chat → clicar no cabeçalho do contato → painel de informações: novo botão "Notas da equipe" que abre o mesmo chat interno, para escrever direto de lá.

## Segurança

- O texto das notas passa a ser gravado criptografado (AES-256-GCM, formato `enc:v1:<iv>:<ciphertext>`), mesma estratégia já usada nas mensagens do Chat, com a chave existente apenas no backend.
- Leitura e escrita passam a ocorrer por uma função de backend própria, `lead-notes`, autocontida em um único `index.ts`, que valida sessão, conta/colaborador e a posse do contato antes de devolver ou gravar texto.
- Limites contra abuso: tamanho máximo por mensagem, limite de envios por minuto por usuário, e recusa de resposta a mensagem de outro contato/conta.
- Notas antigas em texto puro continuam legíveis durante a transição, sem alterar datas, autores ou IDs.

## Detalhes técnicos

- Migração: adicionar `reply_to_id uuid` (FK para `lead_notes`, `on delete set null`), `updated_at`, índice por `lead_id, created_at`; manter RLS por `owner_user_id` e restringir escrita direta de texto puro após a publicação da função.
- Nova Edge Function `supabase/functions/lead-notes/index.ts` (somente `index.ts`, sem `_shared`): ações `list`, `create`, `delete`, com cripto/decripto local mínimos usando `WIIZE_MESSAGE_ENCRYPTION_KEY`.
- Novo componente `src/components/crm/LeadNotesChat.tsx` com agrupamento por autor, bolhas, citação de resposta, avatar/nome via `profiles` + `account_members`, Realtime em `lead_notes` como sinal para recarregar pela função.
- Novo hook `src/hooks/useLeadNotes.ts` para listar, enviar, responder e excluir.
- `src/components/crm/LeadDetailDialog.tsx`: substituir o bloco de notas atual pelo novo componente, mantendo o bloco de histórico.
- `src/components/chat/ContactDetailsPanel.tsx`: trocar o formulário de nota simples pelo botão/painel com o mesmo componente.
- `src/hooks/useCRM.ts`: `addNote`/`fetchNotes` passam a chamar a função de backend.
