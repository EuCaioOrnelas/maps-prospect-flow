import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Rocket } from "lucide-react";

interface DashboardPotentialCardProps {
  searchesUsed: number;
  searchesLimit: number;
  leadsProspected: number;
}

function fmtInt(n: number) {
  return n.toLocaleString('pt-BR');
}

export function DashboardPotentialCard({ searchesUsed, searchesLimit, leadsProspected }: DashboardPotentialCardProps) {
  const remaining = Math.max(searchesLimit - searchesUsed, 0);
  const capacityUsed = searchesLimit > 0 ? (searchesUsed / searchesLimit) * 100 : 0;
  const scaleMultiplier = searchesUsed > 0 ? Math.round(searchesLimit / searchesUsed) : searchesLimit;

  return (
    <Card className="border-border/50">
      <CardContent className="py-5 px-5 space-y-3">
        <div className="flex items-center gap-2">
          <Rocket size={16} className="text-primary" />
          <p className="text-sm font-semibold text-foreground">Potencial de Escala Disponível</p>
        </div>

        {remaining > 0 ? (
          <>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Seu plano permite gerar até{' '}
              <span className="font-semibold text-foreground">+{fmtInt(remaining)} novas prospecções</span>{' '}
              este mês.
            </p>
            {scaleMultiplier > 1 && (
              <p className="text-xs text-primary font-medium">
                Você pode escalar sua prospecção em até {scaleMultiplier}x com sua configuração atual.
              </p>
            )}
          </>
        ) : (
          <p className="text-xs text-muted-foreground leading-relaxed">
            Você atingiu o limite do seu plano este mês. Considere fazer upgrade para continuar crescendo.
          </p>
        )}

        <div className="space-y-1">
          <Progress value={capacityUsed} className="h-2" />
          <div className="flex justify-between">
            <span className="text-[10px] text-muted-foreground/50">
              {fmtInt(searchesUsed)} usadas
            </span>
            <span className="text-[10px] text-muted-foreground/50">
              {fmtInt(searchesLimit)} disponíveis
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
