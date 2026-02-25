import { Shield, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { useRevenueMaturityIndex } from "@/hooks/useRevenueData";
import { cn } from "@/lib/utils";

const maturityLabel = (score: number) => {
  if (score >= 80) return { text: "Excelente", color: "text-primary" };
  if (score >= 60) return { text: "Bom", color: "text-yellow-400" };
  if (score >= 40) return { text: "Em Desenvolvimento", color: "text-orange-400" };
  return { text: "Inicial", color: "text-destructive" };
};

export const MaturityGauge = () => {
  const { data: maturity, isLoading } = useRevenueMaturityIndex();

  if (isLoading) return <Skeleton className="h-48 rounded-xl" />;
  if (!maturity) return null;

  const label = maturityLabel(maturity.total);

  const dimensions = [
    { name: "Responsividade", value: maturity.responsiveness, weight: "30%" },
    { name: "Aproveitamento HOT", value: maturity.hotUtilization, weight: "30%" },
    { name: "Consistência (7d)", value: maturity.consistency, weight: "20%" },
    { name: "Redução de Risco", value: maturity.riskReduction, weight: "20%" },
  ];

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-primary" />
          <CardTitle className="text-base font-semibold">Índice de Maturidade Comercial</CardTitle>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info size={14} className="text-muted-foreground/50 cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-[300px]">
              <p className="text-xs">
                Índice composto (0–100) que mede a saúde operacional: responsividade ao SLA (30%),
                aproveitamento de leads quentes (30%), consistência de atividade (20%) e redução de risco (20%).
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className={cn("text-4xl font-bold", label.color)}>{maturity.total}</p>
            <p className={cn("text-xs font-medium mt-0.5", label.color)}>{label.text}</p>
          </div>
          <div className="flex-1">
            <Progress value={maturity.total} className="h-3" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {dimensions.map((dim) => (
            <div key={dim.name} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{dim.name}</span>
                <span className="font-medium text-foreground">{dim.value}%</span>
              </div>
              <Progress value={dim.value} className="h-1.5" />
              <p className="text-[9px] text-muted-foreground/60">Peso: {dim.weight}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
