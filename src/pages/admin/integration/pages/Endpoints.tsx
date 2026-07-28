import { ENDPOINT_DOCS } from "../registry/endpoints";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CodeBlock } from "../components/CodeBlock";

export default function Endpoints() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Endpoints</h1>
        <p className="mt-1 text-muted-foreground">Todos os endpoints são versionados. Cada rota expõe seu próprio rate limit e headers obrigatórios.</p>
      </header>
      {ENDPOINT_DOCS.map((e) => (
        <Card key={e.path}>
          <CardHeader>
            <div className="flex items-center gap-2 flex-wrap">
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
              <CodeBlock lang="json" code={e.request_example} />
            </div>
            <div>
              <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Response</div>
              <CodeBlock lang="json" code={e.response_example} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

