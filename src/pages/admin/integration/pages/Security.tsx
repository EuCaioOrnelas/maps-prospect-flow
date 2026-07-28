import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, KeyRound, Fingerprint, Ban, Timer, Layers, Eye, Globe2, Activity } from "lucide-react";

function Layer({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground space-y-2">{children}</CardContent>
    </Card>
  );
}

export default function Security() {
  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-semibold">Segurança</h1>
          <Badge variant="secondary">Defense in depth · 9 camadas</Badge>
        </div>
        <p className="mt-2 text-muted-foreground">
          Cada request passa por 9 controles independentes. Se qualquer camada bloquear, a chamada é rejeitada
          antes de tocar dados. Toda decisão é registrada em <code>integration_audit_log</code>.
        </p>
      </header>

      <Layer icon={KeyRound} title="1. Client credentials + rotação dual-secret">
        <p>Header <code>x-integration-client-id</code> + <code>x-integration-client-secret</code>, comparação constant-time.</p>
        <p>Rotação sem downtime: <code>INTEGRATION_WIAN_CLIENT_SECRET</code> (novo) e <code>_PREVIOUS</code> (antigo) aceitos simultaneamente. Trocar o secret é trocar o env var, sem redeploy do consumidor.</p>
      </Layer>

      <Layer icon={Fingerprint} title="2. Assinatura HMAC-SHA256 (opcional, produção)">
        <p>Quando <code>INTEGRATION_REQUIRE_HMAC=true</code>, todo request deve enviar <code>x-integration-timestamp</code>, <code>x-integration-nonce</code> e <code>x-integration-signature</code>. Payload assinado: <code>timestamp.nonce.body</code>.</p>
        <p>• Skew máximo de <strong>±300 s</strong>. • Nonce persistido em <code>integration_request_nonces</code> — replay <em>cross-instance</em> bloqueado. • Comparação com <code>timingSafeEqual</code>.</p>
      </Layer>

      <Layer icon={Ban} title="3. IP bans + circuit breaker por client">
        <p>Bans temporários gravados em <code>integration_ip_bans</code> — checados por RPC <code>check_integration_ban(ip, client_id)</code> antes de qualquer trabalho.</p>
        <p>Toda falha de auth, HMAC ou rate-limit chama <code>record_abuse_event</code> — a trilha vive em <code>integration_abuse_events</code> para revisão.</p>
      </Layer>

      <Layer icon={Timer} title="4. Rate-limiting em três camadas">
        <p>• <strong>IP</strong>: 300 req/min por endpoint (defesa contra scan/scrape).</p>
        <p>• <strong>Usuário Wiize</strong>: 60/min no context, 120/min no provider — reusa <code>check_rate_limit()</code>.</p>
        <p>• <strong>Provider</strong>: cada provider tem seu breaker próprio — 5 falhas em 60 s abrem o breaker por 30 s, respondendo <code>PROVIDER_UNAVAILABLE</code>.</p>
      </Layer>

      <Layer icon={Layers} title="5. Escopos por consumidor">
        <p>Cada client_id declara scopes (ex.: <code>cockpit.read</code>, <code>crm.read</code>, <code>finance.read</code>). Providers exigem scope específico; scope ausente devolve <code>SCOPE_MISSING</code> por provider, sem derrubar a request inteira.</p>
      </Layer>

      <Layer icon={ShieldCheck} title="6. JWT do usuário + isolamento multi-tenant">
        <p>JWT valida a identidade final. <code>user_id</code> e <code>company_id</code> vêm SEMPRE do token, nunca do body. Sub-usuários resolvem <code>company_id</code> via <code>account_members</code>. É impossível uma empresa acessar dados de outra pela API.</p>
      </Layer>

      <Layer icon={Activity} title="7. Idempotência + correlação">
        <p>Header <code>x-idempotency-key</code> guarda a resposta por 60 s em <code>integration_idempotency</code> — replays legítimos não reprocessam.</p>
        <p>Headers <code>x-correlation-id</code> (jornada completa) e <code>x-request-id</code> (call individual) são copiados para o log — auditoria filtra por qualquer um.</p>
      </Layer>

      <Layer icon={Eye} title="8. Superfície mínima de exposição">
        <p>DTOs jamais retornam token Meta, <code>phone_number_id</code>, <code>waba_id</code>, secrets ou colunas administrativas. Erros não expõem SQL, stack trace ou nome de tabela. Catálogo fechado em <code>ERROR_CATALOG</code>.</p>
      </Layer>

      <Layer icon={Globe2} title="9. Comunicação + auditoria imutável">
        <p>Somente HTTPS (edge Supabase). CORS restrito a headers conhecidos. Endpoint privado, backend-to-backend.</p>
        <p><code>integration_audit_log</code> tem RLS <em>admin-only</em>. <code>GRANT ALL</code> para <code>anon</code> e <code>authenticated</code> foi <strong>revogado</strong>. Escrita só via service role.</p>
      </Layer>
    </div>
  );
}
