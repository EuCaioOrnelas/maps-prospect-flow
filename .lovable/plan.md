
# Integration Layer — Fase 1 (Fundação)

Camada enterprise desacoplada para que o Wian (e futuros produtos) consuma dados da Wiize sem conhecer o banco. Nenhuma funcionalidade atual é alterada — só adição.

## O que será entregue

- 1 endpoint versionado `POST /api/v1/context` (edge function `integration-v1-context`)
- Context Builder que orquestra Providers conforme os módulos pedidos
- 3 Providers: **CRM** (leads + pipeline), **Meta Campaigns**, **KPIs/Forecast**
- Autenticação dupla: `client_id` + `client_secret` do Wian **+** JWT do usuário Wiize
- Rate limit por IP / empresa / usuário / endpoint
- Auditoria completa em tabela `integration_audit_log`
- Contrato de resposta padronizado + catálogo de erros
- Portal admin oculto `/admin/integration` com documentação navegável e endpoint de teste (playground read-only)

## Fora do escopo desta fase (fica para fase 2+)

- Cache Redis (arquitetura preparada, mas MVP usa cache em memória por request)
- Auto-descoberta de docs via registro central (docs manuais versionadas)
- Providers para chat, warming, score, agentes, fluxos, receita, oportunidades
- Eventos em tempo real (webhooks Wiize→Wian)
- Changelog automático (manual em MDX)
- OAuth 2.0 formal

## Arquitetura

```text
supabase/functions/integration-v1-context/
  index.ts                    # entrypoint HTTP, CORS, router
  auth.ts                     # valida client_id/secret + JWT
  rateLimit.ts                # reutiliza check_rate_limit RPC existente
  audit.ts                    # grava integration_audit_log
  response.ts                 # contrato padrão + erros
  contextBuilder.ts           # orquestra providers
  providers/
    crmProvider.ts            # leads, pipeline_stages, tags
    metaCampaignsProvider.ts  # meta_campaigns + métricas agregadas
    kpisProvider.ts           # reutiliza lógica do Growth Cockpit
  dto/
    crm.ts
    campaigns.ts
    kpis.ts
    context.ts
  filters/
    filterSchema.ts           # Zod: período, paginação, ordenação, tags, etc
  errors/
    catalog.ts                # códigos: AUTH_*, PERM_*, RATE_*, VALIDATION_*, PROVIDER_*
```

## Contrato de request

```json
POST /functions/v1/integration-v1-context
Headers:
  Authorization: Bearer <JWT do usuário Wiize>
  x-integration-client-id: <wian>
  x-integration-client-secret: <secret>
  x-request-id: <uuid opcional>
Body:
{
  "version": "v1",
  "modules": ["crm.leads", "crm.pipeline", "campaigns.meta", "kpis.forecast"],
  "filters": {
    "period": { "from": "2026-01-01", "to": "2026-01-31" },
    "pagination": { "page": 1, "size": 50 },
    "tags": ["quente"],
    "stage_id": "uuid|null",
    "sort": "created_at:desc"
  }
}
```

## Contrato de response (padrão único)

```json
{
  "status": 200,
  "success": true,
  "timestamp": "2026-07-16T...",
  "request_id": "uuid",
  "company_id": "uuid",
  "version": "v1",
  "processing_time_ms": 142,
  "cache": { "hit": false, "ttl_s": 0 },
  "filters_applied": { ... },
  "context": {
    "crm.leads": { data: [...DTOs...], meta: {total, page, size} },
    "campaigns.meta": { ... },
    "kpis.forecast": { ... }
  },
  "errors": []
}
```

Erros sempre no mesmo envelope, com `error.code` do catálogo (nunca stack trace, nunca SQL).

## Segurança (defense in depth)

1. HTTPS (Supabase edge nativo)
2. `client_id` + `client_secret` — secrets `INTEGRATION_WIAN_CLIENT_ID` e `INTEGRATION_WIAN_CLIENT_SECRET` (compare com `timingSafeEqual`)
3. JWT do usuário validado com `supabase.auth.getUser()` — daí extraímos `user_id` e `company_id` (via profile). Isolamento tenant é **derivado do JWT**, nunca do body.
4. Rate limit por chave `client_id + user_id + endpoint` (reutiliza `check_rate_limit`)
5. Auditoria de toda requisição (sucesso ou falha) com IP, UA, filtros, tempo
6. Zero exposição de IDs internos sensíveis, tokens Meta, secrets

