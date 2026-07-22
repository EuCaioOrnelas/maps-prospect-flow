# Wiize Integration Layer — bundle para Supabase Web Editor

Este pacote contém as **duas edge functions** da Integration Layer, com **todo o `_integration-core` inlinado** dentro de cada arquivo. Você pode colar direto no Supabase Web Editor — **não precisa de CLI, nem da pasta `_integration-core`**.

## 📂 O que vem aqui

```
supabase/functions/
├── integration-v1-context/index.ts    (~78 KB, self-contained)
└── integration-v1-provider/index.ts   (~79 KB, self-contained)
```

Cada arquivo já traz inline:
- `response.ts` (envelope + CORS)
- `errors/catalog.ts`
- `filters/filterSchema.ts`
- `cache.ts`
- `audit.ts`
- `rateLimit.ts`
- `auth.ts` (client-id/secret + JWT)
- `registry/*` (ProviderInterface, ProviderRegistry, bootstrap)
- Todos os providers (`cockpit`, `crm`, `pipeline`, `campaigns`, `meta`, `opportunities`, `finance` + stubs)

## 🚀 Como instalar no seu projeto externo (via Web Editor)

Para **cada** uma das duas funções:

1. Supabase Dashboard → **Edge Functions** → **Create a new function**.
2. Nome exatamente igual ao da pasta: `integration-v1-context` e depois `integration-v1-provider`.
3. Cole o conteúdo de `index.ts` correspondente.
4. **Desmarque "Verify JWT"** (ou marque `verify_jwt = false`) — a auth acontece dentro da função, com `x-integration-client-id` + `x-integration-client-secret` + Bearer do usuário.
5. Deploy.

## 🔐 Secrets obrigatórios

No projeto externo (**Settings → Edge Functions → Secrets**), adicione:

| Secret                              | Valor                                                          |
| ----------------------------------- | -------------------------------------------------------------- |
| `INTEGRATION_WIAN_CLIENT_ID`        | mesmo `client_id` que o consumidor (Wian, etc.) vai enviar     |
| `INTEGRATION_WIAN_CLIENT_SECRET`    | mesmo `client_secret` que o consumidor vai enviar              |

Os secrets `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` já vêm por padrão em qualquer projeto Supabase — não precisa configurar.

## 🗄️ Dependências de banco

Os providers assumem as seguintes tabelas/RPCs no banco de destino (mesmo schema da Wiize):

- Tabelas: `account_members`, `profiles`, `user_roles`, `pipeline_stages`, `crm_leads`, `meta_campaigns`, `meta_campaign_events`, `opportunities`, `subscriptions` (e afins).
- RPC: `public.check_rate_limit(p_identifier, p_endpoint, p_max_requests, p_window_seconds)` — se não existir, o rate-limit **falha aberto** (permite a chamada) e loga um warning.
- Tabela de auditoria opcional: `integration_audit_log` — se não existir, o `writeAudit` engole silenciosamente.

Se seu banco externo é cópia do banco da Wiize principal, tudo já existe.

## 📡 Como chamar as funções

**Contexto orquestrado (vários providers de uma vez):**
```http
POST /functions/v1/integration-v1-context
x-integration-client-id: <seu-client-id>
x-integration-client-secret: <seu-client-secret>
Authorization: Bearer <JWT do usuário Wiize>
Content-Type: application/json

{
  "version": "v1",
  "modules": ["cockpit", "crm", "pipeline"],
  "filters": { "period": { "from": "2026-01-01", "to": "2026-01-31" } }
}
```

**Provider individual:**
```http
POST /functions/v1/integration-v1-provider
x-integration-client-id: ...
x-integration-client-secret: ...
Authorization: Bearer <JWT>
Content-Type: application/json

{ "provider": "campaigns", "filters": { "pagination": { "page": 1, "size": 50 } } }
```

## 🧪 Como o bundle foi gerado

Estes arquivos foram construídos por concatenação inteligente dos módulos de `supabase/functions/_integration-core/` mais o endpoint respectivo:

- Imports `../_integration-core/...` foram removidos.
- Imports externos (`https://esm.sh/...`) foram deduplicados.
- Constantes de ambiente duplicadas (`SUPABASE_URL`, etc.) foram deduplicadas.
- Funções `async function execute` de cada provider foram renomeadas para `execute_<provider>` para evitar colisão em escopo único.

Se um dia você quiser atualizar o bundle a partir do código-fonte atualizado do projeto Wiize, rode:

```bash
python3 /tmp/bundle3.py   # script usado na geração — reproduzível
```

(ou peça no chat: "regera o bundle da Integration Layer".)

## ✅ Validação

Ambos os arquivos passam `deno check` sem erros de tipagem, usando o mesmo runtime das edge functions Supabase.
