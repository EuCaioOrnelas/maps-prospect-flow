import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RateLimits() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Rate Limits & Limites operacionais</h1>
        <p className="mt-1 text-muted-foreground">Proteção multi-camada contra abuso e garantia de qualidade de serviço.</p>
      </header>

      <Card>
        <CardHeader><CardTitle>Rate limits ativos</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Camada</th>
                  <th className="px-3 py-2 text-left">Chave</th>
                  <th className="px-3 py-2 text-left">Janela</th>
                  <th className="px-3 py-2 text-left">Máx.</th>
                  <th className="px-3 py-2 text-left">Escopo</th>
                </tr>
              </thead>
              <tbody className="[&>tr]:border-t [&>tr]:border-border">
                <tr>
                  <td className="px-3 py-2">IP</td>
                  <td className="px-3 py-2 font-mono text-xs">ip + endpoint</td>
                  <td className="px-3 py-2">60 s</td>
                  <td className="px-3 py-2">300 req</td>
                  <td className="px-3 py-2">context + provider</td>
                </tr>
                <tr>
                  <td className="px-3 py-2">Usuário</td>
                  <td className="px-3 py-2 font-mono text-xs">client_id + user_id</td>
                  <td className="px-3 py-2">60 s</td>
                  <td className="px-3 py-2">60 req</td>
                  <td className="px-3 py-2"><code>/integration-v1-context</code></td>
                </tr>
                <tr>
                  <td className="px-3 py-2">Usuário</td>
                  <td className="px-3 py-2 font-mono text-xs">client_id + user_id</td>
                  <td className="px-3 py-2">60 s</td>
                  <td className="px-3 py-2">120 req</td>
                  <td className="px-3 py-2"><code>/integration-v1-provider</code></td>
                </tr>
                <tr>
                  <td className="px-3 py-2">Provider</td>
                  <td className="px-3 py-2 font-mono text-xs">provider + company_id</td>
                  <td className="px-3 py-2">60 s</td>
                  <td className="px-3 py-2">120 req</td>
                  <td className="px-3 py-2">por provider individual</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Ao exceder, response <code>429</code>, código <code>RATE_LIMIT_EXCEEDED</code>, header <code>Retry-After</code> (segundos) e body com <code>retry_after_seconds</code>. Falhas repetidas também alimentam <code>integration_abuse_events</code>.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Circuit breaker</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <p>• 5 falhas seguidas do mesmo provider em 60 s abrem o breaker.</p>
          <p>• Enquanto aberto (30 s), respostas do provider vêm como <code>PROVIDER_UNAVAILABLE</code> sem chamar backend — evita cascata.</p>
          <p>• Estado auditado em <code>integration_audit_log.circuit_state</code> e telemetria em <code>integration_provider_health</code>.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Idempotência & anti-replay</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <p>• <code>x-idempotency-key</code> cacheia resposta por <strong>60 s</strong> em <code>integration_idempotency</code>.</p>
          <p>• Nonce HMAC guardado em <code>integration_request_nonces</code> por <strong>10 min</strong> — replay cross-instance é rejeitado com <code>REPLAY_DETECTED</code>.</p>
          <p>• Skew máximo de timestamp HMAC: <strong>±300 s</strong>.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Limites operacionais</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <p>• Paginação padrão: <code>size=50</code> · Máximo: <code>size=200</code></p>
          <p>• Timeout por provider: <strong>8 s</strong> — providers rodam em <code>Promise.allSettled</code></p>
          <p>• Tempo alvo de resposta: &lt; 500 ms para até 3 módulos</p>
          <p>• Cache TTL por provider: 30-300 s (in-memory por instância; arquitetura preparada para Redis)</p>
        </CardContent>
      </Card>
    </div>
  );
}
