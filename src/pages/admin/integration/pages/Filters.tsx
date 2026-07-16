import { FILTER_DOCS } from "../registry/filters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Filters() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Filtros</h1>
        <p className="mt-1 text-muted-foreground">Contrato único de filtros. Cada Provider aplica apenas o que faz sentido.</p>
      </header>
      <Card>
        <CardHeader><CardTitle>Referência</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Filtro</th>
                  <th className="px-3 py-2 text-left">Tipo</th>
                  <th className="px-3 py-2 text-left">Formato</th>
                  <th className="px-3 py-2 text-left">Exemplo</th>
                  <th className="px-3 py-2 text-left">Aplica em</th>
                </tr>
              </thead>
              <tbody>
                {FILTER_DOCS.map((f) => (
                  <tr key={f.name} className="border-t border-border">
                    <td className="px-3 py-2 font-mono">{f.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{f.type}</td>
                    <td className="px-3 py-2 text-muted-foreground">{f.format}</td>
                    <td className="px-3 py-2 font-mono text-xs">{f.example}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {f.applies_to.map((m) => <Badge key={m} variant="outline" className="text-[10px]">{m}</Badge>)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
