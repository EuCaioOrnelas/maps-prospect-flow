# Auditoria + Correções: Influenciadores (Abordagem, Respostas, Spam) e Segurança

## 1. BUG "clico na campanha e aparece respondido" + "status continua sem contato"
- **Causa raiz do "respondido"**: nada recebe as respostas dos influenciadores hoje — não existe rota de *inbound* para `parcerias+INF…@wiize.com.br`. O status "Resposta recebida" só deveria ser gravado quando uma resposta real chegar (webhook do Resend) ou quando o admin marcar manualmente.
- **Causa raiz do "sem contato"**: ao enviar a campanha, o prospecto só muda de status se estiver em `qualificado/contato_encontrado/contatos_identificados/pronto_abordagem`. Quem estava `sem_contato` nunca avança. E o `reply_token` (obrigatório, sem default) não era gerado no `create_campaign`, fazendo o envio quebrar.
- **Correção**: criar tabela `influencer_messages` (thread de e-mail: ida/volta, assunto, corpo, anexos), trigger que gera `reply_token` sozinho, incluir `sem_contato`/`contato_encontrado` na transição pós-envio, e função de inbound que marca `respondido` **só** quando chega resposta real.

## 2. Como ver a resposta / replicar sistema de tickets no card
- Nova aba **Conversa** no card do influenciador (em Abordagens), no estilo dos tickets: histórico do e-mail (balões ida/volta), campo de anotação, botão "Enviar e-mail" (com anexo opcional) e atalhos de contato. Respostas recebidas aparecem ali automaticamente.
- Novo diálogo de detalhe de campanha mostra, por destinatário, o status real + atalho para abrir a conversa.

## 3. Receber e-mail de teste dos modelos (admin)
- Botão "Enviar teste" em cada modelo salvo (e no editor). Envia o modelo renderizado com as variáveis para o e-mail do próprio admin logado.

## 4. Spam: mensagens da Wiize caindo em spam
- A causa dominante é **configuração de domínio**: o projeto ainda não tem domínio de e-mail configurado; os e-mails de influenciador usam `parcerias@wiize.com.br` fora da infraestrutura oficial da Wiize, e o link de descadastro aponta para um domínio do backend (falha de alinhamento SPF/DKIM/DMARC).
- Correções no envio: From com nome pessoal + domínio do remetente, `Reply-To` no mesmo domínio, link de descadastro no domínio da Wiize, `X-Entity-Ref-ID`/threading, corpo mais limpo com versão em texto real, intervalo de envio maior.
- Necessária ação do usuário: configurar o domínio de e-mail da Wiize no Painel (abro o fluxo de setup) e verificar SPF/DKIM/DMARC.

## 5. Auditoria de segurança + funcionamento
- Corrigir 3 falhas críticas encontradas no scan (`supabase_lov`):
  - Usuário consegue **promover o próprio role** em `account_members` (self-update sem restrição de coluna) → trigger restringe a `last_login_at`.
  - Usuário consegue **auto-outorgar plano pago/limites** em `profiles` (self-update sem restrição de coluna) → trigger reverte colunas sensíveis para não-admins.
  - `lead_deals` pode ser **reassigned fora do tenant** (UPDATE sem WITH CHECK) → adicionar WITH CHECK.
- Auditoria funcional dos fluxos de envio/resposta e do dashboard de campanha.

## Arquivos
- **Criar**: `supabase/functions/influencer-email-inbound/index.ts`, `supabase/functions/influencer-email-test/index.ts` (ou ação no outreach), `src/components/admin/partners/InfluencerThreadDialog.tsx`.
- **Editar**: `supabase/functions/influencer-outreach/index.ts` (reply_token, transição de status, From/Reply-To/unsubscribe, ações `send_reply`/`send_test`), `src/pages/admin/AdminInfluencerOutreach.tsx` (conversa no card, status real, botão teste), `src/components/admin/partners/InfluencerContactsDialog.tsx` (link para a conversa).
- **Banco**: migration com `influencer_messages`, triggers de segurança, `reply_token` automático e WITH CHECK de `lead_deals`.
