# Wiize ChatWeb — plano de implementação

## Como funciona hoje (auditoria)
- Os fluxos ficam salvos no banco (fluxo, blocos, ligações) e um único "executor" lê o desenho, anda bloco a bloco e guarda onde cada conversa parou (respostas, variáveis, histórico, esperas).
- O envio de mensagens está "colado" no executor: ele chama direto a API oficial da Meta, a Evolution e o Instagram.
- A conversa é identificada pelo dono da conta + telefone (últimos 8 dígitos).
- O chat interno tem peças visuais reaproveitáveis (área de mensagens, campo de digitação), mas busca dados só do WhatsApp.
- O CRM recebe leads pelo bloco "Enviar ao CRM" (procura por telefone, senão cria com origem "Automação WhatsApp").
- Achados de segurança a corrigir junto: o executor aceita chamadas sem verificar quem chamou; a busca de conversa não separa por fluxo/conexão.

## Estratégia multicanal (sem duplicar fluxos)
```text
Visitante web ─► chatweb-api ─┐
                              ├─► Executor atual (mesmos blocos, IA, CRM)
WhatsApp ─► wa-flow-runner ───┘        │
                                       ▼
                        Adaptador de canal: whatsapp | chatweb
```
- O executor ganha um campo `channel` em cada execução. Para `chatweb`, em vez de chamar Meta/Evolution, a mensagem é gravada no histórico da sessão web (botões viram botões reais).
- Execuções WhatsApp continuam idênticas: o padrão é `whatsapp` e o código atual de envio não muda.
- Execuções web são encontradas pela sessão, nunca por telefone — não se misturam com WhatsApp.

## Compatibilidade dos blocos
- Funcionam nos dois: Entrada, Mensagem, Botões, Condição, Esperar, Coletar dado, Agente IA, Ação/CRM, Teste A/B, Divisão, Planilhas, Agenda, Gmail, Avaliação, Fim.
- Com ajuste: Mídia (vira imagem/vídeo/documento no chat web); Transferir para humano (vai para a caixa de entrada marcado "ChatWeb").
- Só WhatsApp/Instagram: blocos de Instagram e condições por "status do cliente WhatsApp" — o editor mostra aviso quando o fluxo está com ChatWeb ativo.

## O que será construído
1. Menu ⋮ do fluxo: "Transformar em ChatWeb" (modal com o texto pedido) e "Desativar ChatWeb".
2. Lista de fluxos: filtro Todos / WhatsApp / ChatWeb, selo de canal, sessões e atendimentos.
3. Página do ChatWeb com abas: Geral, Aparência (prévia ao vivo, foto otimizada em WebP ~256px), Link (endereço único com verificação em tempo real), Incorporar no site (código do chat completo e do botão flutuante), Sessões e histórico, Estatísticas (com filtro de período e comparação com WhatsApp).
4. Página pública do atendimento (`/c/<endereço>`) com o visual do chat da Wiize: cabeçalho, balões, horários, status, emojis, Enter/Shift+Enter, "digitando", botões clicáveis, continuidade ao recarregar.
5. Script do widget flutuante (arquivo público) + modo incorporado, com domínios autorizados.
6. CRM: lead com origem "ChatWeb", sem duplicar (procura por telefone/e-mail coletados).

## Detalhes técnicos
- Banco: `chatweb_configurations` (slug com UNIQUE + palavras reservadas + histórico de slugs antigos que não podem ser reaproveitados), `chatweb_sessions` (hash do token, expiração), `chatweb_messages`; colunas `channel` e `chatweb_session_id` em `wa_flow_executions`; `channel` em `ai_usage_logs`. RLS por `is_account_member(owner)`; visitantes não acessam tabelas — só pela função `chatweb-api`.
- `chatweb-api` (pública): iniciar sessão (token aleatório, só o hash é salvo), enviar mensagem, buscar histórico; limite de mensagens por sessão/IP via `check_rate_limit`; texto puro sanitizado; checagem de domínio autorizado.
- `wa-flow-runner`: extrair envio para `sendViaChannel(ctx, …)`; ramo chatweb grava em `chatweb_messages`; aceitar chamada interna só com segredo de serviço (corrige a falha de autenticação sem quebrar os webhooks atuais — eles serão conferidos antes).
- Embed: iframe para `/c/<slug>?embed=1`; `postMessage` só aceito da origem da Wiize; widget em `public/chatweb-widget.js` sem chaves.
- Testes: unitários de slug/sanitização/compatibilidade e teste ponta a ponta com navegador (ativar, conversar, botões, recarregar, isolamento entre dois visitantes).

## Pendências que dependem de você
- Domínio `chat.wiize.com.br`: até apontá-lo, o link usa o endereço atual do site + `/c/<endereço>`.
- Resposta do atendente humano direto pelo ChatWeb fica preparada, mas ligada numa etapa seguinte.
- Será entregue em etapas (banco → executor → telas → página pública/widget → testes), com a lista de arquivos ao final.
