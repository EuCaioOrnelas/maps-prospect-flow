import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const ENTRIES = [
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
