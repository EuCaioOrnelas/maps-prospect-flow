# Alertas Executivos 2.0

Hoje o cockpit gera no máximo 5 alertas, todos baseados em score de lead. Falta o essencial para decisão rápida: comparação de períodos (7/30/90 dias), velocidade de resposta, funil parado, agenda e vendas.

## O que muda

### 1. Comparação de períodos (o pedido principal)
Cada métrica-chave passa a ser calculada em janelas móveis e comparada com a janela anterior equivalente:

| Métrica | Fonte | Alerta |
|---|---|---|
| Prospecção (leads encontrados) | `search_history.results_count` | "Você prospectou 42% menos que nos 7 dias anteriores" |
| Novos contatos no CRM | `leads.created_at` | queda/alta relevante |
| Mensagens enviadas | `agent_message_logs` + `chat_messages` | queda de volume de abordagem |
| Conversas ativas | `agent_conversations` | queda de engajamento |
| Vendas fechadas / valor | `lead_deals.closed_at` | variação de receita realizada |
| Reuniões agendadas | `calendar_events` | variação de agendamentos |

Regra: só dispara com base mínima (período anterior > 0 e volume relevante), variação ≥ 15%. O texto acompanha o período selecionado no dashboard (7, 30 ou 90 dias), sempre comparando com o período imediatamente anterior de mesmo tamanho.

### 2. Alertas operacionais novos
- **Leads sem primeiro contato**: leads criados há mais de 48h sem nenhuma mensagem enviada.
- **Conversas sem resposta**: mensagens recebidas há mais de 24h sem resposta (via `chat_messages` inbound sem outbound posterior).
- **Funil travado**: leads parados na mesma etapa do CRM há mais de 14 dias.
- **Oportunidades quentes esquecidas**: score ≥ 601 sem interação nos últimos 7 dias.
- **Agenda vazia**: nenhuma reunião marcada para os próximos 7 dias (quando existem leads quentes).
- **Reuniões sem desfecho**: eventos passados ainda com status pendente.
- **Créditos de prospecção**: consumo próximo do limite do plano ou saldo ocioso não usado no período.
- **Campanhas sem retorno**: campanha Meta com envios e 0 respostas.
- **Número WhatsApp desconectado**: conexão inativa bloqueando envios.
- **Melhor dia/horário**: dia da semana com maior taxa de resposta.
- **Ticket médio e conversão**: variação da taxa de conversão lead → venda entre períodos.

Todos os alertas continuam clicáveis, levando à página correspondente.

### 3. Priorização e UI
- Cada alerta ganha `priority` (0–100). A lista ordena por severidade + prioridade e mostra os 6 mais relevantes, com um "ver mais" para expandir o restante.
- Agrupamento visual por severidade (crítico, atenção, positivo, informativo) e contador no cabeçalho.
- Mantém o padrão visual atual (sem blur, tokens semânticos, arredondamento Wiize).

## Detalhes técnicos
- Toda a lógica nova fica em um módulo novo `src/lib/executiveAlerts.ts` (funções puras de geração de alertas) para não inflar `useDashboardKPIs.ts`.
- `useDashboardKPIs.ts` passa a buscar, em paralelo, as séries de período atual vs anterior e delega a montagem dos alertas ao módulo novo.
- `ExecutiveAlerts.tsx` recebe `priority`, ordena, agrupa e ganha expandir/recolher.
- Sem mudanças de schema: tudo usa tabelas existentes (`search_history`, `leads`, `lead_deals`, `chat_messages`, `agent_message_logs`, `agent_conversations`, `calendar_events`, `whatsapp_campaigns`, `whatsapp_numbers`, `revenue_leads`).
- Todo alerta só aparece com dado real; nada de placeholder ou estimativa fictícia.

## Arquivos
- Criar: `src/lib/executiveAlerts.ts`
- Editar: `src/hooks/useDashboardKPIs.ts`, `src/components/dashboard/v2/ExecutiveAlerts.tsx`
