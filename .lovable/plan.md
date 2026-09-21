# Influenciadores: Kanban, "E-mail enviado" e filtro de canais ativos

## Resposta rápida — Formulário → coluna do CRM → Fluxo

O ajuste ficou em **`supabase/functions/forms-public/index.ts`**: quando o formulário cria o lead já em uma etapa configurada do CRM, agora é registrada a atividade `stage_changed`, que é o evento que dispara o gatilho "Lead entrou em uma etapa". Sem isso o fluxo não iniciava para leads criados direto na coluna. (Tabelas usadas: `lead_activities`, `pipeline_stages`.)

## 1. Visualização Kanban das abordagens

Na aba **Abordagens** entra um seletor Lista / Kanban (padrão Kanban), reaproveitando o comportamento de arrastar do CRM.

- Colunas por status de abordagem: Qualificado, Contatos identificados, Pronto para abordagem, Sem contato, E-mail enviado, Respondeu, Negociação, Parceria ativa.
- Card mostra: foto do canal, nome, e-mail principal (ou "Sem e-mail"), plataforma e selo de status.
- Arrastar e soltar entre colunas grava o novo status no banco (mesma função de atualização já usada na tabela), com reversão visual se falhar.
- Cabeçalho de cada coluna com contagem; busca e filtros atuais continuam valendo para o Kanban.

## 2. "E-mail enviado" após a campanha

O backend já marca o influenciador como `email_enviado` ao concluir o envio. O que falta é a tela refletir isso na hora:

- Ao terminar a fila de envio, recarregar a lista de abordagens.
- Selo "E-mail enviado" visível no card do Kanban e na linha da tabela, com a data do último envio.

## 3. Filtro "canais com vídeos publicados nos últimos X dias"

Hoje a Recência só restringe a busca inicial, mas canais sem publicações recentes ainda entram.

- Novo interruptor na Prospecção: "Somente canais que publicaram nos últimos X dias" com opções 7 / 15 / 30 / 60 / 90 dias.
- No servidor, o canal é descartado quando a data do vídeo mais recente for anterior ao limite escolhido (o dado já é coletado como `latest_video_at`).
- Filtro opcional: desligado mantém o comportamento atual.

## Arquivos previstos

- `src/pages/admin/AdminInfluencerOutreach.tsx` — alternância Lista/Kanban, recarregar após envio.
- `src/components/admin/partners/InfluencerKanbanBoard.tsx` (novo) — colunas, cards e arrastar/soltar.
- `src/lib/influencerOutreach.ts` — colunas do Kanban e ordem dos status.
- `src/pages/admin/AdminInfluencerProspecting.tsx` — controle do filtro de publicações recentes.
- `supabase/functions/youtube-influencer-prospect/index.ts` — aplicar o corte por data do último vídeo.

Sem mudanças de banco. Ao final, verificação visual da tela e typecheck.
