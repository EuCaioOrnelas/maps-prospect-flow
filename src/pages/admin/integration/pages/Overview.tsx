import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CodeBlock } from "../components/CodeBlock";

const PIPELINE = `Cliente (Wian AI, integrações internas)
     │  POST /functions/v1/integration-v1-context
     ▼
┌───────────────────────────────────────────────────────────┐
│  Edge Function                                            │
│                                                           │
│  1.  CORS preflight (headers HMAC + idempotency)          │
│  2.  API version check           (x-integration-api-ver)  │
│  3.  IP ban check                (integration_ip_bans)    │
│  4.  IP rate-limit               300 req/min por IP       │
│  5.  verifyClient  (primary + previous secret rotation)   │
│  6.  verifyHmac    (timestamp ±300s + nonce único DB)     │
│  7.  Scope check   (CLIENT_REGISTRY[client].scopes)       │
│  8.  Idempotency lookup   (60s replay window, cache+DB)   │
│  9.  Per-user rate-limit  60/min context · 120/min prov.  │
│  10. verifyUser    (Supabase JWT → user_id, company_id)   │
│  11. parseFilters  (Zod-like, period / pagination / sort) │
│  12. Provider Registry — Promise.allSettled + timeouts    │
│         ├─ Circuit breaker por provider (5 falhas/60s)    │
│         ├─ Cache TTL (30-300s por provider)               │
│         └─ Providers: cockpit · crm · pipeline · finance  │
│                       opportunities · campaigns · meta    │
│  13. record_abuse_event (falhas de auth/rate/HMAC)        │
│  14. writeAudit → integration_audit_log (17 colunas)      │
│  15. Envelope padronizado (success · errors[] · cache)    │
└───────────────────────────────────────────────────────────┘`;

export default function Overview() {
  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-semibold">Visão geral</h1>
          <Badge variant="secondary">v1.2 · Hardened</Badge>
          <Badge variant="outline">P0 → P5 aplicados</Badge>
        </div>
        <p className="mt-2 text-muted-foreground">
          A Integration Layer é a única forma oficial de outros produtos da Wiize (a começar pelo Wian) consumirem
          contexto da plataforma. Nenhum produto externo acessa banco, tabelas ou lógica de negócio diretamente.
        </p>
      </header>

      <Card>
        <CardHeader><CardTitle>Princípios</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p><strong className="text-foreground">Source of truth.</strong> Toda regra e todo cálculo permanece na Wiize. Consumidores interpretam, nunca calculam.</p>
          <p><strong className="text-foreground">Zero acoplamento.</strong> Consumidores não conhecem tabelas, colunas, IDs internos ou schemas.</p>
          <p><strong className="text-foreground">Multi-tenant estrito.</strong> <code>company_id</code> sempre derivado do JWT — nunca do body.</p>
          <p><strong className="text-foreground">Defense in depth.</strong> 15 camadas independentes por request: ban → rate-limit IP → client → HMAC → scope → idempotência → JWT → provider isolation → circuit breaker → audit.</p>
          <p><strong className="text-foreground">Auditoria total.</strong> Toda requisição registra 17 campos em <code>integration_audit_log</code> (inclui <code>correlation_id</code>, <code>signature_verified</code>, <code>rate_limited</code>, <code>ban_applied</code>).</p>
          <p><strong className="text-foreground">Contrato padronizado.</strong> Toda resposta segue o mesmo envelope, sucesso ou erro.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Arquitetura de uma requisição</CardTitle></CardHeader>
        <CardContent>
          <CodeBlock lang="bash" code={PIPELINE} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Persistência de segurança (Supabase)</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <p>• <code>integration_audit_log</code> — histórico completo (RLS admin-only, GRANT revogado de anon/authenticated)</p>
          <p>• <code>integration_clients</code> — registro de apps consumidores + scopes</p>
          <p>• <code>integration_ip_bans</code> — bans temporários por IP/client</p>
          <p>• <code>integration_abuse_events</code> — trilha de tentativas suspeitas</p>
          <p>• <code>integration_request_nonces</code> — anti-replay HMAC cross-instance</p>
          <p>• <code>integration_idempotency</code> — respostas cacheadas (60s) para replays legítimos</p>
          <p>• <code>integration_provider_health</code> — telemetria por provider (breaker persistente)</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Fora do escopo desta fase</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <p>• Cache Redis distribuído (arquitetura preparada, MVP com cache in-memory por instância)</p>
          <p>• Eventos em tempo real via webhook Wiize → Wian</p>
          <p>• OAuth 2.0 formal (auth atual: client credentials + JWT do usuário + HMAC opcional)</p>
          <p>• Auto-ban por threshold (hoje bans são criados manualmente via <code>INSERT</code>)</p>
        </CardContent>
      </Card>
    </div>
  );
}
