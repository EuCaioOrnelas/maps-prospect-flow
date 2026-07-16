import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RateLimits() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Rate Limits & Limites operacionais</h1>
        <p className="mt-1 text-muted-foreground">Proteção contra abuso e garantia de qualidade de serviço.</p>
      </header>
      <Card>
        <CardHeader><CardTitle>Limites atuais</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr><th className="px-3 py-2 text-left">Chave</th><th className="px-3 py-2 text-left">Janela</th><th className="px-3 py-2 text-left">Máx.</th><th className="px-3 py-2 text-left">Endpoint</th></tr>
              </thead>
              <tbody>
                <tr className="border-t border-border">
                  <td className="px-3 py-2 font-mono text-xs">client_id + user_id</td>
                  <td className="px-3 py-2">60s</td>
                  <td className="px-3 py-2">60 req</td>
                  <td className="px-3 py-2"><code>/api/v1/context</code></td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Ao exceder, o response tem status <code>429</code>, código <code>RATE_LIMIT_EXCEEDED</code> e header <code>Retry-After</code>.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Limites operacionais</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <p>• Paginação padrão: <code>size=50</code> · Máximo: <code>size=200</code></p>
          <p>• Tempo alvo de resposta: &lt; 500ms para até 3 módulos</p>
          <p>• Consultas independentes rodam em paralelo (<code>Promise.all</code>) no Context Builder</p>
          <p>• Cache: MVP sem cache persistente (arquitetura preparada para Redis futuramente)</p>
        </CardContent>
      </Card>
    </div>
  );
}
