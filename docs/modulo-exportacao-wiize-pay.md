# Módulo Seguro de Exportação e Preparação para Wiize Pay

Status geral: **READY_FOR_WIIZE_PAY** — nada chama o Wiize Pay; o módulo apenas prepara
autorização, escopos, pacotes de exportação, conexões e auditoria.

## Componentes

| Peça | Arquivo | Papel |
|---|---|---|
| API principal | `supabase/functions/integration-export/index.ts` | Autenticação multicamada, senha de integração, solicitação/confirmação/download/cancelamento, auditoria |
| Processador assíncrono | `supabase/functions/integration-export-processor/index.ts` | Gera o pacote JSON, checksum, manifest, upload no bucket, expiração |
| Migration | `drizzle/migrations/0025_integration_export_module.sql` (aplicada) | Tabelas, RLS, grants, índices, token + cron `*/5 * * * *` |
| Bucket | `integration-exports` (privado, 50 MB) via Storage API | Guarda os pacotes; download só por URL assinada (1 h) |
| Frontend | `src/pages/settings/IntegrationWiizePay.tsx` + rota `/configuracoes/integracoes/wiize-pay` + item "Integrações" no menu | Visão geral, Exportar, Histórico, Segurança |

## Fluxo de autorização

1. Usuário owner/admin define a **Senha de Integração** (PBKDF2-SHA-256, 100k iterações, salt de 16 bytes; hash nunca retornado).
2. Solicita exportação → senha validada (5 tentativas → bloqueio progressivo de 15 min) → solicitação `pending`.
3. E-mail (Resend) com link de confirmação; token **hash-only, uso único, 30 min**, mascarado na resposta.
4. Confirmação → `authorized` → processador (fetch best-effort + cron de 5 min) gera pacote `wiize-crm-export` v1.0 com escopos conceituais (crm.read, contacts.read, companies.read, deals.read, sales.read, products.read, contracts.read, attachments.read) e destino `READY_FOR_WIIZE_PAY`.
5. Download apenas por URL assinada (1 h), auditado. Arquivo expira em 7 dias. Estados: pending → authorized → processing → completed/failed/expired/cancelled.

## Segurança

- Frontend apenas solicita; todas as decisões no backend. Nenhuma API key/token no frontend.
- RLS via modelo existente (`is_account_member`), sem modelo paralelo; tokens auditados sem registrar senha/token/secret/conteúdo.
- Revogação (`revoke_connection`) exige senha, marca `revoked`, invalida confirmações pendentes e audita.

## CHECKLIST DE PRODUÇÃO (26 itens)

1. Secrets apenas no backend: `RESEND_API_KEY` presente; `SUPABASE_URL/SERVICE_ROLE_KEY/ANON_KEY` nativos das functions.
2. Nunca expor `SUPABASE_SERVICE_ROLE_KEY` no frontend.
3. Confirmar domínio do e-mail remetente (`suporte@wiize.com.br`) verificado no Resend.
4. Confirmar bucket `integration-exports` privado, limite 50 MB.
5. Políticas de `storage.objects` do bucket sem acesso público (nenhuma policy de SELECT público).
6. RLS ativo em todas as 6 tabelas novas (verificado na migration).
7. `integration_settings.password_hash` sem GRANT para `authenticated` (apenas colunas seguras).
8. Índices de owner/status criados (performance do histórico).
9. Cron `integration-export-processor` ativo a cada 5 min (`cron.job`).
10. Token do cron em `internal_cron_tokens` e validado via header `x-cron-secret`.
11. Rate limit por usuário/ação (RPC `check_rate_limit`) — já aplicado; revisar limites se necessário.
12. Bloqueio de brute-force da senha (5 tentativas → 15 min progressivos) ativo.
13. Tokens de confirmação: hash-only, uso único, 30 min — nunca logar o token em texto puro.
14. Logs das functions sem senhas/tokens (revisar `console.error` em produção).
15. Tabela de auditoria restrita a owner/admin via RLS `is_account_member`.
16. Isolamento entre tenants validado: toda query filtra `owner_user_id`.
17. Testar exportação real de conta com dados e validar checksum/manifest.
18. Testar download: link assinado funciona e expira em 1 h.
19. Testar expiração: arquivo concluído há mais de 7 dias vira `expired`.
20. Testar cancelamento e confirmação duplicada (token reuse deve falhar).
21. Testar bloqueio: 5 senhas erradas → bloqueio e mensagem correta.
22. Testar isolamento: usuário de outra conta não vê exportações/log alheios.
23. Testar revogação com senha e verificar auditoria.
24. Rollback: migration é aditiva; para reverter, desativar cron e revogar acesso às tabelas novas (nenhum dado existente é alterado).
25. Monitorar execuções do processador (falhas aparecem em `integration_export_requests.status = failed`).
26. Rotação de secrets: ao trocar `RESEND_API_KEY`, atualizar apenas o secret da function; ao trocar token do cron, rotacionar em `internal_cron_tokens`.

## Quando o Wiize Pay existir (OAuth 2.0 futuro)

- O Wiize Pay **nunca** recebe senhas nem acesso direto ao banco.
- Fluxo previsto: autorização delegada via OAuth 2.0 com escopos conceituais; `integration_connections` já persiste status/scopes/revogação (`pending → active → revoked/expired/error`).
- Nenhuma sincronização real foi implementada nesta fase — apenas a estrutura.

## Testes obrigatórios (a executar em produção)

Autorização (senha + e-mail), isolamento entre contas, exportação ponta a ponta com download,
bloqueio por brute-force, revogação e expiração.
