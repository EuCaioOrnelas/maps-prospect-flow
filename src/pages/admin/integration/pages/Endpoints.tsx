import { ENDPOINT_DOCS } from "../registry/endpoints";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Endpoints() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Endpoints</h1>
        <p className="mt-1 text-muted-foreground">Todos os endpoints são versionados. Nesta fase existe apenas o Context Builder.</p>
      </header>
      {ENDPOINT_DOCS.map((e) => (
        <Card key={e.path}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Badge>{e.method}</Badge>
              <code className="text-sm">{e.path}</code>
              <Badge variant="outline">{e.version}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-muted-foreground">{e.description}</p>
            <div>
              <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Rate limit</div>
              <p className="text-muted-foreground">{e.rate_limit}</p>
            </div>
            <div>
              <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Headers obrigatórios</div>
              <ul className="ml-4 list-disc space-y-1 text-muted-foreground">
                {e.required_headers.map((h) => <li key={h}><code className="text-xs">{h}</code></li>)}
              </ul>
            </div>
            <div>
              <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Request</div>
              <pre className="rounded-md bg-muted p-3 text-xs overflow-x-auto">{e.request_example}</pre>
            </div>
            <div>
              <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Response</div>
              <pre className="rounded-md bg-muted p-3 text-xs overflow-x-auto">{e.response_example}</pre>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
