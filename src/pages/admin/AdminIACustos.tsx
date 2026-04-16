import { DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminIACustos() {
  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Custos IA</h1>
        <p className="text-sm text-muted-foreground mt-1">Acompanhamento de custos com OpenAI e modelos de IA</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/40 bg-card/80">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Custo Mensal Estimado</p>
            <p className="text-2xl font-bold text-foreground mt-1">—</p>
          </CardContent>
        </Card>
        <Card className="border-border/40 bg-card/80">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tokens Consumidos</p>
            <p className="text-2xl font-bold text-foreground mt-1">—</p>
          </CardContent>
        </Card>
        <Card className="border-border/40 bg-card/80">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Custo / Usuário</p>
            <p className="text-2xl font-bold text-foreground mt-1">—</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/40 bg-card/80">
        <CardHeader>
          <CardTitle className="text-base">Evolução de Custos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
            Gráfico de custos por período será exibido aqui
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
