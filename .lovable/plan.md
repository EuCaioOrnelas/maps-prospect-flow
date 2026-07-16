# Refatoração da Integration Layer — Provider Registry Architecture

## Objetivo

Transformar `/api/v1/context` em um **orquestrador puro**, extrair a lógica dos providers para **20 endpoints privados** (`/api/v1/providers/*`) e introduzir um **Provider Registry** como núcleo de descoberta, orquestração, cache e paralelismo.

## Arquitetura alvo

```text
Wian → POST /api/v1/context
          ↓
       Auth (client_id/secret + JWT)
          ↓
       Context Builder (orquestrador puro)
          ↓
       Provider Registry (descoberta + dependências + paralelismo + cache)
          ↓
       Providers (Cockpit, CRM, Meta, Pipeline, Forecast, ...)
          ↓
       Consolidação + Metadata + Cache
          ↓
       Resposta única

Wian/Internal → POST /api/v1/providers/<name>
          ↓
       Auth → Registry.resolve(name) → Provider.execute() → Response
```

## Estrutura de pastas

```text
supabase/functions/
├── _integration-core/                 (código compartilhado — importado via caminho relativo)
│   ├── auth.ts
│   ├── rateLimit.ts
│   ├── audit.ts
│   ├── response.ts
│   ├── cache.ts                       (novo — cache por provider, TTL configurável)
│   ├── errors/catalog.ts
│   ├── filters/filterSchema.ts
│   ├── registry/
│   │   ├── ProviderRegistry.ts        (núcleo: register, resolve, execute, parallel, deps)
│   │   ├── ProviderInterface.ts       (contrato: metadata + execute)
│   │   └── index.ts                   (registra todos os providers ao importar)
│   └── providers/
│       ├── cockpitProvider.ts
│       ├── crmProvider.ts
│       ├── opportunitiesProvider.ts
│       ├── pipelineProvider.ts
│       ├── metaProvider.ts
│       ├── campaignsProvider.ts
│       ├── forecastProvider.ts
│       ├── contactsProvider.ts
│       ├── analyticsProvider.ts
│       ├── dashboardProvider.ts
│       ├── financeProvider.ts
│       ├── automationProvider.ts
│       ├── conversationsProvider.ts
│       ├── leadsProvider.ts
│       ├── scoresProvider.ts
│       ├── usersProvider.ts
│       ├── companyProvider.ts
│       ├── settingsProvider.ts
│       ├── permissionsProvider.ts
│       └── insightsProvider.ts
│
├── integration-v1-context/            (refatorado — orquestrador puro)
│   └── index.ts
│
└── integration-v1-provider/           (endpoint único, roteia via ?name= ou path suffix)
    └── index.ts
```

> **Nota técnica:** Supabase Edge Functions não permitem paths dinâmicos por função. Usaremos **uma única função** `integration-v1-provider` que resolve o provider via body (`{ provider: "crm", ... }`) ou header `x-provider-name`. Isso expõe a URL pública como `POST /functions/v1/integration-v1-provider` e simula os 20 endpoints logicamente. O Developer Center documentará cada um como se fosse uma rota independente (`/api/v1/providers/<name>`), com o Playground preenchendo `provider` automaticamente.

## Contrato do Provider

```ts
interface Provider {
  metadata: {
    name: string;              // "crm"
    description: string;
    version: string;           // "1.0.0"
    requiredPermissions: string[];
    minimumPlan: "start" | "growth" | "scale";
    supportedFilters: string[];
    defaultCacheTTL: number;   // segundos
    priority: number;          // 1-10 (menor = mais crítico)
    dependencies: string[];    // outros providers
    inputDTO: ZodSchema;
    outputDTO: ZodSchema;
  };
  execute(ctx: ProviderContext): Promise<ProviderResult>;
}

interface ProviderContext {
  company_id: string;
  user_id: string;
  permissions: string[];
  plan: string;
  filters: Record<string, unknown>;
  pagination: { page: number; limit: number };
  sort: { field: string; direction: "asc" | "desc" };
  registry: ProviderRegistry;   // permite acesso a deps resolvidas pelo Registry
}

interface ProviderResult {
  data: unknown;
  metadata: {
    version: string;
    processing_time_ms: number;
    cache: { hit: boolean; ttl: number };
    filters_applied: Record<string, unknown>;
    records_count: number;
  };
}
```

## Provider Registry