## Banco (1 migration nova)

```sql
CREATE TABLE public.integration_audit_log (
  id uuid PK,
  request_id uuid,
  client_id text,
  user_id uuid,
  company_id uuid,
  endpoint text,
  version text,
  modules text[],
  filters jsonb,
  status_code int,
  success bool,
  error_code text,
  processing_time_ms int,
  records_returned int,
  ip inet,
  user_agent text,
  created_at timestamptz
);
-- GRANTs + RLS: só service_role escreve; admins leem.
-- Índices por (created_at desc), (user_id), (client_id, created_at).
```

Nenhuma tabela existente é alterada.

## Portal de documentação (frontend)

Rota **`/admin/integration`** protegida por `useAdminCheck`, com sidebar:

- Visão Geral · Arquitetura · Autenticação · Versionamento
- Providers (uma página por provider, gerada de um objeto TS `PROVIDER_DOCS`)
- Endpoints · Filtros · DTOs · Respostas · Erros
- Rate Limits · Cache · Auditoria · Segurança · Limites operacionais
- **Playground** (formulário que monta o body e chama a edge function real usando o JWT do admin logado, mostrando request/response/tempo)
- Changelog (MDX manual) · Roadmap

Docs vivem em `src/pages/admin/integration/docs/*.tsx` como componentes React (não markdown externo, para bater com o padrão do projeto).

## Arquivos criados

Frontend (portal):
- `src/pages/admin/integration/IntegrationLayout.tsx`
- `src/pages/admin/integration/IntegrationHome.tsx`
- `src/pages/admin/integration/pages/Overview.tsx`, `Architecture.tsx`, `Auth.tsx`, `Versioning.tsx`, `Providers.tsx`, `Endpoints.tsx`, `Filters.tsx`, `Dtos.tsx`, `Responses.tsx`, `Errors.tsx`, `RateLimits.tsx`, `Cache.tsx`, `Audit.tsx`, `Security.tsx`, `Limits.tsx`, `Playground.tsx`, `Changelog.tsx`, `Roadmap.tsx`
- `src/pages/admin/integration/registry/providers.ts` (metadata dos providers)
- `src/pages/admin/integration/registry/endpoints.ts`
- `src/pages/admin/integration/registry/filters.ts`
- `src/pages/admin/integration/registry/errors.ts`

Backend (edge function):
- `supabase/functions/integration-v1-context/index.ts` + arquivos irmãos listados acima

Rota registrada em `src/App.tsx` (adição pontual, admin-only).
Secrets criados: `INTEGRATION_WIAN_CLIENT_ID`, `INTEGRATION_WIAN_CLIENT_SECRET`.

## Arquivos alterados

- `src/App.tsx` — 1 rota nova aninhada em `/admin/integration/*`
- `src/components/admin/AdminSidebar.tsx` (ou equivalente) — 1 item de menu novo, se existir sidebar admin
- `supabase/migrations/<timestamp>_integration_audit_log.sql` (nova, não altera tabelas existentes)

## Riscos e como mitigo

- **Regressão zero**: nenhum arquivo funcional atual é modificado. Só adições + 1 rota admin + 1 migration aditiva.
- **Multi-tenant**: `company_id` sempre derivado do JWT do usuário, nunca do body. Testado no playground.
- **Custo de tempo**: MVP focado em 3 providers; adicionar novos é copiar o padrão.
- **Compatibilidade futura**: versão no path (`/api/v1/`) e no body (`version: "v1"`), permitindo v2 lado a lado.

## Próximos passos após aprovação

1. Migration + GRANTs + RLS (`supabase--migration`)
2. Registrar os 2 secrets (`INTEGRATION_WIAN_CLIENT_ID` random via `generate_secret`, `INTEGRATION_WIAN_CLIENT_SECRET` random via `generate_secret`)
3. Edge function completa (arquivos backend acima)
4. Portal admin (todos os arquivos frontend acima)
5. Deploy + smoke test via `supabase--curl_edge_functions`
6. Documentar no portal como o Wian deve chamar (com exemplos curl e fetch)

Confirma para eu prosseguir?
