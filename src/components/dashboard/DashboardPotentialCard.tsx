import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Zap } from "lucide-react";

interface DashboardPotentialCardProps {
  searchesUsed: number;
  searchesLimit: number;
}

function fmtInt(n: number) {
  return n.toLocaleString('pt-BR');
}

export function DashboardPotentialCard({ searchesUsed, searchesLimit }: DashboardPotentialCardProps) {
  const capacityUsed = searchesLimit > 0 ? (searchesUsed / searchesLimit) * 100 : 0;
  const remainingCapacity = Math.max(searchesLimit - searchesUsed, 0);

  return (
    <Card className="border-border/50">
      <CardContent className="py-5 px-5 space-y-3">
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-primary" />
          <p className="text-sm font-semibold text-foreground">Potencial Disponível</p>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          Você usou <span className="font-semibold text-foreground">{capacityUsed.toFixed(0)}%</span> da sua capacidade de prospecção este mês.
        </p>

        <Progress value={capacityUsed} className="h-2" />

        {remainingCapacity > 0 && (
          <p className="text-xs text-primary font-medium">
            Você ainda pode gerar +{fmtInt(remainingCapacity)} novas prospecções com seu plano atual.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
