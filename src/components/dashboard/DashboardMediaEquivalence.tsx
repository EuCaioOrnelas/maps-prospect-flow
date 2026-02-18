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
    <Card className="glass border-primary/20">
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
      <CardContent className="space-y-5">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-xl bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Leads no período</p>
            <p className="text-xl font-bold text-foreground">{leadsProspected.toLocaleString('pt-BR')}</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">CPL benchmark</p>
            <p className="text-xl font-bold text-foreground">
              R$ {cplBenchmark.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="text-center p-3 rounded-xl bg-primary/10 border border-primary/20">
            <p className="text-xs text-muted-foreground mb-1">Investimento equivalente</p>
            <p className="text-xl font-bold text-primary flex items-center justify-center gap-1">
              <DollarSign size={16} />
              {estimatedInvestment.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
          Estimativa baseada em benchmark médio de custo por lead (CPL) para campanhas B2B de topo de funil. 
          Valores podem variar conforme mercado, segmentação e estratégia.
        </p>
      </CardContent>
    </Card>
  );
}
