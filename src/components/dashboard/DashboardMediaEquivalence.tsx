import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface DashboardMediaEquivalenceProps {
  leadsProspected: number;
  cplBenchmark: number;
  periodLabel: string;
}

export function DashboardMediaEquivalence({ leadsProspected, cplBenchmark, periodLabel }: DashboardMediaEquivalenceProps) {
  const estimatedInvestment = leadsProspected * cplBenchmark;

  return (
    <Card className="glass border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base font-semibold">
            Equivalência de Investimento em Mídia Paga
          </CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info size={14} className="text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-xs">
                  Estimativa baseada em benchmark médio de custo por lead (CPL) para campanhas B2B de topo de funil.
                  Valores podem variar conforme mercado, segmentação e estratégia.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col items-center justify-center py-4">
          <p className="text-sm text-muted-foreground mb-2">Investimento equivalente em mídia paga</p>
          <p className="text-4xl font-extrabold text-primary flex items-center gap-1">
            <DollarSign size={28} />
            {estimatedInvestment.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            para <span className="font-semibold text-foreground">{leadsProspected.toLocaleString('pt-BR')}</span> leads prospectados
          </p>
        </div>

        <p className="text-[11px] text-muted-foreground/60 leading-relaxed text-center">
          Estimativa baseada em benchmark médio de custo por lead (CPL) para campanhas B2B de topo de funil. 
          Valores podem variar conforme mercado, segmentação e estratégia.
        </p>
      </CardContent>
    </Card>
  );
}
