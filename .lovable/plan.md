# Wiize Evolui — Reestruturação da Central de Sugestões

## Diagnóstico da auditoria (o que existe hoje)

- **Página do usuário** `/sugestoes` (`src/pages/Suggestions.tsx`): formulário com título, categoria, importância e descrição; limite de 1 sugestão/dia; salva direto na tabela `suggestions`.
- **Admin** `/admin/sugestoes` (`src/pages/admin/AdminSuggestions.tsx`): métricas simples, tabela com busca/filtros/paginação, mudança de status e e-mail ao marcar "em desenvolvimento".
- **Tabela `suggestions`**: 14 colunas, RLS por dono/admin, trigger de limite diário. Sem votos, sem listagem pública, sem IA.
- **Infra reutilizável**: 20+ edge functions de IA (padrão `gpt-4o-mini` + log em `ai_usage_logs`), `user_notifications` + sininho, Recharts nos dashboards admin, `has_role`/`user_roles` para permissões.
- **Falta hoje**: votação, listagem da comunidade, análise/agrupamento por IA, planejamento mensal, publicações de roadmap, notificações de status.

## Estratégia

Evoluir o que existe — nada de tabela duplicada nem app novo. A tabela `suggestions` ganha colunas novas (aditivas, sem apagar nada) e tabelas novas complementares. Implementação em 5 etapas, validando cada uma.

## Etapa 1 — Banco de dados (migration aditiva)

- **`suggestions`**: novas colunas nullable — `is_public` (default true), `problem`, `expected_behavior`, `expected_benefit`, `vote_count` (default 0), `ai_status` (pendente/processando/analisada/falha/revisao), `ai_summary`, `ai_category`, `ai_priority_score`, `ai_priority_reason`, `ai_group_id`, `implemented_at`, `implementation_notes`, `admin_notes`. Status novos passam a valer: recebida, em_analise, em_avaliacao_comunidade, planejada, em_desenvolvimento, implementada, nao_planejada (os antigos continuam válidos — compatibilidade).
- **`suggestion_votes`** (nova): suggestion_id + user_id único, RLS (votar só autenticado, 1 voto por sugestão, sem manipulação pelo frontend — contagem via trigger no banco).
- **`suggestion_groups`** (nova): grupos consolidados pela IA — nome, descrição, problema, solução, totais (sugestões, usuários, empresas, votos), prioridade 0–100, justificativa, confiança, situação (pendente/aprovado/revisao), flag `admin_locked` para correções manuais não serem sobrescritas.
- **`suggestion_cycles`** + **`suggestion_cycle_items`** (novas): planejamento mensal com status (em avaliação → implementada/adiada/cancelada), responsável, prazo, justificativa.
- **`suggestion_releases`** (nova): publicações "Em desenvolvimento" / "Últimas melhorias" alimentadas pelo planejamento.
- **`suggestion_audit_log`** (nova): histórico de toda alteração administrativa.
- Grants + RLS em todas; triggers de contagem de votos e atualização de totais do grupo.

## Etapa 2 — Página pública "Wiize Evolui" (`/sugestoes`)

