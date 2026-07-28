import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const ENTRIES = [
  {
    date: new Date().toISOString().slice(0, 10),
    version: "v1.2.0",
    tag: "security · persistence",
    items: [
      "Persistência DB de nonces, idempotência, bans e abuse events (antes só in-memory)",
      "Novas tabelas: integration_clients, integration_ip_bans, integration_abuse_events, integration_idempotency, integration_request_nonces, integration_provider_health",
      "integration_audit_log ganhou 8 colunas: correlation_id, cache_hit, signature_verified, rate_limited, ban_applied, blocked_reason, scopes_matched, circuit_state",
      "GRANT ALL revogado de anon/authenticated em integration_audit_log — leitura apenas admin",
      "RPCs check_integration_ban, record_abuse_event, consume_nonce, check_idempotency, store_idempotency",
      "Rate limit IP-level 300 req/min por endpoint",
      "Portal /admin/integration movido para trás de ProtectedRoute + requireAdmin",
      "Playground refatorado para usar integration-portal-proxy — nenhum secret trafega pelo browser",
    ],
  },
  {
    date: "2026-11-24",
    version: "v1.1.0",
    tag: "hardening (P1→P5)",
    items: [
      "P1 — Rotação dual-secret: aceita INTEGRATION_WIAN_CLIENT_SECRET e _PREVIOUS simultaneamente",
      "P2 — Assinatura HMAC-SHA256 opcional (INTEGRATION_REQUIRE_HMAC), timestamp ±300s, nonce único",
      "P3 — Timeouts (8s), Promise.allSettled por provider e circuit breaker (5 falhas / 60s / 30s aberto)",
      "P4 — Header x-idempotency-key (60s cache) e propagação de x-correlation-id / x-request-id",
      "P5 — Escopos por client (cockpit.read, crm.read, finance.read…) e enforcement de x-integration-api-version",
      "CORS estendido para novos headers, ERROR_CATALOG completo (códigos estáveis)",
      "Providers finance, opportunities, campaigns e meta adicionados ao Registry",
    ],
  },
  {
    date: "2026-07-16",
    version: "v1.0.0",
    tag: "release",
    items: [
      "Endpoint POST /api/v1/context (Context Builder)",
      "Providers: CRM (leads + pipeline), Meta Campaigns, KPIs / Forecast",
      "Autenticação em duas camadas (client credentials + JWT do usuário)",
      "Rate limit por client_id + user_id (60 req/min)",
      "Auditoria em integration_audit_log",
      "Portal admin /admin/integration com docs, playground e visualização de auditoria",
    ],
  },
];

export default function Changelog() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Changelog</h1>
        <p className="mt-1 text-muted-foreground">Toda mudança relevante da Integration Layer é registrada aqui.</p>
      </header>
      {ENTRIES.map((e) => (
        <Card key={e.version}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">{e.version}</CardTitle>
              <Badge variant="outline">{e.date}</Badge>
              <Badge variant="secondary">{e.tag}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="ml-4 list-disc space-y-1 text-sm text-muted-foreground">
              {e.items.map((i) => <li key={i}>{i}</li>)}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
