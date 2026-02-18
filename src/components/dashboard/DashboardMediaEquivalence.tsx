import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info, PiggyBank, TrendingUp } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface DashboardMediaEquivalenceProps {
  leadsProspected: number;
  cplBenchmark: number;
  periodLabel: string;
}

export function DashboardMediaEquivalence({ leadsProspected, cplBenchmark, periodLabel }: DashboardMediaEquivalenceProps) {
  const realisticCPL = 46.17;

  const estimatedInvestment = leadsProspected * realisticCPL;

  return (
    <Card className="glass border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-transparent to-primary/5 h-full">
      <CardHeader className="pb-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <PiggyBank size={18} className="text-emerald-400" />
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
                    Cálculo baseado no CPL médio de R$ {realisticCPL.toFixed(2).replace('.', ',')} para campanhas B2B
                    de topo de funil em mídia paga (Google Ads, Meta Ads). Valores reais podem variar.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center py-5 space-y-2">
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">
          {periodLabel}
        </p>

        <div className="flex items-baseline gap-1">
          <span className="text-xs text-emerald-400 font-medium">R$</span>
          <span className="text-4xl font-extrabold text-emerald-400">
            {estimatedInvestment.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        <p className="text-sm font-semibold text-foreground text-center">
          economizados em mídia paga
        </p>

        <div className="w-full mt-2 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
          <div className="flex items-center gap-2">
            <TrendingUp size={14} className="text-emerald-400 flex-shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Seus <span className="font-bold text-foreground">{leadsProspected.toLocaleString('pt-BR')} leads</span> custariam{' '}
              <span className="font-bold text-emerald-400">R$ {realisticCPL.toFixed(2).replace('.', ',')}/lead</span>{' '}
              em Google Ads ou Meta Ads.
            </p>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Com a Wiize, você prospecta direto — <span className="font-semibold text-foreground">sem gastar com anúncios</span>.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
