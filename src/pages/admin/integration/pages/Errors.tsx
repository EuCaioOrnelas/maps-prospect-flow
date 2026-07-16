import { ERROR_DOCS } from "../registry/errors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const badgeVariant = (s: number) => (s >= 500 ? "destructive" : s >= 400 ? "secondary" : "default");

export default function Errors() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Catálogo de erros</h1>
        <p className="mt-1 text-muted-foreground">Toda falha usa um dos códigos abaixo — nunca stack trace, nunca SQL.</p>
      </header>
      <Card>
        <CardHeader><CardTitle>Códigos</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Código</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Significado</th>
                  <th className="px-3 py-2 text-left">Ação recomendada</th>
                </tr>
              </thead>
              <tbody>
                {ERROR_DOCS.map((e) => (
                  <tr key={e.code} className="border-t border-border">
                    <td className="px-3 py-2 font-mono text-xs">{e.code}</td>
                    <td className="px-3 py-2"><Badge variant={badgeVariant(e.status) as any}>{e.status}</Badge></td>
                    <td className="px-3 py-2 text-muted-foreground">{e.meaning}</td>
                    <td className="px-3 py-2 text-muted-foreground">{e.action}</td>
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