Responsabilidades:
- `register(provider)` — indexa por nome
- `resolve(name)` — retorna provider ou lança `PROVIDER_NOT_FOUND`
- `list()` — retorna todas as metadatas (usado pelo Developer Center)
- `executeMany(names, ctx)` — resolve grafo de dependências, executa em paralelo os independentes, sequencial nos dependentes, consulta cache antes de cada execução
- `getCatalog()` — snapshot serializável para UI

## Context Builder (novo `integration-v1-context/index.ts`)

Puro orquestrador — nenhuma regra de domínio:

```ts
1. auth() → { company_id, user_id, permissions, plan }
2. rateLimit()
3. parse body → { modules: string[], filters, pagination, sort }
4. registry.executeMany(modules, ctx)   // Registry cuida de deps + paralelismo + cache
5. consolidate() → merge results por module name
6. audit()
7. respond()
```

## Cache

- Módulo `_integration-core/cache.ts` — em memória por instância (Map com TTL). Suficiente para MVP e coerente com edge functions.
- Chave: `provider:<name>:<company_id>:<hash(filters+pagination+sort)>`
- Cada provider declara `defaultCacheTTL`; Registry consulta antes de executar.
- `x-integration-cache-bypass: true` força refresh.

## Novos endpoints do Developer Center

- Nova página **Provider Registry** em `/admin/integration/registry`:
  - Tabela com todos os providers (metadata + status + última execução — via `integration_audit_log`)
  - Detalhe expandido: dependências, filtros, permissões, cache TTL
- Playground atualizado: dropdown "Endpoint" com `/context` + 20 providers; body dinâmico conforme provider selecionado.
- Registry no frontend (`src/pages/admin/integration/registry/providers.ts`) sincronizado manualmente com as metadatas do backend (fonte da verdade continua no backend; frontend serve para docs).

## Migrations

Nenhuma. `integration_audit_log` já cobre — apenas passaremos `endpoint = "provider:<name>"` ou `"context"` no campo existente.

## Compatibilidade

- URL pública de `/api/v1/context` **não muda**.
- Comportamento observável do endpoint `/context` permanece idêntico (mesmo response shape).
- Adiciona nova função `integration-v1-provider`.

## Arquivos a criar

- `supabase/functions/_integration-core/cache.ts`
- `supabase/functions/_integration-core/registry/ProviderRegistry.ts`
- `supabase/functions/_integration-core/registry/ProviderInterface.ts`
- `supabase/functions/_integration-core/registry/index.ts`
- `supabase/functions/_integration-core/providers/*.ts` (20 arquivos — 3 migrados dos atuais + 17 novos com implementação mínima real usando as tabelas existentes)
- `supabase/functions/integration-v1-provider/index.ts`
- `src/pages/admin/integration/pages/Registry.tsx`

## Arquivos a mover/remover

- Mover código de `integration-v1-context/{auth,rateLimit,audit,response,errors,filters,contextBuilder,providers}` para `_integration-core/*`. Deletar duplicatas.
- Reescrever `integration-v1-context/index.ts` como orquestrador puro.

## Arquivos a editar

- `src/pages/admin/integration/IntegrationLayout.tsx` (adicionar link Registry)
- `src/pages/admin/integration/registry/providers.ts` (expandir para 20 providers)
- `src/pages/admin/integration/pages/Playground.tsx` (suporte a provider endpoints)
- `src/pages/admin/integration/pages/Endpoints.tsx` (listar 21 endpoints)
- `src/App.tsx` (rota `/admin/integration/registry`)

## Riscos e mitigação

- **Import compartilhado entre edge functions:** Supabase suporta imports relativos entre pastas irmãs dentro de `supabase/functions/`. Já usado em outros projetos. Validaremos no deploy.
- **20 providers com implementação real:** MVP entrega os 3 já existentes (CRM, Meta/Campaigns via split, KPIs→Cockpit) totalmente funcionais + 17 stubs que retornam schema válido com `status: "not_implemented"` na metadata, permitindo o Registry funcionar end-to-end e serem preenchidos incrementalmente sem quebrar contrato.
- **Cache in-memory por instância:** aceitável para MVP; documentado como limitação; futuro upgrade para Redis/Deno KV.

## Escopo desta entrega

1. Core compartilhado (`_integration-core/`) + Registry + Cache
2. 20 providers registrados (3 completos + 17 stubs consistentes)
3. Endpoint único `integration-v1-provider` roteando via Registry
4. `integration-v1-context` refatorado como orquestrador puro
5. Página `Registry` no Developer Center + Playground atualizado
6. Sem migration nova, sem novos secrets

Após aprovação, executo tudo em paralelo.
