import { Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminIAPerformance() {
  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Performance IA</h1>
        <p className="text-sm text-muted-foreground mt-1">Métricas de performance dos modelos de IA</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/40 bg-card/80">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tempo Médio Resposta</p>
            <p className="text-2xl font-bold text-foreground mt-1">—</p>
            <p className="text-xs text-muted-foreground mt-1">Latência média das chamadas</p>
          </CardContent>
        </Card>
        <Card className="border-border/40 bg-card/80">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Taxa de Sucesso</p>
            <p className="text-2xl font-bold text-foreground mt-1">—</p>
            <p className="text-xs text-muted-foreground mt-1">Chamadas sem erro</p>
          </CardContent>
        </Card>
        <Card className="border-border/40 bg-card/80">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Chamadas 24h</p>
            <p className="text-2xl font-bold text-foreground mt-1">—</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/40 bg-card/80">
        <CardHeader>
          <CardTitle className="text-base">Logs de Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
            Logs de chamadas de IA serão exibidos aqui
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
