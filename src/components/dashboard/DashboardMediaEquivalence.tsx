import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info, BadgeCheck } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface DashboardMediaEquivalenceProps {
  leadsProspected: number;
  cplBenchmark: number;
  periodLabel: string;
}

export function DashboardMediaEquivalence({ leadsProspected, cplBenchmark, periodLabel }: DashboardMediaEquivalenceProps) {
  const estimatedInvestment = leadsProspected * cplBenchmark;

  return (
    <Card className="glass border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-transparent to-primary/5 h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <BadgeCheck size={18} className="text-emerald-400" />
          </div>
          <div className="flex items-center gap-1.5">
            <CardTitle className="text-sm font-semibold">Economia com a Wiize</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info size={13} className="text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="text-xs">
                    Estimativa baseada em benchmark médio de CPL para campanhas B2B de topo de funil.
                    Valores podem variar conforme mercado e estratégia.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center py-6 space-y-3">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Você economizou</p>
        <p className="text-4xl font-extrabold text-emerald-400">
          R$ {estimatedInvestment.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        <p className="text-sm text-muted-foreground text-center leading-relaxed">
          em mídia paga ao prospectar{' '}
          <span className="font-semibold text-foreground">{leadsProspected.toLocaleString('pt-BR')} leads</span>{' '}
          diretamente pela Wiize
        </p>
        <p className="text-[10px] text-muted-foreground/50 text-center pt-2 max-w-[220px]">
          Estimativa baseada em benchmark médio de CPL para campanhas B2B de topo de funil.
        </p>
      </CardContent>
    </Card>
  );
}
