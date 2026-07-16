import { PROVIDER_DOCS } from "../registry/providers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Providers() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Providers</h1>
        <p className="mt-1 text-muted-foreground">Cada Provider representa um domínio. Nunca acessam-se entre si — só o Context Builder os coordena.</p>
      </header>
      {PROVIDER_DOCS.map((p) => (
        <Card key={p.key}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{p.name}</CardTitle>
              <Badge variant="outline">{p.domain}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-muted-foreground">{p.description}</p>
            <div>
              <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Endpoint</div>
              <code className="text-xs">POST /api/v1/providers/{p.key}</code>
            </div>
            <div>
              <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Filtros aceitos</div>
              <div className="flex flex-wrap gap-1">{p.filters.map((f) => <Badge key={f} variant="outline">{f}</Badge>)}</div>
            </div>
            <div>
              <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">DTO retornado</div>
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                    <tr><th className="px-3 py-2 text-left">Campo</th><th className="px-3 py-2 text-left">Tipo</th><th className="px-3 py-2 text-left">Observação</th></tr>
                  </thead>
                  <tbody>
                    {p.dto_fields.map((f) => (
                      <tr key={f.field} className="border-t border-border">
                        <td className="px-3 py-2 font-mono">{f.field}</td>
                        <td className="px-3 py-2 text-muted-foreground">{f.type}</td>
                        <td className="px-3 py-2 text-muted-foreground">{f.note ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