- Novo posicionamento: título "A próxima evolução da Wiize começa com você", subtítulo e texto do ciclo mensal, botões "Enviar uma sugestão" / "Explorar sugestões".
- Seção "Como funciona" com as 4 etapas.
- **Formulário preservado** (título, categoria, importância, descrição) + campos progressivos opcionais (problema, como deveria funcionar, benefício esperado). Mesmo fluxo de gravação, limite diário e tela de sucesso.
- **Explorar sugestões**: listagem pública das `is_public` com busca, filtro por categoria/status, ordenação (mais votadas/recentes) e votação (1 voto por usuário, controlada no banco). Autor exibido só conforme privacidade atual (nome/empresa já gravados).
- Seções "Em desenvolvimento na Wiize" e "Últimas melhorias implementadas" alimentadas por `suggestion_releases`.
- Visual no padrão Wiize (verde #178C61, tokens semânticos, skeletons, estados vazios).

## Etapa 3 — IA Analista de Produto (edge function `suggestions-analyst`)

- Reutiliza o padrão das edge functions existentes: `gpt-4o-mini`, service role, log em `ai_usage_logs`, sem chave nova.
- **Fluxo em fila**: sugestão salva → `ai_status = pendente` → função analisa (problema, funcionalidade, objetivo, módulo, categoria, benefício, público, nova vs melhoria, justificativa) → resultado validado contra schema JSON → gravado. Falha de IA nunca impede o envio.
- **Agrupamento**: ao analisar, a IA compara com grupos abertos e sugere vínculo ou novo grupo; dúvida → "Revisão necessária". Registros originais nunca são apagados/mesclados.
- **Pontuação 0–100**: demanda 30, valor ao cliente 25, alinhamento 20, viabilidade 15, oportunidade 10 — sempre com justificativa; critério sem dados → "Dados insuficientes". Recomendação, nunca decisão automática.
- Conteúdo das sugestões tratado como dado não confiável (nunca instrução); IA não executa SQL nem ações administrativas.
- Processamento acionado por botão no admin + reprocessamento sob demanda (evita custo por abertura de página).

## Etapa 4 — Central administrativa (`/admin/sugestoes`)

- **Dashboard**: cards (total, novas, em análise, planejadas, em desenvolvimento, implementadas, votos, usuários participantes) + gráficos Recharts (sugestões/mês, por categoria, evolução de votos, por status, categorias em crescimento, mais solicitadas) — tudo com dados reais, filtros de período e categoria.
- **Tabela completa**: colunas ID, título, usuário/empresa, categoria, tema IA, grupo, votos, data, status, status GPT, prioridade IA; busca, filtros (categoria/status/período/prioridade), ordenação, paginação, detalhes, edição, status, observações internas. Preserva tudo que já existe.
- **Análise inteligente**: tabela de grupos (funcionalidade, categoria, sugestões, usuários, empresas, votos, prioridade, confiança, situação); ao abrir: resumo, problema, solução, sugestões originais, argumentos, dificuldades, impacto, pontuação e justificativa. Ações: aprovar, desfazer, mover sugestão, reexecutar análise, editar categoria, corrigir IA, marcar não relacionado, criar grupo manual — correções marcadas `admin_locked`.
- **Planejamento mensal**: criar ciclo, selecionar grupos, justificar, responsável, prazo, status, publicar melhoria, registrar conclusão. Publicação gera entrada em `suggestion_releases` (sem publicação duplicada).
- E-mail "em desenvolvimento" atual mantido e corrigido (carimbo de envio só após sucesso).

## Etapa 5 — Notificações

- Reutiliza `user_notifications` + sininho: sugestão recebida, em análise, planejada, em desenvolvimento, implementada — via funções security definer com dedupe, sem disparos excessivos.

## Segurança (transversal)

- RLS em todas as tabelas novas; votos e status só no backend; usuário comum nunca altera status administrativo; isolamento por empresa mantido; logs de auditoria; idempotência nos envios.

## Arquivos principais

- **Novos**: `supabase/functions/suggestions-analyst/index.ts`, `src/components/suggestions/*` (hero, form, explorer, vote button, releases), `src/components/admin/suggestions/*` (dashboard, groups, cycles), `src/hooks/useSuggestions*.ts`, migration `0041_wiize_evolui.sql` + `docs/sql/prod-wiize-evolui.sql`.
- **Editados**: `src/pages/Suggestions.tsx`, `src/pages/admin/AdminSuggestions.tsx`, `src/lib/suggestions.ts`, `src/App.tsx` (título da aba), `src/components/notifications/AnnouncementsDialog.tsx` (novos tipos de aviso).

## Validação

- Testes de regras (voto único, limite diário, status, pontuação) junto aos testes existentes; build; verificação no navegador das duas páginas; checagem de RLS.
